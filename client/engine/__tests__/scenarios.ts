/**
 * Event lists for every flow and branch the demo supports today.
 *
 * Each list is what the UI dispatches, in order, for that story. Several of
 * these decisions (which BI result to send, approve or deny the PA) currently
 * live in React effects in portals/crm/pages/Index.tsx, not in the machines.
 * They are written out here so the refactor can move them into scenario
 * definitions and prove nothing changed.
 *
 * After the refactor, each entry becomes a scenario test (CLAUDE.md rule 8).
 */
import type { FlowType, WorkflowData } from "@/engine/types";
import type { Step } from "./harness";

const PHARMACY = {
  name: "Test Pharmacy",
  address: "1 Main St",
  city: "Orlando",
  state: "FL",
  zip: "32801",
  phone: "(555) 555-0100",
};

const verifyIdentity: Step[] = [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];
const fulfillment: Step[] = [{ type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" }];
const addressAndDate: Step[] = [{ type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" }];
const paApprovedReverify: Step[] = [{ type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }];

/**
 * Named end states (CLAUDE.md rule 8). A scenario's event list must reach one. A golden path that ends
 * somewhere else, or stops early, fails. Each end state is a test of the data, not of a screen.
 */
export const END_STATES = {
  /** The Rx was delivered. */
  delivered: (d: WorkflowData) => d.pharmacyStatus === "delivered",
  /** The PA was denied and the scenario stops there. */
  pa_denied: (d: WorkflowData) => d.paStatus === "denied" && d.pharmacyStatus === "none",
  /** The Rx went to the DME provider, and the patient verified the transfer SMS. */
  provider_transferred: (d: WorkflowData) => d.dmeProviderTransferStatus === "notified" && d.dmeTransferSmsVerified,
} as const;

export type EndState = keyof typeof END_STATES;

export interface Scenario {
  /** Fixture file name and test title. */
  name: string;
  /** The named end state the steps must reach. */
  endsAt: EndState;
  flowType: FlowType;
  /** Fork picks the run starts with, as a demo in a brand file would pass them. */
  choices?: Record<string, string>;
  steps: Step[];
  /** Step indexes the machine is expected to ignore (no transition). Everything else must be accepted. */
  ignored?: number[];
}

export const SCENARIOS: Scenario[] = [
  // ── Standard (fax) and PAP. BI starts when the patient consents, so no RUN_BI step. ──
  {
    name: "fax-standard-pa-approved",

    endsAt: "delivered",
    flowType: "Fax_QS_PA_Approved",
    steps: [
      { type: "REFERRAL_RECEIVED" }, { type: "INVITE" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "SUBMIT_PA" }, { type: "APPROVE_PA" },
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...fulfillment,
    ],
  },
  {
    name: "fax-standard-pa-denied",

    endsAt: "pa_denied",
    flowType: "Fax_QS_PA_Approved",
    steps: [
      { type: "REFERRAL_RECEIVED" }, { type: "INVITE" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "SUBMIT_PA" }, { type: "DENY_PA" },
    ],
  },
  {
    name: "fax-pap-audit",

    endsAt: "delivered",
    flowType: "Fax_PAP_Audit",
    steps: [
      { type: "REFERRAL_RECEIVED" }, { type: "INVITE" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "no_insurance" },
      { type: "SEND_PAP_SMS" }, { type: "VERIFY_PAP_SMS" }, { type: "VERIFY_PAP_OTP" },
      { type: "START_INCOME_QUALIFICATION" }, { type: "VERIFY_INCOME" },
      ...addressAndDate,
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...fulfillment,
    ],
  },

  // ── CoAssist: DTP ────────────────────────────────────────────────────
  {
    name: "coa-dtp-pa-approved-retail",

    endsAt: "delivered",
    flowType: "CoA_DTP",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "APPROVE_PA" }, ...paApprovedReverify,
      { type: "SELECT_PRICING_OPTION", option: "retail" },
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...addressAndDate, ...fulfillment,
    ],
  },
  {
    // BI and PA run off the eRx alone, so the PA can be approved while the patient is still
    // enrolling. They are in the app, so after they consent they go straight to pricing: no
    // PA-approved SMS and no second one-time code.
    name: "coa-dtp-pa-approved-before-patient-consent",

    endsAt: "delivered",
    flowType: "CoA_DTP",
    steps: [
      { type: "REFERRAL_RECEIVED" },
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "APPROVE_PA" },
      ...verifyIdentity,
      { type: "SELECT_PRICING_OPTION", option: "retail" },
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...addressAndDate, ...fulfillment,
    ],
  },
  {
    name: "coa-dtp-pa-approved-self-pay",

    endsAt: "delivered",
    flowType: "CoA_DTP",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "APPROVE_PA" }, ...paApprovedReverify,
      { type: "SELECT_SELF_PAY" },
      ...addressAndDate, ...fulfillment,
    ],
  },
  {
    name: "coa-dtp-pa-denied-cash-offer",

    endsAt: "delivered",
    flowType: "CoA_DTP",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "DENY_PA" },
      { type: "SEND_CASH_OFFER" }, { type: "PATIENT_PAYS" }, { type: "VERIFY_PAYMENT" },
      ...addressAndDate, ...fulfillment,
    ],
  },

  // ── CoAssist: Copay ──────────────────────────────────────────────────
  {
    name: "coa-copay-enroll-then-mail-order",

    endsAt: "delivered",
    flowType: "CoA_Copay",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "APPROVE_PA" }, ...paApprovedReverify,
      { type: "SELECT_SELF_PAY" },
      { type: "SELECT_PRICING_OPTION", option: "mail_order" },
      ...addressAndDate, ...fulfillment,
    ],
  },
  {
    name: "coa-copay-direct-retail",

    endsAt: "delivered",
    flowType: "CoA_Copay",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "APPROVE_PA" }, ...paApprovedReverify,
      { type: "SELECT_PRICING_OPTION", option: "retail" },
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...addressAndDate, ...fulfillment,
    ],
  },

  // ── CoAssist: DME (three BI outcomes) ───────────────────────────────
  {
    name: "coa-dme-1-pharmacy-covered",

    endsAt: "delivered",
    flowType: "CoA_DME",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" },
      { type: "APPROVE_PA" }, ...paApprovedReverify,
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...fulfillment,
    ],
  },
  {
    // BI finds pharmacy coverage, so a PA is required and starts on its own. The PA is approved. The scenario assigns
    // the pharmacy, so the patient never picks one: after the PA-approved OTP the Rx is handed over and fulfillment follows.
    name: "coa-pharmacy-transfer",
    endsAt: "delivered",
    flowType: "CoA_DME",
    choices: { bi: "pharmacy_transfer", pa: "approved" },
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" },
      { type: "APPROVE_PA" }, ...paApprovedReverify,
      ...fulfillment,
    ],
  },
  {
    name: "coa-dme-2-medical-covered-provider-transfer",

    endsAt: "provider_transferred",
    flowType: "CoA_DME",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered" },
      { type: "NOTIFY_PROVIDER_TRANSFER" }, { type: "VERIFY_DME_TRANSFER_SMS" },
    ],
  },
  {
    name: "coa-dme-3-no-coverage-cash-pay",

    endsAt: "delivered",
    flowType: "CoA_DME",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" },
      { type: "VERIFY_CASH_OFFER_SMS" }, { type: "SELECT_SELF_PAY" },
      { type: "PATIENT_PAYS" }, { type: "VERIFY_PAYMENT" },
      ...addressAndDate, ...fulfillment,
    ],
  },

  // ── iAssist ──────────────────────────────────────────────────────────
  // BI starts with the referral. A BI that requires a PA submits it. No RUN_BI or SUBMIT_PA steps.
  {
    name: "iassist-pa-approved",

    endsAt: "delivered",
    flowType: "iAssist_PA_Approved",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "APPROVE_PA" }, ...paApprovedReverify,
      { type: "SELECT_PRICING_OPTION", option: "retail" },
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...addressAndDate, ...fulfillment,
    ],
  },
  {
    // The PA is approved while the patient is still enrolling. They are in the app, so after they consent
    // they go straight to pricing: no PA-approved SMS and no second one-time code.
    name: "iassist-pa-approved-before-patient-consent",

    endsAt: "delivered",
    flowType: "iAssist_PA_Approved",
    steps: [
      { type: "REFERRAL_RECEIVED" },
      { type: "COMPLETE_BI", result: "coverage_found" }, { type: "APPROVE_PA" },
      ...verifyIdentity,
      { type: "SELECT_SELF_PAY" },
      ...addressAndDate,
      { type: "PATIENT_PAYS" }, { type: "VERIFY_PAYMENT" },
      ...fulfillment,
    ],
  },
  {
    name: "iassist-pa-denied-appeal",

    endsAt: "delivered",
    flowType: "iAssist_PAP",
    steps: [
      { type: "REFERRAL_RECEIVED" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "coverage_found" },
      { type: "DENY_PA" }, { type: "INITIATE_APPEAL" }, { type: "APPROVE_APPEAL" },
      { type: "PATIENT_SELECTS_INFUSION_DATE" },
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...fulfillment,
    ],
  },

  // ── Provider e-sign (placeholder, reuses PAP shape) ─────────────────
  {
    name: "pres-pap",

    endsAt: "delivered",
    flowType: "PrES_PAP",
    steps: [
      { type: "REFERRAL_RECEIVED" }, { type: "INVITE" }, ...verifyIdentity,
      { type: "COMPLETE_BI", result: "no_insurance" },
      { type: "SEND_PAP_SMS" }, { type: "VERIFY_PAP_SMS" },
      { type: "START_INCOME_QUALIFICATION" }, { type: "VERIFY_INCOME" },
      ...addressAndDate,
      { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
      ...fulfillment,
    ],
  },
];
