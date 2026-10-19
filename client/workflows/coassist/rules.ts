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
import type { ForkExit, Rule } from "@/engine/workflow/types";
import { exitFor, forkApplies } from "@/engine/workflow/forks";
import { COPAY_FORK, PA_FORK, biForkFor, pricingForkFor } from "./forks";
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

/** A scenario that assigns the pharmacy hands the Rx over as soon as the PA approval is verified. No patient choice. */
const assignment = (d: WorkflowData, s: { content: CoassistContent }) =>
  d.pharmacyAssigned ? { pricingOption: "retail" as const, selectedPharmacy: s.content.transferPharmacy } : {};

const DTP_COPAY = ["CoA_DTP", "CoA_Copay"] as const;

/** The scenario content that names the pharmacy for each `pricing` exit. Exit data is static, so content supplies it. */
const PRICING_PHARMACY: Record<string, "retail" | "mailOrder" | "selfPay"> = {
  retail: "retail",
  mail_order: "mailOrder",
  self_pay: "selfPay",
};

/** The scenario's own `pricing` exit for what the patient picked, or undefined when it has no such exit. */
const pricingExit = (d: WorkflowData, option: unknown): ForkExit | undefined =>
  pricingForkFor(d.flowType)?.exits.find((e) => e.id === option);

/** What a pricing pick sets: the exit's data, plus the pharmacy that exit names in the scenario's content. */
const pricingPick = (exit: ForkExit, s: { content: CoassistContent }) => ({
  ...exit.data,
  selectedPharmacy: s.content[PRICING_PHARMACY[exit.id]],
});

/**
 * A recipe or a demo can pin the patient's picks (`choices.copay`, `choices.pricing`). They apply the moment the PA
 * approval is verified, so the patient skips the menu, the same way an assigned pharmacy skips selection. A pin that
 * names no real exit was dropped when the run started. With no pin this returns nothing, so the menu shows as before.
 * A pinned Retail uses the scenario's default retail pharmacy. The patient did not choose a store.
 * An exit marked `confirm` (the self-pay offer) is not applied here. The route sends the patient to its screen,
 * and accepting it there sends SELECT_SELF_PAY.
 */
function prePicked(d: WorkflowData, s: { content: CoassistContent }): Partial<WorkflowData> {
  const enroll = forkApplies(COPAY_FORK, d.flowType) && d.choices?.copay === "enroll" ? COPAY_FORK.exits.find((e) => e.id === "enroll")!.data : {};
  const exit = d.choices?.pricing ? pricingExit(d, d.choices.pricing) : undefined;
  return { ...enroll, ...(exit && !exit.confirm ? pricingPick(exit, s) : {}) };
}

/** How long the CRM shows a stage as "working" before the result lands. */
const REVEAL_MS = 3000;

export const COASSIST_RULES: CoaRule[] = [
  // ── Enrollment and patient onboarding ──────────────────────────────
  {
    id: "enrollment.referral_received",
    on: "REFERRAL_RECEIVED",
    when: (d) => d.enrollmentStatus === "none",
    set: () => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true }),
    emit: { portal: "crm", step: 1 },
    // BI runs off the eRx alone. It does not wait for the patient.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
  {
    id: "enrollment.verify_sms",
    on: "VERIFY_SMS",
    when: (d) => d.enrollmentStatus === "enrolled" && !d.smsVerified,
    set: () => ({ smsVerified: true }),
    emit: { portal: "patient", step: 3 },
  },
  {
    id: "enrollment.verify_otp",
    on: "VERIFY_OTP",
    when: (d) => d.smsVerified && !d.otpVerified,
    set: () => ({ otpVerified: true }),
    emit: { portal: "patient", step: 4 },
  },
  {
    // If the PA was approved while the patient was still enrolling, they are already in the app
    // (and already verified), so they go straight to pricing. The PA-approved SMS and one-time code
    // exist for a patient who is away when the decision lands.
    id: "enrollment.confirm_consent",
    on: "CONFIRM_CONSENT",
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: (d, _e, s) => ({
      consentStatus: "confirmed",
      ...(d.paStatus === "approved"
        ? { paApprovedSmsVerified: true, paApprovedOtpVerified: true, ...assignment(d, s), ...prePicked(d, s) }
        : {}),
    }),
    emit: { portal: "patient", step: 5 },
  },

  // ── Benefits Investigation ─────────────────────────────────────────
  {
    id: "spine.run_bi",
    on: "RUN_BI",
    when: (d) => d.enrollmentStatus === "enrolled" && d.biStatus === "none",
    set: () => ({ biStatus: "running" }),
    emit: { portal: "analytics", step: 6 },
  },
  {
    // One BI resolves to the exit the scenario's `bi` fork picked (forks.ts). An event that carries a result (DTP and
    // Copay) or the two benefit statuses (DME) still wins, so a replay or a test can force one.
    id: "spine.complete_bi",
    on: "COMPLETE_BI",
    when: (d) => d.biStatus === "running",
    set: (d, e) => {
      const chosen = exitFor(biForkFor(d.flowType), d).data;
      // DTP and Copay exits carry a result. Only `coverage_found` means a PA is required.
      if (chosen.pharmacyBenefitStatus === undefined) return { biStatus: "complete", biResult: e.result ?? chosen.biResult };
      // DME: one BI resolves to one of four coverage outcomes. Their exits carry the two benefit statuses.
      const pharmacy = e.pharmacyBenefitStatus ?? chosen.pharmacyBenefitStatus;
      const medical = e.medicalBenefitStatus ?? chosen.medicalBenefitStatus;
      return {
        biStatus: "complete",
        pharmacyBenefitStatus: pharmacy,
        medicalBenefitStatus: medical,
        biResult: deriveBiResult(pharmacy, medical),
        // The pharmacy_transfer exit: pharmacy covers, so the Rx goes to an assigned pharmacy, not the patient's pick.
        pharmacyAssigned: pharmacy === "covered" && medical !== "covered" && !!chosen.pharmacyAssigned,
        // Neither covered: the cash-offer SMS goes out automatically.
        cashOfferSmsSent: pharmacy === "not_covered" && medical === "not_covered",
      };
    },
    emit: [
      { portal: "analytics", step: 7 },
      { type: "SEND_CASH_OFFER_SMS", portal: "crm", step: 9, when: dmeNeitherCovered },
    ],
    // The eRx holds everything the PA needs, so it starts on its own. SUBMIT_PA checks the BI result:
    // DTP and Copay need `coverage_found`, and DME needs "pharmacy covered, medical not". It ignores the rest.
    then: { trigger: "system", send: () => ({ type: "SUBMIT_PA" }) },
  },

  // ── Agent-driven reveals ───────────────────────────────────────────
  // The CRM reports "the agent is looking at this stage" (VIEW_STAGE) and "left it" (LEAVE_STAGE).
  // The machine owns the delay and the outcome. Leaving the stage cancels a pending reveal.
  {
    // The BI result lands after a delay once the agent opens the BI stage. The `bi` fork's exit decides it. DME's stage
    // event may also carry the statuses the presenter picked on the CRM, which COMPLETE_BI prefers.
    id: "spine.view_stage.bi",
    on: "VIEW_STAGE",
    snapshot: false,
    when: (d, e) => e.stage === "BI" && d.biStatus === "running",
    then: {
      trigger: "agent",
      id: "bi-reveal",
      after: REVEAL_MS,
      send: (d, e) => ({
        type: "COMPLETE_BI",
        result: exitFor(biForkFor(d.flowType), d).data.biResult,
        pharmacyBenefitStatus: e.pharmacyBenefitStatus,
        medicalBenefitStatus: e.medicalBenefitStatus,
      }),
    },
  },
  {
    id: "spine.view_stage.pa",
    on: "VIEW_STAGE",
    snapshot: false,
    when: (d, e) => e.stage === "PA" && d.paStatus === "submitted",
    then: {
      trigger: "agent",
      id: "pa-decision",
      after: REVEAL_MS,
      // The `pa` fork's exit decides the outcome. DME pins `approved`.
      send: (d) => ({ type: exitFor(PA_FORK, d).id === "denied" ? "DENY_PA" : "APPROVE_PA" }),
    },
  },
  {
    id: "provider_transfer.view_stage",
    on: "VIEW_STAGE",
    snapshot: false,
    scenarios: ["CoA_DME"],
    when: (d, e) => e.stage === "DME_TRANSFER" && d.biStatus === "complete" && d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus === "none",
    then: { trigger: "agent", id: "dme-transfer", after: REVEAL_MS, send: () => ({ type: "NOTIFY_PROVIDER_TRANSFER" }) },
  },
  { id: "spine.leave_stage.bi", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "BI", cancel: ["bi-reveal"] },
  { id: "spine.leave_stage.pa", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "PA", cancel: ["pa-decision"] },
  { id: "provider_transfer.leave_stage", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "DME_TRANSFER", cancel: ["dme-transfer"] },

  // ── Prior Authorization ────────────────────────────────────────────
  {
    id: "spine.submit_pa.standard",
    on: "SUBMIT_PA",
    scenarios: [...DTP_COPAY],
    // A PA needs a completed BI whose result says one is required.
    when: (d) => d.biStatus === "complete" && d.biResult === "coverage_found" && d.paStatus === "none",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    // DME: a PA is needed only when the pharmacy benefit covers and the medical benefit does not.
    id: "spine.submit_pa.dme",
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
    id: "spine.approve_pa",
    on: "APPROVE_PA",
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "approved", paApprovedAt: nowIso() }),
    emit: { portal: "provider", step: 9 },
  },
  {
    // DME has no denial branch: the PA is a formality.
    id: "cash_offer.deny_pa",
    on: "DENY_PA",
    scenarios: [...DTP_COPAY],
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "denied" }),
    emit: { portal: "provider", step: 9 },
  },
  {
    // Pricing options go to the patient only after enrollment is complete. The PA can be approved
    // earlier (BI and PA run off the eRx alone), but the patient hears about it after they consent.
    id: "pa_notification.verify_sms",
    on: "VERIFY_PA_APPROVED_SMS",
    when: (d) => d.paStatus === "approved" && d.consentStatus === "confirmed" && !d.paApprovedSmsVerified,
    set: () => ({ paApprovedSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "pa_notification.verify_otp",
    on: "VERIFY_PA_APPROVED_OTP",
    when: (d) => d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
    set: (d, _e, s) => ({ paApprovedOtpVerified: true, ...assignment(d, s), ...prePicked(d, s) }),
    emit: { portal: "patient", step: 9 },
  },

  // ── DME: provider transfer (medical benefit covered) ───────────────
  {
    id: "provider_transfer.notify",
    on: "NOTIFY_PROVIDER_TRANSFER",
    scenarios: ["CoA_DME"],
    when: (d) => d.biStatus === "complete" && d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus === "none",
    set: () => ({ dmeProviderTransferStatus: "notified", dmeTransferSmsSent: true }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "provider_transfer.verify_sms",
    on: "VERIFY_DME_TRANSFER_SMS",
    scenarios: ["CoA_DME"],
    when: (d) => d.dmeTransferSmsSent && !d.dmeTransferSmsVerified,
    set: () => ({ dmeTransferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },

  // ── DME: cash offer by SMS (neither benefit covered) ───────────────
  {
    id: "cash_offer.verify_sms",
    on: "VERIFY_CASH_OFFER_SMS",
    scenarios: ["CoA_DME"],
    when: (d) => d.cashOfferSmsSent && !d.cashOfferSmsVerified,
    set: () => ({ cashOfferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Pricing and pharmacy choice ────────────────────────────────────
  {
    // The patient picks an exit of the scenario's `pricing` fork (forks.ts). An option that is not one of its
    // exits is ignored: Copay has no self-pay exit, because enrolling in the copay program is its own fork.
    id: "payment.select_pricing_option",
    on: "SELECT_PRICING_OPTION",
    scenarios: [...DTP_COPAY],
    when: (d, e) => d.paApprovedOtpVerified && d.pricingOption === null && !!pricingExit(d, e.option),
    set: (d, e, s) => pricingPick(pricingExit(d, e.option)!, s),
    emit: { portal: "patient", step: 9 },
  },
  {
    // DTP: cash pay through CoAssist's own pharmacy. It is the `self_pay` exit of the `pricing` fork.
    id: "payment.select_self_pay.dtp",
    on: "SELECT_SELF_PAY",
    scenarios: ["CoA_DTP"],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (d, _e, s) => pricingPick(pricingExit(d, "self_pay")!, s),
    emit: { portal: "patient", step: 9 },
  },
  {
    // Copay: this is the `enroll` exit of the `copay` fork. Enrolling only unlocks the reduced price.
    // The patient still picks Retail or Mail Order next.
    id: "financial_assistance.select_self_pay.copay",
    on: "SELECT_SELF_PAY",
    scenarios: ["CoA_Copay"],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null && !d.copayEnrolled,
    set: () => COPAY_FORK.exits.find((e) => e.id === "enroll")!.data,
    emit: { portal: "patient", step: 9 },
  },
  {
    // DME: cash pay after the cash-offer SMS.
    id: "cash_offer.select_self_pay.dme",
    on: "SELECT_SELF_PAY",
    scenarios: ["CoA_DME"],
    when: (d) => d.cashOfferSmsVerified && d.pricingOption === null,
    set: (_d, _e, s) => ({ pricingOption: "self_pay", selectedPharmacy: s.content.selfPay }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // DME: one tap picks a network pharmacy and sets pricing in the same action. Must come before the generic SELECT_PHARMACY.
    id: "pharmacy_selection.select_pharmacy.dme",
    on: "SELECT_PHARMACY",
    scenarios: ["CoA_DME"],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, e) => ({ pricingOption: "retail", selectedPharmacy: e.pharmacy }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "pharmacy_selection.select_pharmacy",
    on: "SELECT_PHARMACY",
    // An assigned pharmacy (transfer branch) is not the patient's to change.
    when: (d) => !d.pharmacyAssigned && inFulfillmentTail(d),
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy }),
    emit: { portal: "crm", step: 5 },
  },

  // ── Cash offer and payment (representative only, no real payment) ──
  {
    id: "cash_offer.send_cash_offer",
    on: "SEND_CASH_OFFER",
    scenarios: [...DTP_COPAY],
    when: (d) => d.paStatus === "denied" && d.cashOfferStatus === "none",
    set: () => ({ cashOfferStatus: "sent" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "payment.patient_pays",
    on: "PATIENT_PAYS",
    when: (d) => d.cashOfferStatus !== "paid" && (d.cashOfferStatus === "sent" || inFulfillmentTail(d)),
    set: () => ({ cashOfferStatus: "paid" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "payment.verify_payment",
    on: "VERIFY_PAYMENT",
    when: (d) => !d.paymentVerified && d.pharmacyStatus === "none" && (d.cashOfferStatus === "paid" || inFulfillmentTail(d)),
    set: () => ({ paymentVerified: true }),
    emit: { portal: "crm", step: 9 },
  },

  // ── Delivery details ───────────────────────────────────────────────
  {
    id: "scheduling.patient_sets_address",
    on: "PATIENT_SETS_ADDRESS",
    when: (d) => d.dispatchStatus === "none" && inFulfillmentTail(d),
    set: () => ({ dispatchStatus: "selected" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "scheduling.patient_selects_ship_date",
    on: "PATIENT_SELECTS_SHIP_DATE",
    when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null && d.pharmacyStatus === "none",
    set: () => ({ patientShipDate: nowIso() }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Fulfillment ────────────────────────────────────────────────────
  {
    id: "tracking.fill_rx",
    on: "FILL_RX",
    when: inFulfillmentTail,
    set: () => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
    emit: { portal: "field", step: 10 },
  },
  {
    id: "tracking.ready_rx",
    on: "READY_RX",
    when: (d) => d.pharmacyStatus === "processing",
    set: () => ({ pharmacyStatus: "ready" }),
    emit: { portal: "field", step: 10 },
  },
  {
    id: "tracking.ship_rx",
    on: "SHIP_RX",
    when: (d) => d.pharmacyStatus === "ready",
    set: () => ({ pharmacyStatus: "shipped" }),
    emit: { portal: "field", step: 11 },
  },
  {
    id: "tracking.deliver_rx",
    on: "DELIVER_RX",
    when: (d) => d.pharmacyStatus === "shipped",
    set: () => ({ pharmacyStatus: "delivered" }),
    emit: { portal: "field", step: 12 },
  },
];
