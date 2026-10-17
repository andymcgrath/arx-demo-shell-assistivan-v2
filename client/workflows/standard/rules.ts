/**
 * Standard workflow rules (Fax_QS_PA_Approved): a faxed referral, BI after consent,
 * a manual PA, then fulfillment.
 *
 * The PA is manual (CLAUDE.md rule 11, `fax` intake). Nothing starts it when BI
 * completes. An email asks the provider, and the provider's submission in the
 * Provider portal sends SUBMIT_PA. The precondition is the same as for an `erx`
 * workflow: a completed BI whose result says a PA is required.
 */
import { INTAKE_RULES, REVEAL_MS, SHIPPING_RULES, type IntakeRule } from "../shared/intake";

const nowIso = () => new Date().toISOString();

export const STANDARD_RULES: IntakeRule[] = [
  ...INTAKE_RULES,

  // ── Prior Authorization ────────────────────────────────────────────
  {
    on: "SUBMIT_PA", // trigger: agent (the provider acts after an email)
    when: (d) => d.biStatus === "complete" && d.biResult === "coverage_found" && d.paStatus === "none",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    on: "APPROVE_PA",
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "approved", paApprovedAt: nowIso(), dispatchStatus: "pending_selection" }),
    emit: { portal: "provider", step: 9 },
  },
  {
    on: "DENY_PA",
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "denied" }),
    emit: { portal: "provider", step: 9 },
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
  { on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "PA", cancel: ["pa-decision"] },

  // ── Pharmacy and fulfillment ───────────────────────────────────────
  {
    // The CRM Triage tab picks the pharmacy.
    on: "SELECT_PHARMACY",
    when: (d) => d.paStatus === "approved" && d.pharmacyStatus === "none",
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy ?? null, dispatchStatus: "selected" }),
    emit: { portal: "crm", step: 5 },
  },
  {
    on: "FILL_RX",
    when: (d) => d.paStatus === "approved" && d.dispatchStatus === "selected" && d.pharmacyStatus === "none",
    set: () => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
    emit: { portal: "field", step: 10 },
  },
  ...SHIPPING_RULES,
];
