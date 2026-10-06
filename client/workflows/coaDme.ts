import { setup, assign } from "xstate";
import type { MachineContext, DemoEvent, Pharmacy, WorkflowData } from "@/engine/types";

// coaDme.ts — CoAssist DME (Medical Benefit) (WF-new)
//
// Started as a direct copy of client/workflows/coaDtp.ts (WF3/CoA_DTP)
// through consentConfirmed/biRunning/biComplete — same enrollment -> SMS/OTP
// -> consent -> Benefits Investigation shape, including the same guarded
// "BI can race ahead of the patient's own SMS/OTP/consent progress"
// self-transitions on enrolled/smsVerified/otpVerified/consentConfirmed (see
// coaDtp.ts's comment above `enrolled` for the full reasoning — CRM
// auto-fires RUN_BI the instant ENROLL lands here too, same as CoA_DTP).
//
// Diverges after biComplete: ONE Benefits Investigation now resolves to
// THREE possible coverage outcomes, driven by two granular fields instead of
// a single biResult scalar — pharmacyBenefitStatus and medicalBenefitStatus
// (see engine/types.ts). Only 3 real combinations are reachable from the UI
// (a 4th — medical covered, pharmacy not — is never triggered live, but the
// guards below still route it correctly into the same branch as "both
// covered", since medical benefit always wins when it's covered):
//
//   1. Pharmacy covered, medical not — requires a real Prior Authorization,
//      mirroring coaDtp.ts's own PA flow exactly: SUBMIT_PA (fired
//      automatically by CRM the instant BI resolves to this combo, same as
//      CoA_DTP), APPROVE_PA (always approves — no denial branch, PA here is
//      a formality since the pharmacy benefit already covers the order),
//      then the patient's own PA-approved SMS + OTP re-verify
//      (VERIFY_PA_APPROVED_SMS/VERIFY_PA_APPROVED_OTP, reusing CoA_DTP's
//      exact fields/events). Once re-verified, they pick a specific pharmacy
//      from AssistRx's network (SELECT_PHARMACY, reusing the existing event
//      type) straight from a plain pharmacy-list screen — no Retail-vs-Mail-
//      Order choice, no Copay Program upsell, no pricing/dollar framing at
//      all (that's Scenario 3's own cash-pay-only territory). That single
//      pick both assigns the pharmacy AND sets pricingOption to "retail" in
//      one action, joining pricingSelected — but from there this mirrors
//      CoA_Copay's own Retail bypass exactly (see crm/pages/Index.tsx's
//      isCopayRetailFlow and WorkflowEngine.ts's derivePatientRoute):
//      dispatch is eligible the instant the pharmacy is picked, no
//      address/date/payment step at all, and fulfillment happens outside
//      AssistRx's own pipeline.
//   2. Both covered (medical always wins) — NOTIFY_PROVIDER_TRANSFER. Same
//      DME-provider-transfer path as the original single-scenario version of
//      this flow: CoAssist hands the case to Advanced Diabetes Supply, an
//      outside DME provider who owns fulfillment from here.
//      providerTransferNotified is this branch's terminal state.
//   3. Neither covered — SELECT_SELF_PAY. The patient is offered a cash-pay
//      option, pays, picks a ship date, and the order is filled/shipped/
//      delivered through the exact same pipeline as outcome 1 — no PA here
//      either, and (unlike CoA_DTP's own denial -> cash-offer detour) this
//      never touches paDenied/cashOfferSent/paymentProcessed at all; it
//      joins pricingSelected directly, same as outcome 1.

// Full contact details (not just a name) so the CRM's shared "Triage
// Pharmacy Details" card — reused from WF1's Dispatch to Triage stage, see
// Index.tsx's STAGES_LIVE — doesn't render blank address/phone fields for
// CoA_DME cases. Dexcom-appropriate stand-in, distinct from coaDtp.ts's own
// (a different patient/drug context), though reusing the same shape/style.
// Scenario 1's actual pharmacy now comes from the patient's own pick on
// NetworkPharmacySelection.tsx (patient/pages), which copies its own
// 6-pharmacy list from PharmacySelection.tsx rather than sharing this
// constant — this is only Scenario 3's fixed cash-pay pharmacy now.
const SELF_PAY_PHARMACY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: "CoA_DME",
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
  pricingOption: null,
  copayEnrolled: false,
  paApprovedSmsVerified: false,
  paApprovedOtpVerified: false,
  appealStatus: "none",
  infusionDate: null,
  dmeProviderTransferStatus: "none",
  pharmacyBenefitStatus: "none",
  medicalBenefitStatus: "none",
  cashOfferSmsSent: false,
  cashOfferSmsVerified: false,
  dmeTransferSmsSent: false,
  dmeTransferSmsVerified: false,
}

const initialContext: MachineContext = {
  workflowData: { ...INITIAL_WORKFLOW_DATA },
  events: [],
  _snapshots: [],
};

// Mirrors coaDtp.ts's createEvent exactly — every transition below appends
// one of these to context.events, which is the only thing Field Portal's
// email notifications (getGeneratedEmails, WorkflowEngine.ts) read from.
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

// Derives the legacy biResult narrative scalar from the two granular fields
// COMPLETE_BI now carries — kept around for anything generic (emails, other
// flow-agnostic checks) that still reads that single scalar instead of the
// two new ones. Medical coverage wins first (matches the guards below);
// otherwise pharmacy coverage decides between the other two outcomes.
function deriveBiResult(pharmacyBenefitStatus: 'covered' | 'not_covered', medicalBenefitStatus: 'covered' | 'not_covered'): string {
  if (medicalBenefitStatus === 'covered') return 'dme_covered';
  if (pharmacyBenefitStatus === 'covered') return 'coverage_found';
  return 'no_coverage';
}

export const coaDmeMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as
      | { type: "ENROLL" }
      | { type: "VERIFY_SMS" }
      | { type: "VERIFY_OTP" }
      | { type: "CONFIRM_CONSENT" }
      | { type: "RUN_BI" }
      | { type: "COMPLETE_BI"; pharmacyBenefitStatus: "covered" | "not_covered"; medicalBenefitStatus: "covered" | "not_covered" }
      | { type: "NOTIFY_PROVIDER_TRANSFER" }
      | { type: "VERIFY_DME_TRANSFER_SMS" }
      | { type: "SUBMIT_PA" }
      | { type: "APPROVE_PA" }
      | { type: "VERIFY_PA_APPROVED_SMS" }
      | { type: "VERIFY_PA_APPROVED_OTP" }
      | { type: "SEND_CASH_OFFER_SMS" }
      | { type: "VERIFY_CASH_OFFER_SMS" }
      | { type: "SELECT_SELF_PAY" }
      | { type: "PATIENT_PAYS" }
      | { type: "VERIFY_PAYMENT" }
      | { type: "PATIENT_SETS_ADDRESS" }
      | { type: "PATIENT_SELECTS_SHIP_DATE" }
      | { type: "SELECT_PHARMACY"; pharmacy: Pharmacy }
      | { type: "FILL_RX" }
      | { type: "READY_RX" }
      | { type: "SHIP_RX" }
      | { type: "DELIVER_RX" }
      | { type: "RESET" },
  },
}).createMachine({
  id: "coaDme",
  context: initialContext,
  initial: "idle",
  on: {
    RESET: {
      target: ".idle",
      actions: assign(() => ({
        workflowData: { ...INITIAL_WORKFLOW_DATA },
        events: [],
        _snapshots: [],
      })),
    },
  },
  states: {
    idle: {
      on: {
        ENROLL: {
          target: "enrolled",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, enrollmentStatus: "enrolled", enrollmentInviteSent: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'ENROLL', 'crm', 1)],
          }),
        },
      },
    },
    // Benefits Investigation doesn't wait on patient consent — it can run
    // off the referral/eRx alone (same business rule as CoA_DTP — see
    // coaDtp.ts's comment above its own `enrolled` state for the full
    // reasoning). CRM's own auto-trigger effect (see crm/pages/Index.tsx)
    // fires RUN_BI the instant ENROLL lands, well before the patient has
    // necessarily opened their SMS link, let alone consented. Since the
    // patient's own SMS/OTP/consent progress and BI's progress are now two
    // independent timelines, RUN_BI/COMPLETE_BI need to be reachable from
    // whichever of enrolled/smsVerified/otpVerified/consentConfirmed the
    // machine happens to be sitting in when each fires — not just
    // consentConfirmed, which would be the only place either was reachable
    // otherwise.
    //
    // RUN_BI/COMPLETE_BI are self-transitions (no target) — BI doesn't need
    // its own named state to represent "in progress," it just needs
    // biStatus to carry forward, so the patient's own state-node progress
    // isn't disturbed. Downstream screens don't care which named state the
    // machine is actually in either way — derivePatientRoute
    // (WorkflowEngine.ts) reads workflowData fields only, never the raw
    // state value — so this is safe even though the node name stops
    // describing the patient's position once BI races ahead of it.
    //
    // Both events are guarded so a stray re-dispatch (e.g. a demo operator
    // manually firing one again) can't stomp an already-running/complete
    // result.
    enrolled: {
      on: {
        VERIFY_SMS: {
          target: "smsVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, smsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_SMS', 'patient', 3)],
          }),
        },
        RUN_BI: {
          guard: ({ context }) => context.workflowData.biStatus === "none",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "running" }),
            events: ({ context }) => [...context.events, createEvent(context, 'RUN_BI', 'analytics', 6)],
          }),
        },
        COMPLETE_BI: {
          guard: ({ context }) => context.workflowData.biStatus === "running",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              biStatus: "complete",
              pharmacyBenefitStatus: event.pharmacyBenefitStatus,
              medicalBenefitStatus: event.medicalBenefitStatus,
              biResult: deriveBiResult(event.pharmacyBenefitStatus, event.medicalBenefitStatus),
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
          }),
        },
        // Scenario 1 only (pharmacy covered, medical not) — mirrors
        // coaDtp.ts's own SUBMIT_PA exactly: PA submission doesn't wait on
        // the patient's own SMS/OTP/consent progress either, so this same
        // guarded handler needs to live on every one of
        // enrolled/smsVerified/otpVerified/consentConfirmed (not just the
        // named biComplete state below), same reasoning as RUN_BI/
        // COMPLETE_BI above. CRM's own auto-trigger effect (see
        // crm/pages/Index.tsx) fires this the instant biStatus reaches
        // "complete" for this outcome. Scenario 2/3 never submit PA at all.
        SUBMIT_PA: {
          target: "paSubmitted",
          guard: ({ context }) => context.workflowData.biStatus === "complete" && context.workflowData.pharmacyBenefitStatus === "covered" && context.workflowData.medicalBenefitStatus !== "covered",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "submitted", paSubmittedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
          }),
        },
      },
    },
    smsVerified: {
      on: {
        VERIFY_OTP: {
          target: "otpVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, otpVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_OTP', 'patient', 4)],
          }),
        },
        // See enrolled's RUN_BI/COMPLETE_BI above — same reasoning, one
        // state later in the patient's own SMS/OTP/consent progress.
        RUN_BI: {
          guard: ({ context }) => context.workflowData.biStatus === "none",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "running" }),
            events: ({ context }) => [...context.events, createEvent(context, 'RUN_BI', 'analytics', 6)],
          }),
        },
        COMPLETE_BI: {
          guard: ({ context }) => context.workflowData.biStatus === "running",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              biStatus: "complete",
              pharmacyBenefitStatus: event.pharmacyBenefitStatus,
              medicalBenefitStatus: event.medicalBenefitStatus,
              biResult: deriveBiResult(event.pharmacyBenefitStatus, event.medicalBenefitStatus),
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
          }),
        },
        // See enrolled's SUBMIT_PA above.
        SUBMIT_PA: {
          target: "paSubmitted",
          guard: ({ context }) => context.workflowData.biStatus === "complete" && context.workflowData.pharmacyBenefitStatus === "covered" && context.workflowData.medicalBenefitStatus !== "covered",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "submitted", paSubmittedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
          }),
        },
      },
    },
    otpVerified: {
      on: {
        CONFIRM_CONSENT: {
          target: "consentConfirmed",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, consentStatus: "confirmed" }),
            events: ({ context }) => [...context.events, createEvent(context, 'CONFIRM_CONSENT', 'patient', 5)],
          }),
        },
        // See enrolled's RUN_BI/COMPLETE_BI above.
        RUN_BI: {
          guard: ({ context }) => context.workflowData.biStatus === "none",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "running" }),
            events: ({ context }) => [...context.events, createEvent(context, 'RUN_BI', 'analytics', 6)],
          }),
        },
        COMPLETE_BI: {
          guard: ({ context }) => context.workflowData.biStatus === "running",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              biStatus: "complete",
              pharmacyBenefitStatus: event.pharmacyBenefitStatus,
              medicalBenefitStatus: event.medicalBenefitStatus,
              biResult: deriveBiResult(event.pharmacyBenefitStatus, event.medicalBenefitStatus),
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
          }),
        },
        // See enrolled's SUBMIT_PA above.
        SUBMIT_PA: {
          target: "paSubmitted",
          guard: ({ context }) => context.workflowData.biStatus === "complete" && context.workflowData.pharmacyBenefitStatus === "covered" && context.workflowData.medicalBenefitStatus !== "covered",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "submitted", paSubmittedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
          }),
        },
      },
    },
    // The original RUN_BI (still targeting "biRunning", a real named state —
    // unlike the self-transitions above) is now the fallback path: reachable
    // if BI somehow hasn't started by the time consent confirms. Its
    // COMPLETE_BI is new — added for the much more common case now, where BI
    // is still "running" once the patient reaches this state (it usually
    // starts well before the patient's even through SMS/OTP), so the CRM's
    // tab-open auto-complete effect has somewhere to land it without also
    // moving the node to "biRunning" (which would misrepresent the patient's
    // own progress as reset).
    consentConfirmed: {
      on: {
        RUN_BI: {
          target: "biRunning",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "running" }),
            events: ({ context }) => [...context.events, createEvent(context, 'RUN_BI', 'analytics', 6)],
          }),
        },
        COMPLETE_BI: {
          guard: ({ context }) => context.workflowData.biStatus === "running",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              biStatus: "complete",
              pharmacyBenefitStatus: event.pharmacyBenefitStatus,
              medicalBenefitStatus: event.medicalBenefitStatus,
              biResult: deriveBiResult(event.pharmacyBenefitStatus, event.medicalBenefitStatus),
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
          }),
        },
        // See enrolled's SUBMIT_PA above.
        SUBMIT_PA: {
          target: "paSubmitted",
          guard: ({ context }) => context.workflowData.biStatus === "complete" && context.workflowData.pharmacyBenefitStatus === "covered" && context.workflowData.medicalBenefitStatus !== "covered",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "submitted", paSubmittedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
          }),
        },
      },
    },
    biRunning: {
      on: {
        COMPLETE_BI: {
          target: "biComplete",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              biStatus: "complete",
              pharmacyBenefitStatus: event.pharmacyBenefitStatus,
              medicalBenefitStatus: event.medicalBenefitStatus,
              biResult: deriveBiResult(event.pharmacyBenefitStatus, event.medicalBenefitStatus),
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
          }),
        },
      },
    },
    // Terminal fan-out — see this file's header comment for the 3 outcomes.
    // Only one of the three transitions below can actually fire for a given
    // case, since their guards partition pharmacyBenefitStatus/
    // medicalBenefitStatus's real combinations.
    biComplete: {
      // Scenario 3 — neither covered — gets a fully automatic SMS: no CRM
      // stage card, no button. It stands for a real time gap since the
      // patient last opened the portal (a few days waiting on BI), so the
      // "no coverage, but here's a cash option" news arrives as its own
      // tap-through SMS (cashOfferSmsSent/cashOfferSmsVerified) rather than
      // the patient just materializing on the /pa-denied screen mid-session.
      // See cashOfferSmsSent/cashOfferSmsVerified below for the rest of
      // this beat — SELECT_SELF_PAY lives there.
      //
      // Scenario 1 (pharmacy covered, medical not) used to get this same
      // automatic-SMS treatment, but now requires a real Prior Authorization
      // first — see this state's own SUBMIT_PA handler below, which mirrors
      // coaDtp.ts's PA flow exactly (submit → auto-approve → SMS+OTP
      // re-verify) instead of a single automatic tap-through.
      always: {
        target: "cashOfferSmsSent",
        guard: ({ context }) => context.workflowData.pharmacyBenefitStatus === "not_covered" && context.workflowData.medicalBenefitStatus === "not_covered",
        actions: assign({
          workflowData: ({ context }) => ({ ...context.workflowData, cashOfferSmsSent: true }),
          events: ({ context }) => [...context.events, createEvent(context, 'SEND_CASH_OFFER_SMS', 'crm', 9)],
        }),
      },
      on: {
        // Scenario 2 — medical benefit always wins when covered, regardless
        // of pharmacy (covers the 4th, UI-unreachable combo too: medical
        // covered + pharmacy not covered still lands here). CoAssist hands
        // the case to Advanced Diabetes Supply, the outside DME provider who
        // owns fulfillment from here. Unlike Scenario 1/3's fully-automatic
        // SMS, this one stays a real CRM action (DME-14282's "Notify
        // Provider" button / tab-open auto-timer, unchanged) — transferring
        // a case to an outside company is a deliberate hand-off worth CRM
        // visibility/control over, not just an informational text. But the
        // patient still shouldn't just materialize on the terminal screen
        // mid-session, so this now also sets dmeTransferSmsSent and routes
        // through dmeTransferSmsSent's own tap-through SMS beat below
        // before reaching providerTransferNotified.
        NOTIFY_PROVIDER_TRANSFER: {
          target: "dmeTransferSmsSent",
          guard: ({ context }) => context.workflowData.medicalBenefitStatus === "covered",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, dmeProviderTransferStatus: "notified", dmeTransferSmsSent: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'NOTIFY_PROVIDER_TRANSFER', 'crm', 9)],
          }),
        },
        // Scenario 1 — pharmacy covered, medical not. See enrolled's own
        // SUBMIT_PA handler above for the full reasoning — this is the
        // "fallback path" copy of it, reached if BI somehow completes after
        // the patient's own SMS/OTP/consent progress (same relationship
        // RUN_BI/biRunning has to the four self-transition copies above it).
        SUBMIT_PA: {
          target: "paSubmitted",
          guard: ({ context }) => context.workflowData.pharmacyBenefitStatus === "covered" && context.workflowData.medicalBenefitStatus !== "covered",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "submitted", paSubmittedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
          }),
        },
      },
    },
    // Scenario 1's own Prior Authorization sequence — mirrors coaDtp.ts's
    // paSubmitted/paApproved/paApprovedSmsVerified/paApprovedOtpVerified
    // exactly, including the guarded VERIFY_SMS/VERIFY_OTP/CONFIRM_CONSENT
    // copies on paSubmitted/paApproved (so the patient's own onboarding
    // isn't stranded if PA races ahead of it, same "two independent
    // timelines" reasoning as RUN_BI/COMPLETE_BI above) — except there's no
    // DENY_PA branch: confirmed this scenario always auto-approves, since
    // the pharmacy benefit already covers the order and PA here is a
    // formality, not a real decision point.
    paSubmitted: {
      on: {
        APPROVE_PA: {
          target: "paApproved",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "approved", paApprovedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'APPROVE_PA', 'provider', 9)],
          }),
        },
        VERIFY_SMS: {
          guard: ({ context }) => !context.workflowData.smsVerified,
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, smsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_SMS', 'patient', 3)],
          }),
        },
        VERIFY_OTP: {
          guard: ({ context }) => context.workflowData.smsVerified && !context.workflowData.otpVerified,
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, otpVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_OTP', 'patient', 4)],
          }),
        },
        CONFIRM_CONSENT: {
          guard: ({ context }) => context.workflowData.otpVerified && context.workflowData.consentStatus === "pending",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, consentStatus: "confirmed" }),
            events: ({ context }) => [...context.events, createEvent(context, 'CONFIRM_CONSENT', 'patient', 5)],
          }),
        },
      },
    },
    paApproved: {
      on: {
        VERIFY_PA_APPROVED_SMS: {
          target: "paApprovedSmsVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paApprovedSmsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_PA_APPROVED_SMS', 'patient', 9)],
          }),
        },
        VERIFY_SMS: {
          guard: ({ context }) => !context.workflowData.smsVerified,
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, smsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_SMS', 'patient', 3)],
          }),
        },
        VERIFY_OTP: {
          guard: ({ context }) => context.workflowData.smsVerified && !context.workflowData.otpVerified,
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, otpVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_OTP', 'patient', 4)],
          }),
        },
        CONFIRM_CONSENT: {
          guard: ({ context }) => context.workflowData.otpVerified && context.workflowData.consentStatus === "pending",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, consentStatus: "confirmed" }),
            events: ({ context }) => [...context.events, createEvent(context, 'CONFIRM_CONSENT', 'patient', 5)],
          }),
        },
      },
    },
    paApprovedSmsVerified: {
      on: {
        VERIFY_PA_APPROVED_OTP: {
          target: "paApprovedOtpVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paApprovedOtpVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_PA_APPROVED_OTP', 'patient', 9)],
          }),
        },
      },
    },
    // Patient picks a specific network pharmacy — no Retail-vs-Mail-Order
    // choice, no dollar amounts, no Copay upsell (Scenario 3, not this one,
    // is where a cash price ever shows). Assigns the pharmacy AND sets
    // pricingOption to "retail" together, joining pricingSelected so this
    // outcome gets CoA_Copay's Retail treatment from here on (dispatch-
    // eligible immediately, no address/date/payment step, fulfillment
    // outside AssistRx's own pipeline — see crm/pages/Index.tsx's
    // isCopayRetailFlow and WorkflowEngine.ts's derivePatientRoute).
    paApprovedOtpVerified: {
      on: {
        SELECT_PHARMACY: {
          target: "pricingSelected",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              pricingOption: "retail",
              selectedPharmacy: event.pharmacy,
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_PHARMACY', 'patient', 9)],
          }),
        },
      },
    },
    // Scenario 2's own tap-through SMS beat — same shape as Scenario 1/3's
    // own SMS pairs above, just sent as part of the CRM's own
    // NOTIFY_PROVIDER_TRANSFER action (see biComplete above) instead of
    // automatically. VERIFY_DME_TRANSFER_SMS is the patient's tap; no OTP
    // step, same single-tap-through shape.
    dmeTransferSmsSent: {
      on: {
        VERIFY_DME_TRANSFER_SMS: {
          target: "providerTransferNotified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, dmeTransferSmsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_DME_TRANSFER_SMS', 'patient', 9)],
          }),
        },
      },
    },
    // Scenario 3's own tap-through SMS beat — mirrors the very first
    // enrollment SMS bubble (SMSMessage.tsx/enrolled->smsVerified above),
    // just a second, later milestone with its own dedicated fields
    // (cashOfferSmsSent/cashOfferSmsVerified). VERIFY_CASH_OFFER_SMS is the
    // patient's tap; no OTP step, same single-tap-through shape.
    cashOfferSmsSent: {
      on: {
        VERIFY_CASH_OFFER_SMS: {
          target: "cashOfferSmsVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, cashOfferSmsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_CASH_OFFER_SMS', 'patient', 9)],
          }),
        },
      },
    },
    // Patient taps through to the cash-pay info screen (/pa-denied's
    // isDmeFlow branch) and accepts the self-pay offer — there's no real
    // "choice" here (nothing else to pick), so this fires from that
    // screen's single CTA, same shape as CoA_DTP's SELECT_SELF_PAY off
    // paApprovedOtpVerified — but unlike CoA_DTP, this never routes through
    // paDenied/cashOfferSent/paymentProcessed first; it joins pricingSelected
    // directly, same as Scenario 1's pharmacy pick.
    cashOfferSmsVerified: {
      on: {
        SELECT_SELF_PAY: {
          target: "pricingSelected",
          actions: assign({
            workflowData: ({ context }) => ({
              ...context.workflowData,
              pricingOption: "self_pay",
              selectedPharmacy: SELF_PAY_PHARMACY,
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_SELF_PAY', 'patient', 9)],
          }),
        },
      },
    },
    // ── Fulfillment tail (Scenarios 1 and 3) ──────────────────────────────
    // Copied from coaDtp.ts's pricingSelected -> addressSet ->
    // shipDateSelected -> rxProcessing -> rxReady -> rxShipped -> rxDelivered
    // almost verbatim (same event handlers/shapes) — see that file's own
    // comments on each state for the full reasoning. This tail is reached
    // from paApprovedOtpVerified's own SELECT_PHARMACY for Scenario 1
    // (network pharmacy pick, insurance-billed, ends at Dispatch to Triage —
    // no address/date/payment) and from cashOfferSmsVerified's
    // SELECT_SELF_PAY for Scenario 3 (self-pay, cash-billed, keeps the full
    // address/date/payment/dispatch chain).
    pricingSelected: {
      on: {
        PATIENT_SETS_ADDRESS: {
          target: "addressSet",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, dispatchStatus: "selected" }),
            events: ({ context }) => [...context.events, createEvent(context, 'PATIENT_SETS_ADDRESS', 'patient', 9)],
          }),
        },
        // CoA's pharmacy is already known the moment pricing is chosen (see
        // paApprovedOtpVerified's SELECT_PHARMACY / biComplete's
        // SELECT_SELF_PAY above) — well before the patient sets an address.
        // The CRM's Dispatch to Triage tab lets
        // staff dispatch to pharmacy as soon as a pharmacy is assigned (see
        // Index.tsx's canDispatchToPharmacy), so this state needs its own
        // FILL_RX/SELECT_PHARMACY handlers too, not just addressSet/
        // shipDateSelected's — otherwise clicking "Dispatch to Pharmacy"
        // here silently does nothing.
        FILL_RX: {
          target: "rxProcessing",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
            events: ({ context }) => [...context.events, createEvent(context, 'FILL_RX', 'field', 10)],
          }),
        },
        SELECT_PHARMACY: {
          actions: assign({
            workflowData: ({ context, event }) => ({ ...context.workflowData, selectedPharmacy: event.pharmacy }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_PHARMACY', 'crm', 5)],
          }),
        },
        // Scenario 3's real payment step, fired from the payment screen
        // after address + date (nothing dispatches PATIENT_SETS_ADDRESS
        // before this, so the machine is still sitting here at that point).
        // Retail/Mail (Scenario 1) never dispatch these, so paymentVerified
        // correctly stays untouched for that path.
        PATIENT_PAYS: {
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, cashOfferStatus: "paid" }),
            events: ({ context }) => [...context.events, createEvent(context, 'PATIENT_PAYS', 'patient', 9)],
          }),
        },
        VERIFY_PAYMENT: {
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paymentVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_PAYMENT', 'crm', 9)],
          }),
        },
      },
    },
    addressSet: {
      on: {
        PATIENT_SELECTS_SHIP_DATE: {
          target: "shipDateSelected",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, patientShipDate: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'PATIENT_SELECTS_SHIP_DATE', 'patient', 9)],
          }),
        },
        FILL_RX: {
          target: "rxProcessing",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
            events: ({ context }) => [...context.events, createEvent(context, 'FILL_RX', 'field', 10)],
          }),
        },
        SELECT_PHARMACY: {
          actions: assign({
            workflowData: ({ context, event }) => ({ ...context.workflowData, selectedPharmacy: event.pharmacy }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_PHARMACY', 'crm', 5)],
          }),
        },
        PATIENT_PAYS: {
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, cashOfferStatus: "paid" }),
            events: ({ context }) => [...context.events, createEvent(context, 'PATIENT_PAYS', 'patient', 9)],
          }),
        },
        VERIFY_PAYMENT: {
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paymentVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_PAYMENT', 'crm', 9)],
          }),
        },
      },
    },
    shipDateSelected: {
      on: {
        FILL_RX: {
          target: "rxProcessing",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
            events: ({ context }) => [...context.events, createEvent(context, 'FILL_RX', 'field', 10)],
          }),
        },
        SELECT_PHARMACY: {
          actions: assign({
            workflowData: ({ context, event }) => ({ ...context.workflowData, selectedPharmacy: event.pharmacy }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_PHARMACY', 'crm', 5)],
          }),
        },
        PATIENT_PAYS: {
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, cashOfferStatus: "paid" }),
            events: ({ context }) => [...context.events, createEvent(context, 'PATIENT_PAYS', 'patient', 9)],
          }),
        },
        VERIFY_PAYMENT: {
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paymentVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_PAYMENT', 'crm', 9)],
          }),
        },
      },
    },
    // Mirrors coaDtp.ts's order sub-machine exactly: processing -> ready ->
    // shipped -> delivered.
    rxProcessing: {
      on: {
        READY_RX: {
          target: "rxReady",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "ready" }),
            events: ({ context }) => [...context.events, createEvent(context, 'READY_RX', 'field', 10)],
          }),
        },
      },
    },
    rxReady: {
      on: {
        SHIP_RX: {
          target: "rxShipped",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "shipped" }),
            events: ({ context }) => [...context.events, createEvent(context, 'SHIP_RX', 'field', 11)],
          }),
        },
      },
    },
    rxShipped: {
      on: {
        DELIVER_RX: {
          target: "rxDelivered",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "delivered" }),
            events: ({ context }) => [...context.events, createEvent(context, 'DELIVER_RX', 'field', 12)],
          }),
        },
      },
    },
    rxDelivered: {},
    // Scenario 2's terminal state — see biComplete's NOTIFY_PROVIDER_TRANSFER
    // above.
    providerTransferNotified: {},
  },
});
