/**
 * iAssist PAP workflow machine — dedicated machine for WF5 (iAssist_PAP)
 *
 * Deliberate structural clone of client/workflows/iAssist.ts (WF4,
 * iAssist_PA_Approved) — same states, events, and guards. Only `id` and the
 * initial `flowType` differ, same isolation-boundary rationale iAssist.ts's
 * own header comment gives for cloning workflowMachine.ts.
 *
 * The intended demo path differs from WF4: instead of a CRM agent clicking
 * APPROVE_PA, this flow is meant to be walked to DENY_PA (already a valid
 * transition here, same as WF4 — iAssist.ts never removed it, WF4's demo
 * script just never used it). That's it for now — priorAuth.denied is a
 * dead end here exactly like it is in every other flow's machine, on
 * purpose: this flow exists to demo Action Factory closing that gap live
 * (see engine/types.ts's FlowType comment), not to pre-solve it in the
 * machine itself. The appeal-initiation event/field gets added here once
 * that live-rule integration is built.
 */

import { createMachine, assign } from 'xstate';
import type { MachineContext, DemoEvent, Pharmacy, WorkflowData } from '@/engine/types';

// Same contact details coaDtp.ts/iAssist.ts use for their Retail/Mail/Self-Pay
// options — kept here even though this flow's demo path denies PA (so these
// are unreachable in the intended walkthrough) purely to keep this file a
// faithful structural clone, matching iAssist.ts field-for-field.
const RETAIL_PHARMACY: Pharmacy = { name: "CVS Pharmacy #3795", address: "1450 Riverside Drive", city: "Fairview", state: "TX", zip: "75069", phone: "(972) 555-0142" };
const MAIL_ORDER_PHARMACY: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };
const SELF_PAY_PHARMACY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: 'iAssist_PAP',
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
  // Post-PA-approval scheduling fields — carried over from iAssist.ts for
  // structural parity even though this flow's intended path denies PA
  // instead of approving it, so these stay at their neutral defaults in the
  // normal walkthrough.
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

export const iAssistPapMachine = createMachine(
  {
    id: 'iAssistPap',
    type: 'parallel',
    context: initialContext,
    on: {
      UNDO: {
        actions: 'restoreLastSnapshot',
      },
      RESET: {
        target: '#iAssistPap',
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
      // ── Post-PA-approval scheduling chain, carried over from iAssist.ts for
      // structural parity — unreachable in this flow's intended (denied) path.
      VERIFY_PA_APPROVED_SMS: {
        actions: 'updatePaApprovedSmsVerified',
      },
      VERIFY_PA_APPROVED_OTP: {
        actions: 'updatePaApprovedOtpVerified',
      },
      SELECT_PRICING_OPTION: {
        actions: 'updateSelectPricingOption',
      },
      SELECT_SELF_PAY: {
        actions: 'updateSelectSelfPay',
      },
      PATIENT_SETS_ADDRESS: {
        actions: 'updatePatientSetsAddress',
      },
      PATIENT_SELECTS_SHIP_DATE: {
        actions: 'updatePatientSelectsShipDate',
      },
      PATIENT_PAYS: {
        actions: 'updatePatientPays',
      },
      VERIFY_PAYMENT: {
        actions: 'updateVerifyPayment',
      },
    },
    states: {
      enrollment: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              // Matches iAssist.ts exactly: Rx submission lands straight in
              // 'invited' (welcome text already sent), no separate INVITE step.
              ENROLL: {
                target: 'invited',
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
              // Matches iAssist.ts: BI auto-completes the moment the eRx is
              // submitted, same ENROLL dispatch that auto-submits PA below.
              ENROLL: {
                target: 'complete',
                actions: 'updateBIComplete',
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
              // Matches iAssist.ts: PA auto-submits the moment the eRx is
              // submitted, independent of the normal biStatus-gated guard.
              ENROLL: {
                target: 'submitted',
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
      // ── Post-PA-approval scheduling actions, carried over from iAssist.ts
      // for structural parity — unreachable in this flow's intended path.
      updatePaApprovedSmsVerified: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paApprovedSmsVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_PA_APPROVED_SMS', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePaApprovedOtpVerified: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paApprovedOtpVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_PA_APPROVED_OTP', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateSelectPricingOption: assign(({ context, event }: any) => ({
        workflowData: {
          ...context.workflowData,
          pricingOption: event.option,
          selectedPharmacy: event.option === 'retail' ? RETAIL_PHARMACY : MAIL_ORDER_PHARMACY,
        },
        events: [...context.events, createEvent(context, 'SELECT_PRICING_OPTION', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateSelectSelfPay: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          pricingOption: 'self_pay',
          selectedPharmacy: SELF_PAY_PHARMACY,
        },
        events: [...context.events, createEvent(context, 'SELECT_SELF_PAY', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePatientSetsAddress: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          dispatchStatus: 'selected',
        },
        events: [...context.events, createEvent(context, 'PATIENT_SETS_ADDRESS', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePatientSelectsShipDate: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          patientShipDate: new Date().toISOString(),
        },
        events: [...context.events, createEvent(context, 'PATIENT_SELECTS_SHIP_DATE', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updatePatientPays: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          cashOfferStatus: 'paid',
        },
        events: [...context.events, createEvent(context, 'PATIENT_PAYS', 'patient', 9)],
        _snapshots: pushSnapshot(context._snapshots, context),
      })),
      updateVerifyPayment: assign(({ context }) => ({
        workflowData: {
          ...context.workflowData,
          paymentVerified: true,
        },
        events: [...context.events, createEvent(context, 'VERIFY_PAYMENT', 'patient', 9)],
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
      canFillRX: ({ context }) => context.workflowData.paStatus === 'approved',
    },
  }
);
