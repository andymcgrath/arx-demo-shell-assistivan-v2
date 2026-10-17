/**
 * CoAssist rules: the ordered transition table shared by CoA_DTP, CoA_Copay,
 * and CoA_DME. Replaces three copied 700-line machines (coaDtp, coaCopay,
 * coaDme).
 *
 * Reading a rule: `when` is the precondition on workflowData, `set` is what
 * changes, `emit` is what lands in the event log (which Field notification
 * emails read). A rule with `scenarios` applies only to those scenarios.
 * For one event the first matching rule wins, so order matters.
 *
 * Onboarding (SMS, OTP, consent), BI, and PA are independent timelines. Each
 * rule checks only the data it needs, so BI or PA may race ahead of the
 * patient's own onboarding without stranding it.
 */
import type { WorkflowData } from "@/engine/types";
import type { Rule } from "@/engine/workflow/types";
import type { CoassistContent } from "./scenarios";

type CoaRule = Rule<any, CoassistContent>;

const nowIso = () => new Date().toISOString();

/** Order tail: pricing is chosen (or payment cleared) and Rx is not yet in fulfillment. */
const inFulfillmentTail = (d: WorkflowData) =>
  d.pharmacyStatus === "none" && (d.pricingOption !== null || d.dispatchStatus !== "none" || d.paymentVerified);

/** CoA_DME BI outcome. Medical benefit always wins when covered. */
export function deriveBiResult(
  pharmacyBenefitStatus: "covered" | "not_covered",
  medicalBenefitStatus: "covered" | "not_covered",
): string {
  if (medicalBenefitStatus === "covered") return "dme_covered";
  if (pharmacyBenefitStatus === "covered") return "coverage_found";
  return "no_coverage";
}

const dmeNeitherCovered = (d: WorkflowData) =>
  d.pharmacyBenefitStatus === "not_covered" && d.medicalBenefitStatus === "not_covered";

const DTP_COPAY = ["CoA_DTP", "CoA_Copay"] as const;

/** How long the CRM shows a stage as "working" before the result lands. */
const REVEAL_MS = 3000;

export const COASSIST_RULES: CoaRule[] = [
  // ── Enrollment and patient onboarding ──────────────────────────────
  {
    on: "REFERRAL_RECEIVED",
    when: (d) => d.enrollmentStatus === "none",
    set: () => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true }),
    emit: { portal: "crm", step: 1 },
    // BI runs off the eRx alone. It does not wait for the patient.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
  {
    on: "VERIFY_SMS",
    when: (d) => d.enrollmentStatus === "enrolled" && !d.smsVerified,
    set: () => ({ smsVerified: true }),
    emit: { portal: "patient", step: 3 },
  },
  {
    on: "VERIFY_OTP",
    when: (d) => d.smsVerified && !d.otpVerified,
    set: () => ({ otpVerified: true }),
    emit: { portal: "patient", step: 4 },
  },
  {
    // If the PA was approved while the patient was still enrolling, they are already in the app
    // (and already verified), so they go straight to pricing. The PA-approved SMS and one-time code
    // exist for a patient who is away when the decision lands.
    on: "CONFIRM_CONSENT",
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: (d) => ({
      consentStatus: "confirmed",
      ...(d.paStatus === "approved" ? { paApprovedSmsVerified: true, paApprovedOtpVerified: true } : {}),
    }),
    emit: { portal: "patient", step: 5 },
  },

  // ── Benefits Investigation ─────────────────────────────────────────
  {
    on: "RUN_BI",
    when: (d) => d.enrollmentStatus === "enrolled" && d.biStatus === "none",
    set: () => ({ biStatus: "running" }),
    emit: { portal: "analytics", step: 6 },
  },
  {
    on: "COMPLETE_BI",
    scenarios: [...DTP_COPAY],
    when: (d) => d.biStatus === "running",
    set: (_d, e, s) => ({ biStatus: "complete", biResult: e.result ?? s.content.biResult }),
    emit: { portal: "analytics", step: 7 },
    // The eRx holds everything the PA needs, so it starts on its own. SUBMIT_PA checks the BI result.
    then: { trigger: "system", send: () => ({ type: "SUBMIT_PA" }) },
  },
  {
    // DME: one BI resolves to one of three coverage outcomes.
    on: "COMPLETE_BI",
    scenarios: ["CoA_DME"],
    when: (d) => d.biStatus === "running",
    set: (_d, e) => ({
      biStatus: "complete",
      pharmacyBenefitStatus: e.pharmacyBenefitStatus,
      medicalBenefitStatus: e.medicalBenefitStatus,
      biResult: deriveBiResult(e.pharmacyBenefitStatus, e.medicalBenefitStatus),
      // Neither covered: the cash-offer SMS goes out automatically.
      cashOfferSmsSent: e.pharmacyBenefitStatus === "not_covered" && e.medicalBenefitStatus === "not_covered",
    }),
    emit: [
      { portal: "analytics", step: 7 },
      { type: "SEND_CASH_OFFER_SMS", portal: "crm", step: 9, when: dmeNeitherCovered },
    ],
    // Only "pharmacy covered, medical not" needs a PA. SUBMIT_PA ignores the other outcomes.
    then: { trigger: "system", send: () => ({ type: "SUBMIT_PA" }) },
  },

  // ── Agent-driven reveals ───────────────────────────────────────────
  // The CRM reports "the agent is looking at this stage" (VIEW_STAGE) and "left it" (LEAVE_STAGE).
  // The machine owns the delay and the outcome. Leaving the stage cancels a pending reveal.
  {
    on: "VIEW_STAGE",
    scenarios: [...DTP_COPAY],
    when: (d, e) => e.stage === "BI" && d.biStatus === "running",
    then: {
      trigger: "agent",
      id: "bi-reveal",
      after: REVEAL_MS,
      send: (_d, _e, s) => ({ type: "COMPLETE_BI", result: s.content.biResult }),
    },
  },
  {
    // DME: the presenter picks the BI outcome on the CRM and the stage view carries it.
    on: "VIEW_STAGE",
    scenarios: ["CoA_DME"],
    when: (d, e) => e.stage === "BI" && d.biStatus === "running",
    then: {
      trigger: "agent",
      id: "bi-reveal",
      after: REVEAL_MS,
      send: (_d, e) => ({
        type: "COMPLETE_BI",
        pharmacyBenefitStatus: e.pharmacyBenefitStatus,
        medicalBenefitStatus: e.medicalBenefitStatus,
      }),
    },
  },
  {
    on: "VIEW_STAGE",
    when: (d, e) => e.stage === "PA" && d.paStatus === "submitted",
    then: {
      trigger: "agent",
      id: "pa-decision",
      after: REVEAL_MS,
      send: (_d, _e, s) => ({ type: s.content.paOutcome === "denied" ? "DENY_PA" : "APPROVE_PA" }),
    },
  },
  {
    on: "VIEW_STAGE",
    scenarios: ["CoA_DME"],
    when: (d, e) => e.stage === "DME_TRANSFER" && d.biStatus === "complete" && d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus === "none",
    then: { trigger: "agent", id: "dme-transfer", after: REVEAL_MS, send: () => ({ type: "NOTIFY_PROVIDER_TRANSFER" }) },
  },
  { on: "LEAVE_STAGE", when: (_d, e) => e.stage === "BI", cancel: ["bi-reveal"] },
  { on: "LEAVE_STAGE", when: (_d, e) => e.stage === "PA", cancel: ["pa-decision"] },
  { on: "LEAVE_STAGE", when: (_d, e) => e.stage === "DME_TRANSFER", cancel: ["dme-transfer"] },

  // ── Prior Authorization ────────────────────────────────────────────
  {
    on: "SUBMIT_PA",
    scenarios: [...DTP_COPAY],
    // A PA needs a completed BI whose result says one is required.
    when: (d) => d.biStatus === "complete" && d.biResult === "coverage_found" && d.paStatus === "none",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    // DME: a PA is needed only when the pharmacy benefit covers and the medical benefit does not.
    on: "SUBMIT_PA",
    scenarios: ["CoA_DME"],
    when: (d) =>
      d.biStatus === "complete" &&
      d.paStatus === "none" &&
      d.pharmacyBenefitStatus === "covered" &&
      d.medicalBenefitStatus !== "covered",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    on: "APPROVE_PA",
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "approved", paApprovedAt: nowIso() }),
    emit: { portal: "provider", step: 9 },
  },
  {
    // DME has no denial branch: the PA is a formality.
    on: "DENY_PA",
    scenarios: [...DTP_COPAY],
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "denied" }),
    emit: { portal: "provider", step: 9 },
  },
  {
    // Pricing options go to the patient only after enrollment is complete. The PA can be approved
    // earlier (BI and PA run off the eRx alone), but the patient hears about it after they consent.
    on: "VERIFY_PA_APPROVED_SMS",
    when: (d) => d.paStatus === "approved" && d.consentStatus === "confirmed" && !d.paApprovedSmsVerified,
    set: () => ({ paApprovedSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "VERIFY_PA_APPROVED_OTP",
    when: (d) => d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
    set: () => ({ paApprovedOtpVerified: true }),
    emit: { portal: "patient", step: 9 },
  },

  // ── DME: provider transfer (medical benefit covered) ───────────────
  {
    on: "NOTIFY_PROVIDER_TRANSFER",
    scenarios: ["CoA_DME"],
    when: (d) => d.biStatus === "complete" && d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus === "none",
    set: () => ({ dmeProviderTransferStatus: "notified", dmeTransferSmsSent: true }),
    emit: { portal: "crm", step: 9 },
  },
  {
    on: "VERIFY_DME_TRANSFER_SMS",
    scenarios: ["CoA_DME"],
    when: (d) => d.dmeTransferSmsSent && !d.dmeTransferSmsVerified,
    set: () => ({ dmeTransferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },

  // ── DME: cash offer by SMS (neither benefit covered) ───────────────
  {
    on: "VERIFY_CASH_OFFER_SMS",
    scenarios: ["CoA_DME"],
    when: (d) => d.cashOfferSmsSent && !d.cashOfferSmsVerified,
    set: () => ({ cashOfferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Pricing and pharmacy choice ────────────────────────────────────
  {
    on: "SELECT_PRICING_OPTION",
    scenarios: [...DTP_COPAY],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, e, s) => ({
      pricingOption: e.option,
      selectedPharmacy: e.option === "retail" ? s.content.retail : s.content.mailOrder,
    }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // DTP: cash pay through CoAssist's own pharmacy.
    on: "SELECT_SELF_PAY",
    scenarios: ["CoA_DTP"],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, _e, s) => ({ pricingOption: "self_pay", selectedPharmacy: s.content.selfPay }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // Copay: enrolling only unlocks the reduced price. The patient still picks Retail or Mail Order next.
    on: "SELECT_SELF_PAY",
    scenarios: ["CoA_Copay"],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null && !d.copayEnrolled,
    set: () => ({ copayEnrolled: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // DME: cash pay after the cash-offer SMS.
    on: "SELECT_SELF_PAY",
    scenarios: ["CoA_DME"],
    when: (d) => d.cashOfferSmsVerified && d.pricingOption === null,
    set: (_d, _e, s) => ({ pricingOption: "self_pay", selectedPharmacy: s.content.selfPay }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // DME: one tap picks a network pharmacy and sets pricing in the same action. Must come before the generic SELECT_PHARMACY.
    on: "SELECT_PHARMACY",
    scenarios: ["CoA_DME"],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, e) => ({ pricingOption: "retail", selectedPharmacy: e.pharmacy }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "SELECT_PHARMACY",
    when: inFulfillmentTail,
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy }),
    emit: { portal: "crm", step: 5 },
  },

  // ── Cash offer and payment (representative only, no real payment) ──
  {
    on: "SEND_CASH_OFFER",
    scenarios: [...DTP_COPAY],
    when: (d) => d.paStatus === "denied" && d.cashOfferStatus === "none",
    set: () => ({ cashOfferStatus: "sent" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    on: "PATIENT_PAYS",
    when: (d) => d.cashOfferStatus !== "paid" && (d.cashOfferStatus === "sent" || inFulfillmentTail(d)),
    set: () => ({ cashOfferStatus: "paid" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "VERIFY_PAYMENT",
    when: (d) => !d.paymentVerified && d.pharmacyStatus === "none" && (d.cashOfferStatus === "paid" || inFulfillmentTail(d)),
    set: () => ({ paymentVerified: true }),
    emit: { portal: "crm", step: 9 },
  },

  // ── Delivery details ───────────────────────────────────────────────
  {
    on: "PATIENT_SETS_ADDRESS",
    when: (d) => d.dispatchStatus === "none" && inFulfillmentTail(d),
    set: () => ({ dispatchStatus: "selected" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "PATIENT_SELECTS_SHIP_DATE",
    when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null && d.pharmacyStatus === "none",
    set: () => ({ patientShipDate: nowIso() }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Fulfillment ────────────────────────────────────────────────────
  {
    on: "FILL_RX",
    when: inFulfillmentTail,
    set: () => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
    emit: { portal: "field", step: 10 },
  },
  {
    on: "READY_RX",
    when: (d) => d.pharmacyStatus === "processing",
    set: () => ({ pharmacyStatus: "ready" }),
    emit: { portal: "field", step: 10 },
  },
  {
    on: "SHIP_RX",
    when: (d) => d.pharmacyStatus === "ready",
    set: () => ({ pharmacyStatus: "shipped" }),
    emit: { portal: "field", step: 11 },
  },
  {
    on: "DELIVER_RX",
    when: (d) => d.pharmacyStatus === "shipped",
    set: () => ({ pharmacyStatus: "delivered" }),
    emit: { portal: "field", step: 12 },
  },
];
