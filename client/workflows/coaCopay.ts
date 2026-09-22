import { setup, assign } from "xstate";
import type { MachineContext, DemoEvent, Pharmacy, WorkflowData } from "@/engine/types";

// coaCopay.ts — CoAssist Copay Program (WF4)
//
// Started as a direct copy of client/workflows/coaDtp.ts (WF3/CoA_DTP) — see
// git history — and has now diverged at the pricing step. CoA_DTP's Copay
// option is a third mutually-exclusive pricing tier (enroll → straight to
// pricingSelected with a dedicated "CoAssist Pharmacy"). Here, Copay is no
// longer mutually exclusive with Retail/Mail: enrolling (SELECT_SELF_PAY)
// only sets copayEnrolled and parks in the new `copayEnrolled` state below —
// the patient still has to pick Retail or Mail Order as the real fulfillment
// channel afterward (SELECT_PRICING_OPTION), same as picking one directly
// from paApprovedOtpVerified. Every other state below this point is
// unchanged from coaDtp.ts.

// Full contact details (not just a name) so the CRM's shared "Triage
// Pharmacy Details" card — reused from WF1's Dispatch to Triage stage, see
// Index.tsx's STAGES_LIVE — doesn't render blank address/phone fields for
// CoA_Copay cases.
//
// RETAIL_PHARMACY is only a placeholder here — the instant the patient picks
// Retail, PharmacySelection.tsx dispatches SELECT_PHARMACY with their actual
// choice, overwriting this. It's kept in sync with that screen's CVS entry
// (same Orlando, FL address as Keanu Dixon's home — see PATIENT_SEED in
// patientStore.ts — matching coaDtp.ts's SELF_PAY_PHARMACY convention) so
// nothing looks inconsistent in the sliver of time before that dispatch
// fires. MAIL_ORDER_PHARMACY is untouched — Mail Order never routes through
// PharmacySelection.tsx (ships from a distribution center, not somewhere
// Keanu drives to), so there's no local-address expectation for it.
const RETAIL_PHARMACY: Pharmacy = { name: "CVS Pharmacy #3795", address: "210 N Orange Ave", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-0142" };
const MAIL_ORDER_PHARMACY: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: "CoA_Copay",
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
}

const initialContext: MachineContext = {
  workflowData: { ...INITIAL_WORKFLOW_DATA },
  events: [],
  _snapshots: [],
};

// Mirrors workflowMachine.ts's createEvent exactly — every transition below
// appends one of these to context.events, which is the only thing Field
// Portal's email notifications (getGeneratedEmails, WorkflowEngine.ts) read
// from.
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

export const coaCopayMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as
      | { type: "ENROLL" }
      | { type: "VERIFY_SMS" }
      | { type: "VERIFY_OTP" }
      | { type: "CONFIRM_CONSENT" }
      | { type: "RUN_BI" }
      | { type: "COMPLETE_BI" }
      | { type: "SUBMIT_PA" }
      | { type: "APPROVE_PA" }
      | { type: "DENY_PA" }
      | { type: "VERIFY_PA_APPROVED_SMS" }
      | { type: "VERIFY_PA_APPROVED_OTP" }
      | { type: "SELECT_PRICING_OPTION"; option: "retail" | "mail_order" }
      | { type: "SELECT_SELF_PAY" }
      | { type: "SEND_CASH_OFFER" }
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
  id: "coaCopay",
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
    // Benefits Investigation no longer waits on patient consent — it can run
    // off the referral/eRx alone (business rule change from the original
    // "consentConfirmed -> RUN_BI" design below). CRM's own auto-trigger
    // effect (see crm/pages/Index.tsx) now fires RUN_BI the instant ENROLL
    // lands, well before the patient has necessarily opened their SMS link,
    // and its "auto-complete BI when the agent opens the BI stage tab"
    // effect can fire COMPLETE_BI at any point after that. Since the
    // patient's own SMS/OTP/consent progress and BI's progress are now two
    // independent timelines, RUN_BI/COMPLETE_BI need to be reachable from
    // whichever of enrolled/smsVerified/otpVerified/consentConfirmed the
    // machine happens to be sitting in when each fires — not just
    // consentConfirmed, which was the only place they were reachable before.
    // Each is a self-transition (no target) so the patient's own state-node
    // progress isn't disturbed; biStatus/events are carried forward via the
    // usual spread. Guarded so a stray re-dispatch (e.g. a demo operator
    // manually firing one again) can't stomp an already-running/complete
    // result. Mirrors coaDtp.ts exactly.
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
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "complete" }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
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
        // See enrolled's RUN_BI/COMPLETE_BI above — same reasoning, one state
        // later in the patient's own SMS/OTP/consent progress.
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
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "complete" }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
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
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "complete" }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
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
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "complete" }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
          }),
        },
        // PA submission still requires BOTH consent and BI — that hasn't
        // changed, only BI's own start no longer requires consent (see the
        // comment above enrolled). Before this, SUBMIT_PA was reachable only
        // via the dedicated "biComplete" named state below, which assumed
        // BI always finished after consent — the only order the old
        // strictly-sequential chain allowed. Now BI can finish first (a
        // self-transition, so the node stays "consentConfirmed" rather than
        // moving to "biComplete" — see enrolled's comment), so without this,
        // a provider clicking "Start Prior Auth" once biStatus is already
        // "complete" at the moment consent confirms would silently do
        // nothing — SUBMIT_PA had no handler here. Real transition (not a
        // self-transition) — once consent is confirmed there's nothing left
        // for the patient to do in this state, so moving on to paSubmitted
        // is safe. Mirrors coaDtp.ts exactly.
        SUBMIT_PA: {
          target: "paSubmitted",
          guard: ({ context }) => context.workflowData.biStatus === "complete",
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
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "complete" }),
            events: ({ context }) => [...context.events, createEvent(context, 'COMPLETE_BI', 'analytics', 7)],
          }),
        },
      },
    },
    biComplete: {
      on: {
        SUBMIT_PA: {
          target: "paSubmitted",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "submitted", paSubmittedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'SUBMIT_PA', 'provider', 8)],
          }),
        },
      },
    },
    paSubmitted: {
      on: {
        APPROVE_PA: {
          target: "paApproved",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "approved", paApprovedAt: new Date().toISOString() }),
            events: ({ context }) => [...context.events, createEvent(context, 'APPROVE_PA', 'provider', 9)],
          }),
        },
        // Kept for demo flexibility — like CoA_DTP, CoA_Copay's live flow
        // always approves (see CRM Index.tsx), but the denial → cash-offer
        // chain below is still fully wired if a future scenario needs it.
        DENY_PA: {
          target: "paDenied",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paStatus: "denied" }),
            events: ({ context }) => [...context.events, createEvent(context, 'DENY_PA', 'provider', 9)],
          }),
        },
      },
    },
    // ── Approved path: mirrors the initial enrollment SMS/OTP beats — patient
    // gets a new SMS ("PA approved, time to schedule"), taps through, and
    // re-verifies OTP before reviewing Retail/Mail Order pricing. Then
    // rejoins the same address/ship-date/fill chain the denied+cash-pay
    // path uses below (see pricingSelected → addressSet).
    paApproved: {
      on: {
        VERIFY_PA_APPROVED_SMS: {
          target: "paApprovedSmsVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paApprovedSmsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_PA_APPROVED_SMS', 'patient', 9)],
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
    paApprovedOtpVerified: {
      on: {
        SELECT_PRICING_OPTION: {
          target: "pricingSelected",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              pricingOption: event.option,
              selectedPharmacy: event.option === "retail" ? RETAIL_PHARMACY : MAIL_ORDER_PHARMACY,
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_PRICING_OPTION', 'patient', 9)],
          }),
        },
        // Third option on Benefit Pricing — patient applies to the CoAssist
        // Copay Program instead of picking Retail/Mail directly. Unlike
        // coaDtp.ts, this does NOT assign a pharmacy or leave
        // paApprovedOtpVerified for pricingSelected — enrolling only unlocks
        // the reduced price and parks in `copayEnrolled` below, still
        // waiting on the patient to pick Retail or Mail Order as the actual
        // fulfillment channel. pricingOption/selectedPharmacy stay null
        // until that pick happens.
        SELECT_SELF_PAY: {
          target: "copayEnrolled",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, copayEnrolled: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_SELF_PAY', 'patient', 9)],
          }),
        },
      },
    },
    // Reached only via SELECT_SELF_PAY above (Copay enrollment) — the
    // patient is enrolled (copayEnrolled: true, see WorkflowEngine's
    // derivePatientRoute: pricingOption is still null here, so it correctly
    // routes back to /benefit-pricing, now showing only Retail/Mail Order at
    // the discounted Copay rates — see BenefitPricing.tsx's isCopayWorkflow
    // branch). SELECT_PRICING_OPTION here reuses the exact same event
    // Retail/Mail dispatch directly from paApprovedOtpVerified, just from a
    // different state, and lands in the same pricingSelected state they'd
    // reach either way — copayEnrolled carries forward via the ...context
    // spread below, so DeliveryDate.tsx's skipPayment and CRM Index.tsx's
    // Cash Offer label can still tell a direct Retail/Mail pick apart from
    // an enrolled-then-picked one.
    copayEnrolled: {
      on: {
        SELECT_PRICING_OPTION: {
          target: "pricingSelected",
          actions: assign({
            workflowData: ({ context, event }) => ({
              ...context.workflowData,
              pricingOption: event.option,
              selectedPharmacy: event.option === "retail" ? RETAIL_PHARMACY : MAIL_ORDER_PHARMACY,
            }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_PRICING_OPTION', 'patient', 9)],
          }),
        },
      },
    },
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
        // SELECT_PRICING_OPTION/SELECT_SELF_PAY above) — well before the
        // patient sets an address. The CRM's Dispatch to Triage tab lets
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
        // Real payment for the self-pay/Copay path, fired from the payment
        // screen after address + date (nothing currently dispatches
        // PATIENT_SETS_ADDRESS, so the machine is still sitting here at that
        // point — see DeliveryPayment.tsx). Retail/Mail never dispatch
        // these, so cashOfferStatus/paymentVerified correctly stay
        // untouched for them.
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
    paDenied: {
      on: {
        SEND_CASH_OFFER: {
          target: "cashOfferSent",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, cashOfferStatus: "sent" }),
            events: ({ context }) => [...context.events, createEvent(context, 'SEND_CASH_OFFER', 'crm', 9)],
          }),
        },
      },
    },
    cashOfferSent: {
      on: {
        PATIENT_PAYS: {
          target: "paymentProcessed",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, cashOfferStatus: "paid" }),
            events: ({ context }) => [...context.events, createEvent(context, 'PATIENT_PAYS', 'patient', 9)],
          }),
        },
      },
    },
    paymentProcessed: {
      on: {
        VERIFY_PAYMENT: {
          target: "paymentVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, paymentVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_PAYMENT', 'crm', 9)],
          }),
        },
      },
    },
    paymentVerified: {
      on: {
        PATIENT_SETS_ADDRESS: {
          target: "addressSet",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, dispatchStatus: "selected" }),
            events: ({ context }) => [...context.events, createEvent(context, 'PATIENT_SETS_ADDRESS', 'patient', 9)],
          }),
        },
        // Same reasoning as pricingSelected's FILL_RX/SELECT_PHARMACY —
        // pharmacy is already assigned by the time this state is reached.
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
        // The CRM's Dispatch to Triage tab (TP-14277, reused from WF1 — see
        // Index.tsx's STAGES_LIVE) shows "Dispatch to Pharmacy" as soon as
        // dispatchStatus is "selected", which happens here as soon as the
        // address is set — the patient doesn't have to have picked a ship
        // date yet for HUB staff to kick off fill. Matches
        // workflowMachine.ts's updatePharmacyProcessing exactly (pharmacyStatus
        // + dispatchStatus flip together).
        FILL_RX: {
          target: "rxProcessing",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
            events: ({ context }) => [...context.events, createEvent(context, 'FILL_RX', 'field', 10)],
          }),
        },
        // Lets HUB staff override the auto-assigned pharmacy from the same
        // "Choose Pharmacy" modal WF1 uses on that tab.
        SELECT_PHARMACY: {
          actions: assign({
            workflowData: ({ context, event }) => ({ ...context.workflowData, selectedPharmacy: event.pharmacy }),
            events: ({ context }) => [...context.events, createEvent(context, 'SELECT_PHARMACY', 'crm', 5)],
          }),
        },
        // Defensive duplicate of pricingSelected's payment handlers — same
        // reasoning, in case address ever does get dispatched for real.
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
        // Same FILL_RX/SELECT_PHARMACY handlers as addressSet — see the
        // comments there. dispatchStatus is already "selected" by the time
        // this state is reached, so the CRM behaves identically whether
        // staff dispatches to pharmacy before or after the patient picks a
        // ship date.
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
        // Defensive duplicate of pricingSelected's payment handlers — same
        // reasoning, in case ship date ever does get dispatched for real.
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
    // Mirrors workflowMachine.ts's order sub-machine exactly: processing →
    // ready → shipped → delivered. The Pharmacy Status (PS-14278) tab's
    // "Advance Pharmacy Status" panel — shared verbatim between WF1 and
    // CoA_Copay — dispatches READY_RX from its "Mark as Received at Pharmacy"
    // button, so this step is required, not optional.
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
  },
});
