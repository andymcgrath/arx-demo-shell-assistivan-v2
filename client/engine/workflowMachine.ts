import { createMachine, assign } from 'xstate';
import type { MachineContext, DemoEvent, WorkflowData } from './types';

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
        // Keep the actor's own current flowType — INITIAL_WORKFLOW_DATA's
        // flowType is just a static fallback for the (shared, flow-agnostic)
        // "enrollment" machine, not a real default. Spreading it wholesale
        // here would silently flip a PAP session back to WF1 on Reset.
        actions: assign(({ context }) => ({
          workflowData: { ...INITIAL_WORKFLOW_DATA, flowType: context.workflowData.flowType },
          events: [],
          _snapshots: [],
        })),
      },
      // Corrective, internal-only action — see actorSingleton.ts's
      // createActorForFlow. The "enrollment" machine (shared by WF1/WF2) has
      // no way to know which of the two it's actually running as, since its
      // static INITIAL_WORKFLOW_DATA.flowType is hardcoded to
      // 'Fax_QS_PA_Approved'. actorSingleton sends this right after creating
      // (or restoring) the actor so workflowData.flowType actually matches
      // the flow the user selected, instead of every isPapFlow-style check
      // silently reading WF1 defaults. Deliberately doesn't touch
      // events/_snapshots — this isn't a demo action, just a correction.
      SET_FLOW_TYPE: {
        actions: assign(({ context, event }: any) => ({
          ...context,
          workflowData: {
            ...context.workflowData,
            flowType: event.flowType,
          },
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
      // Fax_PAP_Audit (WF2/PAP) only — BI comes back no_insurance, the
      // Fulfillment Center stages an "application update" SMS (mirrors the
      // initial enrollment SMS→OTP beat: tap link -> enter code), then the
      // patient's eIncome check result flips PAP to "active" and opens
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
      // Fax_PAP_Audit (WF2/PAP) only — mirrors CoA_DTP/iAssist's own
      // PATIENT_SETS_ADDRESS/PATIENT_SELECTS_SHIP_DATE beat (see
      // coaDtp.ts's addressSet/shipDateSelected states), reusing the same
      // patient screens (DeliveryAddress.tsx/DeliveryDate.tsx) and the same
      // event names. Unlike CoA/iAssist — where the pharmacy is already
      // auto-assigned by the time address is set — WF2's CRM still picks
      // the pharmacy afterward via the Triage tab's "Choose Pharmacy"
      // (SELECT_PHARMACY); this only adds the patient-facing address/date
      // confirmation ahead of that, gating WorkflowEngine.ts's
      // Fax_PAP_Audit branch before it falls through to Dispatch to
      // Triage. No dedicated states needed here (unlike coaDtp.ts) since
      // WF2's FILL_RX guard (canFillRX) only checks papStatus, not a named
      // state — flat context fields are enough.
      PATIENT_SETS_ADDRESS: {
        actions: 'updatePapPatientSetsAddress',
      },
      PATIENT_SELECTS_SHIP_DATE: {
        actions: 'updatePapPatientSelectsShipDate',
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
          // Mirrors updatePAApproved: opens up Triage/pharmacy dispatch the
          // instant PAP is approved, before anyone's picked a pharmacy.
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
          // Matches coaDtp.ts's PATIENT_SETS_ADDRESS exactly (dispatchStatus
          // -> 'selected'). CRM still separately assigns the actual pharmacy
          // via SELECT_PHARMACY on the Triage tab — this only signals "the
          // patient's done their part," which is what canDispatchToPharmacy
          // (Index.tsx) and canFillRX (this file's guards) key off.
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
      // Fax_PAP_Audit (WF2/PAP) never sets paStatus — it stays 'none' for
      // that flow forever by design (see the SEND_PAP_SMS/VERIFY_INCOME
      // comment above). Its equivalent "cleared to dispatch" signal is
      // papStatus flipping to 'active' (set by updateIncomeVerified once
      // the eIncome check passes). Without this, WF2 could never actually
      // reach FILL_RX in a real click-through — the guard would silently
      // block it forever since paStatus === 'approved' is unreachable for
      // this flow.
      canFillRX: ({ context }) =>
        context.workflowData.paStatus === 'approved' ||
        context.workflowData.papStatus === 'active',
    },
  }
);
