/**
 * PrES/PAP workflow machine — dedicated machine for WF5 (PrES_PAP)
 *
 * Foundation/placeholder note: this is a deliberate structural clone of
 * client/engine/workflowMachine.ts (the parallel machine WF1/WF2 share,
 * registry id "enrollment"), the same way client/workflows/iAssist.ts cloned
 * it for WF4. Cloning into its own file/registry id gives WF5 a dedicated
 * machine instance, fully isolated from WF1-4 — future changes here can
 * never affect the other flows, and vice versa — while still sharing the
 * same central WorkflowData shape (client/engine/types.ts) and the same
 * patient identity store (client/store/patientStore.ts) every other flow
 * reads from.
 *
 * States/events/guards mirror WF2's (Fax_PAP_Audit) PAP-audit shape today —
 * per the WF5 kickoff request, WF5 "follows a similar flow to WF2" but
 * differs in how information is captured (a provider e-signature intake
 * instead of WF2's fax referral). That real capture mechanism/screens
 * haven't been designed yet, so for now this machine reuses WF2's exact
 * event names/fields so the flow works end-to-end out of the box; expect
 * the enrollment-side events here to be replaced once the actual PrES
 * capture design lands. Only `id` and the initial `flowType` differ from
 * workflowMachine.ts otherwise.
 */

import { createMachine, assign } from 'xstate';
import type { MachineContext, DemoEvent, WorkflowData } from '@/engine/types';

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: 'PrES_PAP',
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
  papSmsSent: false,
  papSmsVerified: false,
  papOtpVerified: false,
  incomeStatus: "none",
  selectedPharmacy: null,
  providerPACompleted: false,
  paSubmittedAt: null,
  paApprovedAt: null,
  pricingOption: null,
  paApprovedSmsVerified: false,
  paApprovedOtpVerified: false,
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

export const presPapMachine = createMachine(
  {
    id: 'presPapWorkflow',
    type: 'parallel',
    context: initialContext,
    on: {
      UNDO: {
        actions: 'restoreLastSnapshot',
      },
      // Dedicated machine — INITIAL_WORKFLOW_DATA.flowType is always
      // 'PrES_PAP' for this machine, so (unlike workflowMachine.ts, which is
      // shared by WF1/WF2 and has to preserve the actor's corrected
      // flowType across reset) a full reset to INITIAL_WORKFLOW_DATA is
      // always correct here. No SET_FLOW_TYPE correction event is needed
      // either, for the same reason (see actorSingleton.ts's
      // machineIdForFlow/createActorForFlow — SET_FLOW_TYPE is only ever
      // sent to the shared "enrollment" machine).
      RESET: {
        target: '#presPapWorkflow',
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
      // Placeholder PAP-audit beat, reused from WF2 as-is (see file header) —
      // BI comes back no_insurance, an "application update" is staged, then
      // the patient's eIncome check result flips PAP to "active" and opens
      // dispatch the same way PA approval does for other flows.
      SEND_PAP_SMS: {
        actions: 'updatePapSmsSent',
      },
      VERIFY_PAP_SMS: {
        actions: 'updatePapSmsVerified',
      },
      VERIFY_PAP_OTP: {
        actions: 'updatePapOtpVerified',
      },
      VERIFY_INCOME: {
        actions: 'updateIncomeVerified',
      },
      // Mirrors CoA_DTP/iAssist/WF2's own PATIENT_SETS_ADDRESS/
      // PATIENT_SELECTS_SHIP_DATE beat — same patient screens
      // (DeliveryAddress.tsx/DeliveryDate.tsx), same event names.
      PATIENT_SETS_ADDRESS: {
        actions: 'updatePapPatientSetsAddress',
      },
      PATIENT_SELECTS_SHIP_DATE: {
        actions: 'updatePapPatientSelectsShipDate',
      },
      START_INCOME_QUALIFICATION: {
        actions: 'updateIncomeQualificationStarted',
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
      updateEnrollmentPending: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          enrollmentStatus: 'enrolled',
          enrollmentInviteSent: true,
        },
        events: [...context.events, createEvent(context, 'ENROLL', 'crm', 1)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateEnrollmentInvited: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          enrollmentStatus: 'enrolled',
          enrollmentInviteSent: true,
        },
        events: [...context.events, createEvent(context, 'INVITE', 'crm', 2)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateSMSVerified: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          smsVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_SMS', 'patient', 3)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateOTPVerified: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          otpVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_OTP', 'patient', 4)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateConsentConfirmed: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          consentStatus: 'confirmed',
          enrollmentStatus: 'enrolled',
          enrollmentAcknowledged: true,
        },
        events: [...context.events, createEvent(context, 'CONFIRM_CONSENT', 'patient', 5)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateBISubmitted: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          biStatus: 'running',
        },
        events: [...context.events, createEvent(context, 'RUN_BI', 'analytics', 6)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateBIComplete: assign(({ context, event }: any) => ({
        workflowData: {
          ...context.workflowData,
          biStatus: 'complete',
          biResult: event.result ?? 'coverage_found',
        },
        events: [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePASubmitted: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paStatus: 'submitted',
          paSubmittedAt: new Date().toISOString(),
        },
        events: [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePAApproved: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paStatus: 'approved',
          paApprovedAt: new Date().toISOString(),
          dispatchStatus: 'pending_selection',
        },
        events: [...context.events, createEvent(context, 'APPROVE_PA', 'provider', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyReady: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'ready',
        },
        events: [...context.events, createEvent(context, 'READY_RX', 'field', 10)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyProcessing: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'processing',
          dispatchStatus: 'dispatched',
        },
        events: [...context.events, createEvent(context, 'FILL_RX', 'field', 10)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateSelectPharmacy: assign(({ context, event }: any) => ({
        workflowData: {
          ...context.workflowData,
          selectedPharmacy: event.pharmacy ?? null,
          dispatchStatus: 'selected',
        },
        events: [...context.events, createEvent(context, 'SELECT_PHARMACY', 'crm', 5)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateDenyPA: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paStatus: 'denied',
        },
        events: [...context.events, createEvent(context, 'DENY_PA', 'provider', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyShipped: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'shipped',
        },
        events: [...context.events, createEvent(context, 'SHIP_RX', 'field', 11)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePharmacyDelivered: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pharmacyStatus: 'delivered',
        },
        events: [...context.events, createEvent(context, 'DELIVER_RX', 'field', 12)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateCompleteProviderPA: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          providerPACompleted: true,
        },
        events: [...context.events, createEvent(context, 'COMPLETE_PROVIDER_PA', 'provider', 13)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePapSmsSent: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          papSmsSent: true,
        },
        events: [...context.events, createEvent(context, 'SEND_PAP_SMS', 'crm', 7)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePapSmsVerified: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          papSmsVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_PAP_SMS', 'patient', 7)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePapOtpVerified: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          papOtpVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_PAP_OTP', 'patient', 7)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateIncomeVerified: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          incomeStatus: 'verified',
          papStatus: 'active',
          dispatchStatus:
            context.workflowData.dispatchStatus === 'none'
              ? 'pending_selection'
              : context.workflowData.dispatchStatus,
        },
        events: [...context.events, createEvent(context, 'VERIFY_INCOME', 'patient', 8)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePapPatientSetsAddress: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          dispatchStatus: 'selected',
        },
        events: [...context.events, createEvent(context, 'PATIENT_SETS_ADDRESS', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePapPatientSelectsShipDate: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          patientShipDate: new Date().toISOString(),
        },
        events: [...context.events, createEvent(context, 'PATIENT_SELECTS_SHIP_DATE', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateIncomeQualificationStarted: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          incomeStatus: 'pending',
        },
        events: [...context.events, createEvent(context, 'START_INCOME_QUALIFICATION', 'patient', 8)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      restoreLastSnapshot: assign(({ context }) => {
        if (context._snapshots.length === 0) return context;
        const lastSnapshot = context._snapshots[context._snapshots.length - 1];
        const remainingSnapshots = context._snapshots.slice(0, -1);
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
      // WF5 never sets paStatus, same as WF2 — see updateIncomeVerified.
      canFillRX: ({ context }) =>
        context.workflowData.paStatus === 'approved' ||
        context.workflowData.papStatus === 'active',
    },
  }
);
