/**
 * PAP workflow rules (Fax_PAP_Audit and PrES_PAP): BI finds no insurance, the
 * Fulfillment Center sends an "application update" text, the patient confirms
 * their income, and the Rx ships. There is no PA: paStatus stays "none".
 *
 * The papStatus "active" signal (set when income is verified) does the job
 * paStatus "approved" does in the Standard workflow: it clears the case to dispatch.
 */
import { INTAKE_RULES, SHIPPING_RULES, type IntakeRule } from "../shared/intake";

export const PAP_RULES: IntakeRule[] = [
  ...INTAKE_RULES,

  // ── Application update and income qualification ────────────────────
  {
    // The Fulfillment Center stages the update once BI is back.
    on: "SEND_PAP_SMS", // trigger: agent
    when: (d) => d.biStatus === "complete" && !d.papSmsSent,
    set: () => ({ papSmsSent: true }),
    emit: { portal: "crm", step: 7 },
  },
  {
    on: "VERIFY_PAP_SMS",
    when: (d) => d.papSmsSent && !d.papSmsVerified,
    set: () => ({ papSmsVerified: true }),
    emit: { portal: "patient", step: 7 },
  },
  {
    // Fax PAP only. The PrES patient has no code screen.
    on: "VERIFY_PAP_OTP",
    when: (d) => d.papSmsVerified && !d.papOtpVerified,
    set: () => ({ papOtpVerified: true }),
    emit: { portal: "patient", step: 7 },
  },
  {
    // The patient taps "Enroll" on the home card. Only then does the income form open.
    on: "START_INCOME_QUALIFICATION",
    when: (d) => d.papSmsVerified && d.incomeStatus === "none",
    set: () => ({ incomeStatus: "pending" }),
    emit: { portal: "patient", step: 8 },
  },
  {
    // Income verified: the program is active and the case is cleared to dispatch, before a pharmacy is picked.
    on: "VERIFY_INCOME",
    when: (d) => d.papSmsVerified && d.incomeStatus !== "verified",
    set: (d) => ({
      incomeStatus: "verified",
      papStatus: "active",
      dispatchStatus: d.dispatchStatus === "none" ? "pending_selection" : d.dispatchStatus,
    }),
    emit: { portal: "patient", step: 8 },
  },

  // ── Delivery details, pharmacy and fulfillment ─────────────────────
  {
    on: "PATIENT_SETS_ADDRESS",
    when: (d) => d.incomeStatus === "verified" && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection"),
    set: () => ({ dispatchStatus: "selected" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    on: "PATIENT_SELECTS_SHIP_DATE",
    when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null,
    set: () => ({ patientShipDate: new Date().toISOString() }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // The CRM Triage tab picks the pharmacy.
    on: "SELECT_PHARMACY",
    when: (d) => d.papStatus === "active" && d.pharmacyStatus === "none",
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy ?? null, dispatchStatus: "selected" }),
    emit: { portal: "crm", step: 5 },
  },
  {
    on: "FILL_RX",
    when: (d) => d.papStatus === "active" && d.dispatchStatus === "selected" && d.pharmacyStatus === "none",
    set: () => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
    emit: { portal: "field", step: 10 },
  },
  ...SHIPPING_RULES,
];
