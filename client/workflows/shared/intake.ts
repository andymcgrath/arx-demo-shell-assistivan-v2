/**
 * Rules shared by the fax and e-sign workflows (Standard and PAP). Four scenarios
 * use them (Standard, Fax PAP, PrES PAP), so they live here (CLAUDE.md rule 6).
 *
 * Onboarding is the same everywhere: the referral lands, an agent (or the patient,
 * for PrES) sends the invite, then SMS, OTP and consent. BI starts when the patient
 * consents. That is the difference from an `erx` workflow, where BI starts with
 * the referral.
 */
import type { Rule } from "@/engine/workflow/types";

export interface IntakeContent {
  /** What BI finds. Standard needs coverage. PAP finds none. */
  biResult: "coverage_found" | "no_coverage" | "no_insurance";
  /** How the PA resolves once the agent opens the PA stage. PAP has no PA. */
  paOutcome: "approved" | "denied";
}

export type IntakeRule = Rule<any, IntakeContent>;

/** How long the CRM shows a stage as "working" before the result lands. */
export const REVEAL_MS = 3000;

export const INTAKE_RULES: IntakeRule[] = [
  // ── Referral and patient onboarding ────────────────────────────────
  {
    on: "REFERRAL_RECEIVED",
    when: (d) => d.enrollmentStatus === "none",
    set: () => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true }),
    emit: { portal: "crm", step: 1 },
  },
  {
    on: "INVITE",
    when: (d) => d.enrollmentStatus === "enrolled" && !d.patientInvited,
    set: () => ({ patientInvited: true }),
    emit: { portal: "crm", step: 2 },
  },
  {
    on: "VERIFY_SMS",
    when: (d) => d.patientInvited === true && !d.smsVerified,
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
    on: "CONFIRM_CONSENT",
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: () => ({ consentStatus: "confirmed", enrollmentAcknowledged: true }),
    emit: { portal: "patient", step: 5 },
    // Fax and e-sign BI waits for consent. It then starts on its own.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
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
    when: (d) => d.consentStatus === "confirmed" && d.biStatus === "none",
    set: () => ({ biStatus: "running" }),
    emit: { portal: "analytics", step: 6 },
  },
  {
    on: "COMPLETE_BI",
    when: (d) => d.biStatus === "running",
    set: (_d, e, s) => ({ biStatus: "complete", biResult: e.result ?? s.content.biResult }),
    emit: { portal: "analytics", step: 7 },
  },
  {
    // The CRM reports "the agent is looking at this stage". The machine owns the delay and the result.
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
  { on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "BI", cancel: ["bi-reveal"] },
];

/** Shipping steps after the pharmacy fills. The same in every fax and e-sign scenario. */
export const SHIPPING_RULES: IntakeRule[] = [
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
