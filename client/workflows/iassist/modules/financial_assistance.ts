/**
 * Financial assistance, `pap` variant: BI found no coverage, so the patient applies for the free drug program. The
 * application update text goes out once BI is back, the patient verifies it, then agrees to the credit check and
 * confirms household size and income. Approval (`papStatus` "active") unlocks fulfillment to the site of care.
 * No PA runs and no copay applies.
 *
 * Triggers (CLAUDE.md rule 11): the update text is `system`, fired after BI. The patient's steps are the patient's.
 */
import type { IaRule } from "./shared";

const PAP = { module: "financial_assistance", props: { variant: "pap" } } as const;

export const FINANCIAL_ASSISTANCE_RULES: IaRule[] = [
  {
    // BI says no coverage. The fulfillment center stages the application update.
    id: "financial_assistance.send_update",
    on: "SEND_PAP_SMS",
    scope: PAP,
    when: (d) => d.biStatus === "complete" && d.biResult === "no_coverage" && !d.papSmsSent,
    set: () => ({ papSmsSent: true }),
    emit: { portal: "crm", step: 7 },
  },
  {
    id: "financial_assistance.verify_update_sms",
    on: "VERIFY_PAP_SMS",
    scope: PAP,
    when: (d) => d.papSmsSent && !d.papSmsVerified,
    set: () => ({ papSmsVerified: true }),
    emit: { portal: "patient", step: 7 },
  },
  {
    id: "financial_assistance.verify_update_otp",
    on: "VERIFY_PAP_OTP",
    scope: PAP,
    when: (d) => d.papSmsVerified && !d.papOtpVerified,
    set: () => ({ papOtpVerified: true }),
    emit: { portal: "patient", step: 7 },
  },
  {
    // The credit check consent and the household answers arrive together. Approval clears the case for the site of care.
    id: "financial_assistance.verify_income",
    on: "VERIFY_INCOME",
    scope: PAP,
    when: (d) => d.papOtpVerified && d.incomeStatus !== "verified",
    set: (d, e) => ({
      incomeStatus: "verified",
      creditCheckConsented: true,
      papStatus: "active",
      householdSize: String(e.householdSize ?? d.householdSize ?? ""),
      householdIncome: String(e.householdIncome ?? d.householdIncome ?? ""),
      dispatchStatus: d.dispatchStatus === "none" ? "pending_selection" : d.dispatchStatus,
    }),
    emit: { portal: "patient", step: 8 },
  },
];
