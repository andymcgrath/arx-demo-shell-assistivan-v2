/**
 * iAssist workflow machine — dedicated machine for WF4 (iAssist_PA_Approved)
 *
 * This is a deliberate structural clone of client/engine/workflowMachine.ts
 * (the parallel machine WF1/WF2 use, registry id "enrollment"), which iAssist
 * previously shared via machineIdForFlow's fallback. Cloning it into its own
 * file/registry id gives WF4 a dedicated machine instance so future changes
 * made here for iAssist-specific needs (e.g. new states once Figma designs
 * and field specs land) can never affect WF1/WF2, and vice versa.
 *
 * States/events/guards are identical to workflowMachine.ts today — this is
 * an isolation boundary, not a behavior change. Only `id` and the initial
 * `flowType` differ.
 */

import { createMachine, assign } from 'xstate';
import type { MachineContext, DemoEvent, Pharmacy, WorkflowData } from '@/engine/types';

// Same contact details coaDtp.ts uses for its Retail/Mail/Self-Pay options —
// BenefitPricing.tsx's PRICING_OPTIONS card already hardcodes "CVS Pharmacy
// #3795" / "FutureScripts Home Delivery" as display text for BOTH flows (it's
// a shared component), so selectedPharmacy needs to match those exact
// pharmacies for iAssist too, not a different demo pharmacy.
const RETAIL_PHARMACY: Pharmacy = { name: "CVS Pharmacy #3795", address: "1450 Riverside Drive", city: "Fairview", state: "TX", zip: "75069", phone: "(972) 555-0142" };
const MAIL_ORDER_PHARMACY: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };
const SELF_PAY_PHARMACY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: 'iAssist_PA_Approved',
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
  // Post-PA scheduling fields, originally added for CoA_DTP — now also
  // driven by iAssist's own PA-approved SMS/OTP + pricing/address/date chain
  // below (see the root-level VERIFY_PA_APPROVED_SMS/OTP, SELECT_PRICING_OPTION,
  // SELECT_SELF_PAY, PATIENT_SETS_ADDRESS, PATIENT_SELECTS_SHIP_DATE handlers),
  // which replicates coaDtp.ts's approved-path stages exactly. iAssist never
  // denies PA, so the paDenied/cashOfferSent/paymentProcessed branch CoA_DTP
  // also has is intentionally NOT replicated here — cashOfferStatus stays at
  // its neutral default except for the self-pay PATIENT_PAYS/VERIFY_PAYMENT
  // handlers below, which mirror CoA's pricingSelected/addressSet/
  // shipDateSelected states exactly.
  pricingOption: null,
  paApprovedSmsVerified: false,
  paApprovedOtpVerified: false,
  cashOfferStatus: "none",
  paymentVerified: false,
  patientShipDate: null,
  appealStatus: "none",
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

export const iAssistMachine = createMachine(
  {
    id: 'iAssist',
    type: 'parallel',
    context: initialContext,
    on: {
      UNDO: {
        actions: 'restoreLastSnapshot',
      },
      RESET: {
        target: '#iAssist',
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
      // ── Post-PA-approval scheduling chain, replicated exactly from
      // coaDtp.ts's approved path (paApproved -> paApprovedSmsVerified ->
      // paApprovedOtpVerified -> pricingSelected -> addressSet ->
      // shipDateSelected). Root-level action-only handlers, same pattern as
      // SELECT_PHARMACY/READY_RX above — nothing here needs its own nested
      // state node since every consumer (derivePatientRoute, CRM Index.tsx)
      // reads workflowData fields, not raw state paths.
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
              // WF1's CRM-driven flow treats "enrolled" and "invited" as two
              // separate manual clicks (see useEnrollPatient.ts) — ENROLL
              // goes to 'pending', then a separate INVITE event moves to
              // 'invited'. iAssist has no such second step: Rx submission
              // (finishCase's ENROLL dispatch) already sends the welcome
              // text in the same moment (enrollmentInviteSent is set true by
              // updateEnrollmentPending below), so it must land directly in
              // 'invited' — otherwise the region is stuck in 'pending'
              // forever (nothing in the iAssist flow ever dispatches INVITE)
              // and VERIFY_SMS/VERIFY_OTP/CONFIRM_CONSENT — all only handled
              // from 'invited' onward — get silently ignored no matter how
              // correctly the patient walks through those screens.
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
              // iAssist completes BI the moment the eRx is submitted, same
              // ENROLL dispatch that auto-submits PA below — iAssist runs
              // its own benefits investigation instantly rather than
              // waiting on the patient consent RUN_BI normally requires.
              // Jumping straight to 'complete' (not 'submitted') skips the
              // "Running..." visual, since there's no real wait to show.
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
              // iAssist auto-submits PA the moment the eRx is submitted
              // (finishCase's ENROLL dispatch) — iAssist runs BI and PA
              // submission itself, so this doesn't wait on the normal
              // biStatus==='complete' guard SUBMIT_PA uses. The parallel
              // 'enrollment' region handles the same ENROLL event for its
              // own transition; this is a second, independent handler for
              // that event in a different region, not a replacement.
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
      // ── Post-PA-approval scheduling actions, mirroring coaDtp.ts's
      // paApprovedSmsVerified/paApprovedOtpVerified/pricingSelected/
      // addressSet/shipDateSelected context updates field-for-field.
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
