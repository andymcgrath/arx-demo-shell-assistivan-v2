/**
 * iAssist rules: the ordered transition table shared by iAssist_PA_Approved and
 * iAssist_PAP (the appeal scenario). Replaces two copied 600-line machines.
 *
 * Reading a rule: `when` is the precondition on workflowData, `set` is what
 * changes, `emit` is what lands in the event log, `then` fires another event
 * (now or after a delay). A rule with `scenarios` applies only to those scenarios.
 *
 * Order of events (CLAUDE.md rule 11): iAssist is an `erx` workflow. The eRx
 * holds everything the PA needs. REFERRAL_RECEIVED starts BI. BI completing
 * with a result that requires a PA starts the PA. The patient's own onboarding
 * (SMS, OTP, consent) is an independent timeline and can finish before, during
 * or after BI and the PA.
 */
import type { WorkflowData } from "@/engine/types";
import type { Rule } from "@/engine/workflow/types";
import type { IassistContent } from "./scenarios";

type IaRule = Rule<any, IassistContent>;

const nowIso = () => new Date().toISOString();

const APPROVED = ["iAssist_PA_Approved"] as const;
const APPEAL = ["iAssist_PAP"] as const;

/** How long the CRM shows a stage as "working" before the result lands. */
const REVEAL_MS = 3000;
/** Appeal steps run a little faster than the BI and PA reveals. */
const APPEAL_MS = 2500;

const selfPayOwesPayment = (d: WorkflowData) => d.pricingOption === "self_pay" && !d.paymentVerified;

export const IASSIST_RULES: IaRule[] = [
  // ── Referral and patient onboarding ────────────────────────────────
  {
    // The referral lands and the welcome text goes out in the same moment. BI starts on its own.
    on: "REFERRAL_RECEIVED",
    when: (d) => d.enrollmentStatus === "none",
    set: () => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true }),
    emit: { portal: "crm", step: 1 },
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
    scenarios: [...APPROVED],
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: (d) => ({
      consentStatus: "confirmed",
      enrollmentAcknowledged: true,
      ...(d.paStatus === "approved" ? { paApprovedSmsVerified: true, paApprovedOtpVerified: true } : {}),
    }),
    emit: { portal: "patient", step: 5 },
  },
  {
    on: "CONFIRM_CONSENT",
    scenarios: [...APPEAL],
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: () => ({ consentStatus: "confirmed", enrollmentAcknowledged: true }),
    emit: { portal: "patient", step: 5 },
  },
  {
    on: "DISMISS_WELCOME",
    when: (d) => !d.welcomeDismissed,
    set: () => ({ welcomeDismissed: true }),
    emit: { portal: "patient", step: 2 },
  },
  {
    on: "COMPLETE_PROVIDER_PA",
    when: (d) => !d.providerPACompleted,
    set: () => ({ providerPACompleted: true }),
    emit: { portal: "provider", step: 13 },
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
    when: (d) => d.biStatus === "running",
    set: (_d, e, s) => ({ biStatus: "complete", biResult: e.result ?? s.content.biResult }),
    emit: { portal: "analytics", step: 7 },
    // The PA starts when BI returns. SUBMIT_PA checks that the result requires one.
    then: { trigger: "system", send: () => ({ type: "SUBMIT_PA" }) },
  },

  // ── Prior Authorization ────────────────────────────────────────────
  {
    // A PA needs a completed BI whose result says one is required.
    on: "SUBMIT_PA",
    when: (d) => d.biStatus === "complete" && d.biResult === "coverage_found" && d.paStatus === "none",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    // The appeal scenario never approves its PA. The appeal is what unlocks it.
    on: "APPROVE_PA",
    scenarios: [...APPROVED],
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "approved", paApprovedAt: nowIso(), dispatchStatus: "pending_selection" }),
    emit: { portal: "provider", step: 9 },
  },
  {
    on: "DENY_PA",
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "denied" }),
    emit: { portal: "provider", step: 9 },
    // The appeal rule (built in the Rules portal) files the appeal when a PA is denied.
    then: {
      trigger: "system",
      id: "appeal-start",
      after: APPEAL_MS,
      when: (d) => d.appealRuleActive === true,
      send: () => ({ type: "INITIATE_APPEAL" }),
    },
  },
  {
    // Pricing options go to the patient only after enrollment is complete.
    on: "VERIFY_PA_APPROVED_SMS",
    scenarios: [...APPROVED],
    when: (d) => d.paStatus === "approved" && d.consentStatus === "confirmed" && !d.paApprovedSmsVerified,
    set: () => ({ paApprovedSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "VERIFY_PA_APPROVED_OTP",
    scenarios: [...APPROVED],
    when: (d) => d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
    set: () => ({ paApprovedOtpVerified: true }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Appeal (iAssist_PAP) ───────────────────────────────────────────
  {
    // The Rules portal reports that the "Initiate Appeal on PA denial" rule is active. A case already
    // sitting at PA Denied springs into motion.
    on: "SET_APPEAL_RULE",
    scenarios: [...APPEAL],
    snapshot: false,
    when: (_d, e) => e.active === true,
    set: () => ({ appealRuleActive: true }),
    then: {
      trigger: "system",
      id: "appeal-start",
      after: APPEAL_MS,
      when: (d) => d.paStatus === "denied" && d.appealStatus === "none",
      send: () => ({ type: "INITIATE_APPEAL" }),
    },
  },
  {
    on: "SET_APPEAL_RULE",
    scenarios: [...APPEAL],
    snapshot: false,
    set: () => ({ appealRuleActive: false }),
    cancel: ["appeal-start"],
  },
  {
    // Files the appeal and unlocks fulfillment, the way an approval would.
    on: "INITIATE_APPEAL",
    scenarios: [...APPEAL],
    when: (d) => d.paStatus === "denied" && d.appealStatus === "none",
    set: () => ({ appealStatus: "initiated", dispatchStatus: "pending_selection" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    on: "APPROVE_APPEAL",
    scenarios: [...APPEAL],
    when: (d) => d.appealStatus === "initiated",
    set: () => ({ appealStatus: "approved" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    on: "PATIENT_SELECTS_INFUSION_DATE",
    scenarios: [...APPEAL],
    when: (d) => d.appealStatus === "approved",
    set: (_d, e) => ({ infusionDate: e.date ?? null }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Agent-driven reveals ───────────────────────────────────────────
  // The CRM reports "the agent is looking at this stage" (VIEW_STAGE) and "left it" (LEAVE_STAGE).
  // The machine owns the delay and the outcome. Leaving the stage cancels a pending reveal.
  {
    on: "VIEW_STAGE",
    snapshot: false,
    when: (d, e) => e.stage === "BI" && d.biStatus === "running",
    then: {
      trigger: "agent",
      id: "bi-reveal",
      after: REVEAL_MS,
      send: (_d, _e, s) => ({ type: "COMPLETE_BI", result: s.content.biResult }),
    },
  },
  {
    on: "VIEW_STAGE",
    snapshot: false,
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
    scenarios: [...APPEAL],
    snapshot: false,
    when: (d, e) => e.stage === "APPEAL" && d.appealStatus === "initiated",
    then: { trigger: "agent", id: "appeal-decision", after: APPEAL_MS, send: () => ({ type: "APPROVE_APPEAL" }) },
  },
  { on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "BI", cancel: ["bi-reveal"] },
  { on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "PA", cancel: ["pa-decision"] },
  { on: "LEAVE_STAGE", snapshot: false, scenarios: [...APPEAL], when: (_d, e) => e.stage === "APPEAL", cancel: ["appeal-decision"] },

  // ── Pricing and pharmacy choice (iAssist_PA_Approved) ──────────────
  {
    on: "SELECT_PRICING_OPTION",
    scenarios: [...APPROVED],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, e, s) => ({
      pricingOption: e.option,
      selectedPharmacy: e.option === "retail" ? s.content.retail : s.content.mailOrder,
    }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "SELECT_SELF_PAY",
    scenarios: [...APPROVED],
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, _e, s) => ({ pricingOption: "self_pay", selectedPharmacy: s.content.selfPay }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // The CRM can change the dispensing pharmacy once a price is chosen.
    on: "SELECT_PHARMACY",
    scenarios: [...APPROVED],
    when: (d) => d.paStatus === "approved" && d.pricingOption !== null && d.pharmacyStatus === "none",
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy ?? null }),
    emit: { portal: "crm", step: 5 },
  },
  {
    // WF5 dispenses to a site of care. Picking it is what the Dispatch to Triage stage shows as done.
    on: "SELECT_PHARMACY",
    scenarios: [...APPEAL],
    when: (d) => d.appealStatus !== "none" && d.pharmacyStatus === "none",
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy ?? null, dispatchStatus: "selected" }),
    emit: { portal: "crm", step: 5 },
  },

  // ── Delivery details and payment (iAssist_PA_Approved) ─────────────
  {
    on: "PATIENT_SETS_ADDRESS",
    scenarios: [...APPROVED],
    when: (d) => d.pricingOption !== null && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection") && d.pharmacyStatus === "none",
    set: () => ({ dispatchStatus: "selected" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "PATIENT_SELECTS_SHIP_DATE",
    scenarios: [...APPROVED],
    when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null && d.pharmacyStatus === "none",
    set: () => ({ patientShipDate: nowIso() }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // Representative only: no real payment. Only self-pay collects payment through the app.
    on: "PATIENT_PAYS",
    scenarios: [...APPROVED],
    when: (d) => selfPayOwesPayment(d) && d.patientShipDate !== null && d.cashOfferStatus !== "paid",
    set: () => ({ cashOfferStatus: "paid" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "VERIFY_PAYMENT",
    scenarios: [...APPROVED],
    when: (d) => d.cashOfferStatus === "paid" && !d.paymentVerified,
    set: () => ({ paymentVerified: true }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Fulfillment ────────────────────────────────────────────────────
  {
    on: "FILL_RX",
    scenarios: [...APPROVED],
    when: (d) => d.paStatus === "approved" && d.patientShipDate !== null && d.pharmacyStatus === "none" && (d.pricingOption !== "self_pay" || d.paymentVerified),
    set: () => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
    emit: { portal: "field", step: 10 },
  },
  {
    // Fulfillment unlocks off the appeal being filed, then waits for the site of care to be picked.
    on: "FILL_RX",
    scenarios: [...APPEAL],
    when: (d) => d.appealStatus !== "none" && d.dispatchStatus === "selected" && d.pharmacyStatus === "none",
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
