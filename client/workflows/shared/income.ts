/**
 * Income qualification: the patient applies for the free drug program (PAP). Step module shared by the PAP
 * workflow (Fax_PAP_Audit, PrES_PAP) and, from the next steps, a CoAssist scenario (CLAUDE.md rule 6).
 *
 * Needs: a completed BI with no coverage. The Fulfillment Center then sends the "application update" text,
 * the patient confirms it, and taps "Enroll" to open the income form.
 * Sets: `incomeStatus` and `papStatus: "active"`. There is no PA, so `paStatus` stays "none". Active status
 * does the job `paStatus: "approved"` does elsewhere: it clears the case to dispatch.
 *
 * Triggers: the update text is staged by an agent (`SEND_PAP_SMS`). The patient does the rest.
 * Rules carry no ids on purpose, so the recorded rule tables keep their current shape.
 */
import type { Rule } from "@/engine/workflow/types";

export const INCOME_QUALIFICATION_RULES: Rule<any, any>[] = [
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
];
