import { createMachine, assign } from 'xstate';
import type { MachineContext, DemoEvent, WorkflowData } from './types';
import { logWorkflowStateChange, logWorkflowEvent, logWorkflowInit } from './workflowLogger';

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: 'Fax_QS_PA_Approved',
  enrollmentStatus: "none",
  smsVerified: false,
  otpVerified: false,
  enrollmentInviteSent: false,
  enrollmentAcknowledged: false,
  welcomeDismissed: false,
  consentStatus: "pending",
  paStatus: "none",
  biStatus: "none",
  biResult: null,
  pharmacyStatus: "none",
  dispatchStatus: "none",
  qsStatus: "none",
  papStatus: "none",
  selectedPharmacy: null,
  providerPACompleted: false,
  paSubmittedAt: null,
  paApprovedAt: null,
  cashOfferStatus: "none",
  paymentVerified: false,
  patientShipDate: null,
};

const initialContext: MachineContext = {
  workflowData: INITIAL_WORKFLOW_DATA,
  events: [],
  _snapshots: [],
};

const createEvent = (
  context: MachineContext,
  eventType: string,
  portal: 'crm' | 'patient' | 'provider' | 'analytics' | 'field',
  workflowStep: number
): DemoEvent => ({
  id: crypto.randomUUID(),
  eventType,
  portal,
  flowType: context.workflowData.flowType,
  workflowStep,
  metadata: null,
  createdAt: new Date().toISOString(),
});

const pushSnapshot = (snapshots: MachineContext[], context: MachineContext) => {
  const updated = [...snapshots, context];
  return updated.length > 20 ? updated.slice(-20) : updated;
};

// Helper to wrap assign actions with logging
const assignWithLogging = (
  eventName: string,
  assignFn: (input: any) => any
) => {
  return assign(({ context, event }: any) => {
    const newContext = assignFn({ context, event });
    const flowType = context.workflowData.flowType;

    logWorkflowStateChange(
      eventName,
      context.workflowData,
      newContext.workflowData,
      flowType
    );

    return newContext;
  });
};

export const workflowMachine = createMachine(
  {
    id: 'arxWorkflow',
    type: 'parallel',
    context: initialContext,
    on: {
      UNDO: {
        actions: 'restoreLastSnapshot',
      },
      RESET: {
        target: '#arxWorkflow',
        actions: assign(() => ({
          workflowData: { ...INITIAL_WORKFLOW_DATA },
          events: [],
          _snapshots: [],
        })),
      },
      COMPLETE_PROVIDER_PA: {
        actions: 'updateCompleteProviderPA',
      },
      DISMISS_WELCOME: {
        actions: assign(({ context }) => ({
          workflowData: {
            ...context.workflowData,
            welcomeDismissed: true,
          },
          events: [...context.events, createEvent(context, 'DISMISS_WELCOME', 'patient', 2)],
          _snapshots: pushSnapshot(context._snapshots, context),
        })),
      },
      SELECT_PHARMACY: {
        actions: 'updateSelectPharmacy',
      },
      DENY_PA: {
        actions: 'updateDenyPA',
      },
      READY_RX: {
        actions: 'updatePharmacyReady',
      },
      SHIP_RX: {
        actions: 'updatePharmacyShipped',
      },
      DELIVER_RX: {
        actions: 'updatePharmacyDelivered',
      },
    },
    states: {
      enrollment: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              ENROLL: {
                target: 'pending',
                actions: 'updateEnrollmentPending',
              },
            },
          },
          pending: {
            on: {
              INVITE: {
                target: 'invited',
                actions: 'updateEnrollmentInvited',
              },
            },
          },
          invited: {
            on: {
              VERIFY_SMS: {
                target: 'sms_verified',
                actions: 'updateSMSVerified',
              },
            },
          },
          sms_verified: {
            on: {
              VERIFY_OTP: {
                target: 'otp_verified',
                actions: 'updateOTPVerified',
              },
            },
          },
          otp_verified: {
            on: {
              CONFIRM_CONSENT: {
                target: 'consented',
                actions: 'updateConsentConfirmed',
              },
            },
          },
          consented: {
          },
        },
      },
      benefitsInquiry: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              RUN_BI: {
                target: 'submitted',
                guard: 'canRunBI',
                actions: 'updateBISubmitted',
              },
            },
          },
          submitted: {
            on: {
              COMPLETE_BI: {
                target: 'complete',
                actions: 'updateBIComplete',
              },
            },
          },
          complete: {
          },
        },
      },
      priorAuth: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              SUBMIT_PA: {
                target: 'submitted',
                guard: 'canSubmitPA',
                actions: 'updatePASubmitted',
              },
            },
          },
          submitted: {
            on: {
              APPROVE_PA: {
                target: 'approved',
                actions: 'updatePAApproved',
              },
              DENY_PA: {
                target: 'denied',
                actions: 'updateDenyPA',
              },
            },
          },
          approved: {
          },
          denied: {
          },
        },
      },
      order: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              FILL_RX: {
                target: 'processing',
                guard: 'canFillRX',
                actions: 'updatePharmacyProcessing',
              },
            },
          },
          processing: {
            on: {
              SHIP_RX: {
                target: 'shipped',
                actions: 'updatePharmacyShipped',
              },
            },
          },
          shipped: {
            on: {
              DELIVER_RX: {
                target: 'delivered',
                actions: 'updatePharmacyDelivered',
              },
            },
          },
          delivered: {
          },
        },
      },
    },
  },
  {
    actions: {
      updateEnrollmentPending: assignWithLogging('ENROLL', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          enrollmentStatus: 'enrolled',
          enrollmentInviteSent: true,
        },
        events: [...context.events, createEvent(context, 'ENROLL', 'crm', 1)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateEnrollmentInvited: assignWithLogging('INVITE', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          enrollmentStatus: 'enrolled',
          enrollmentInviteSent: true,
        },
        events: [...context.events, createEvent(context, 'INVITE', 'crm', 2)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateSMSVerified: assignWithLogging('VERIFY_SMS', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          smsVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_SMS', 'patient', 3)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateOTPVerified: assignWithLogging('VERIFY_OTP', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          otpVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_OTP', 'patient', 4)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateConsentConfirmed: assignWithLogging('CONFIRM_CONSENT', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          consentStatus: 'confirmed',
          enrollmentStatus: 'enrolled',
          enrollmentAcknowledged: true,
        },
        events: [...context.events, createEvent(context, 'CONFIRM_CONSENT', 'patient', 5)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateBISubmitted: assignWithLogging('RUN_BI', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          biStatus: 'running',
        },
        events: [...context.events, createEvent(context, 'RUN_BI', 'analytics', 6)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateBIComplete: assignWithLogging('COMPLETE_BI', ({ context, event }: any) => ({
        workflowData: {
          ...context.workflowData,
          biStatus: 'complete',
          biResult: event.result ?? 'coverage_found',
        },
        events: [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePASubmitted: assignWithLogging('SUBMIT_PA', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paStatus: 'submitted',
          paSubmittedAt: new Date().toISOString(),
        },
        events: [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePAApproved: assignWithLogging('APPROVE_PA', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paStatus: 'approved',
          paApprovedAt: new Date().toISOString(),
          dispatchStatus: 'pending_selection',
        },
        events: [...context.events, createEvent(context, 'APPROVE_PA', 'provider', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyReady: assignWithLogging('READY_RX', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'ready',
        },
        events: [...context.events, createEvent(context, 'READY_RX', 'field', 10)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyProcessing: assignWithLogging('FILL_RX', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'processing',
          dispatchStatus: 'dispatched',
        },
        events: [...context.events, createEvent(context, 'FILL_RX', 'field', 10)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateSelectPharmacy: assignWithLogging('SELECT_PHARMACY', ({ context, event }: any) => ({
        workflowData: {
          ...context.workflowData,
          selectedPharmacy: event.pharmacy ?? null,
          dispatchStatus: 'selected',
        },
        events: [...context.events, createEvent(context, 'SELECT_PHARMACY', 'crm', 5)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateDenyPA: assignWithLogging('DENY_PA', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paStatus: 'denied',
        },
        events: [...context.events, createEvent(context, 'DENY_PA', 'provider', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyShipped: assignWithLogging('SHIP_RX', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'shipped',
        },
        events: [...context.events, createEvent(context, 'SHIP_RX', 'field', 11)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyDelivered: assignWithLogging('DELIVER_RX', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'delivered',
        },
        events: [...context.events, createEvent(context, 'DELIVER_RX', 'field', 12)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateCompleteProviderPA: assignWithLogging('COMPLETE_PROVIDER_PA', ({ context }) => ({
        workflowData: {
          ...context.workflowData,
          providerPACompleted: true,
        },
        events: [...context.events, createEvent(context, 'COMPLETE_PROVIDER_PA', 'provider', 13)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      restoreLastSnapshot: assign(({ context }) => {
        const beforeData = context.workflowData;
        if (context._snapshots.length === 0) {
          console.log('%c[WF] UNDO (no snapshots available)', 'color: #ff6b6b; font-weight: bold');
          return context;
        }
        const lastSnapshot = context._snapshots[context._snapshots.length - 1];
        const remainingSnapshots = context._snapshots.slice(0, -1);
        logWorkflowStateChange(
          'UNDO',
          beforeData,
          lastSnapshot.workflowData,
          context.workflowData.flowType
        );
        return {
          ...lastSnapshot,
          _snapshots: remainingSnapshots,
        };
      }),
      resetContext: () => initialContext,
    },
    guards: {
      canRunBI: ({ context }) => context.workflowData.consentStatus === 'confirmed',
      canSubmitPA: ({ context }) => context.workflowData.biStatus === 'complete',
      canFillRX: ({ context }) => context.workflowData.paStatus === 'approved',
    },
  }
);
