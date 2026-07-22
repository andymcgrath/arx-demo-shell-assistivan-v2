import { setup, assign } from "xstate";
import type { MachineContext, DemoEvent, Pharmacy, WorkflowData } from "@/engine/types";

// Full contact details (not just a name) so the CRM's shared "Triage
// Pharmacy Details" card — reused from WF1's Dispatch to Triage stage, see
// Index.tsx's STAGES_LIVE — doesn't render blank address/phone fields for
// CoA_DTP cases.
const RETAIL_PHARMACY: Pharmacy = { name: "CVS Pharmacy #3795", address: "1450 Riverside Drive", city: "Fairview", state: "TX", zip: "75069", phone: "(972) 555-0142" };
const MAIL_ORDER_PHARMACY: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };
const SELF_PAY_PHARMACY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

const INITIAL_WORKFLOW_DATA: WorkflowData = {
  flowType: "CoA_DTP",
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
  paApprovedSmsVerified: false,
  paApprovedOtpVerified: false,
}

const initialContext: MachineContext = {
  workflowData: { ...INITIAL_WORKFLOW_DATA },
  events: [],
  _snapshots: [],
};

// Mirrors workflowMachine.ts's createEvent exactly — every transition below
// appends one of these to context.events, which is the only thing Field
// Portal's email notifications (getGeneratedEmails, WorkflowEngine.ts) read
// from. Before this, none of CoA_DTP's transitions touched context.events
// at all (every action only ever assigned workflowData), so events stayed
// permanently empty and the Field Portal inbox looked empty for the entire
// WF3 flow no matter how far the demo progressed.
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

export const coaDtpMachine = setup({
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
  id: "coaDtp",
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
    enrolled: {
      on: {
        VERIFY_SMS: {
          target: "smsVerified",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, smsVerified: true }),
            events: ({ context }) => [...context.events, createEvent(context, 'VERIFY_SMS', 'patient', 3)],
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
      },
    },
    consentConfirmed: {
      on: {
        RUN_BI: {
          target: "biRunning",
          actions: assign({
            workflowData: ({ context }) => ({ ...context.workflowData, biStatus: "running" }),
            events: ({ context }) => [...context.events, createEvent(context, 'RUN_BI', 'analytics', 6)],
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
        // Kept for demo flexibility — CoA_DTP's live flow always approves
        // (see CRM Index.tsx), but the denial → cash-offer chain below is
        // still fully wired if a future scenario needs it.
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
        // Copay Program instead of picking Retail/Mail. Enrollment just
        // records the choice (unlocks the reduced price) — it is NOT
        // payment. It joins the same pricingSelected state Retail/Mail use,
        // so it goes through the identical address/date flow; the actual
        // charge happens later at the payment step (PATIENT_PAYS/
        // VERIFY_PAYMENT, handled below in pricingSelected).
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
    // CoA_DTP — dispatches READY_RX from its "Mark as Received at Pharmacy"
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
