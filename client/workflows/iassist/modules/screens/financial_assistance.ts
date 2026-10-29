/**
 * Financial assistance, `pap` variant (Buy and Bill, free drug). BI found no coverage. The patient verifies the
 * application update, agrees to the credit check and confirms household income, and approval sends the free drug to
 * the site of care. They choose an appointment date, and the order ends at /medication-delivered (the `tracking` module
 * lists that screen, so it is not repeated here). The screens are the
 * ones the appeal and the other PAP flows already use. Only the scope and the order are new.
 */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const PAP = { module: "financial_assistance", props: { variant: "pap" } } as const;
const GROUP = "Free drug application";

export const FINANCIAL_ASSISTANCE_SCREENS: Screen[] = [
  { path: "/pap-update-sms", label: "Application Update SMS", group: GROUP, scope: PAP },
  { path: "/pap-update-otp", label: "Application Update Code", group: GROUP, scope: PAP },
  { path: "/income-qualification", label: "Credit Check, Income, and Application Received", group: GROUP, scope: PAP },
  { path: "/pa-approved-sms", label: "Approval Text", group: GROUP, scope: PAP, sticky: true },
  { path: "/pa-approved-otp", label: "Approval Code", group: GROUP, scope: PAP, sticky: true },
  { path: "/pa-approved", label: "Approved: Site of Care and Appointment", group: GROUP, scope: PAP },
  { path: "/infusion-date", label: "Appointment Date", group: GROUP, scope: PAP, sticky: true },
  { path: "/appointment-confirmation", label: "Appointment Confirmation", group: GROUP, scope: PAP, sticky: true },
];

export const FINANCIAL_ASSISTANCE_ROUTES: IaRoute[] = [
  // Approved: the patient gets a text with a link, then enters the code. Then the free drug goes to the site of care, the
  // patient picks a date, and the order is tracked.
  { id: "financial_assistance.approved_sms", slot: "pap_approved", path: "/pa-approved-sms", scope: PAP, when: (d) => d.papStatus === "active" && !d.paApprovedSmsVerified },
  { id: "financial_assistance.approved_otp", slot: "pap_approved", path: "/pa-approved-otp", scope: PAP, when: (d) => d.papStatus === "active" && !d.paApprovedOtpVerified },
  { id: "financial_assistance.tracker", slot: "pap_approved", path: "/medication-delivered", scope: PAP, when: (d) => d.papStatus === "active" && d.infusionDate !== null },
  { id: "financial_assistance.approved", slot: "pap_approved", path: "/pa-approved", scope: PAP, when: (d) => d.papStatus === "active" },
  // Applying: BI is back with no coverage. The update text, its code, then the credit check and income.
  { id: "financial_assistance.waiting", slot: "pap_apply", path: "/enrollment-complete", scope: PAP, when: (d) => d.biStatus !== "complete" || !d.papSmsSent },
  { id: "financial_assistance.update_sms", slot: "pap_apply", path: "/pap-update-sms", scope: PAP, when: (d) => !d.papSmsVerified },
  { id: "financial_assistance.update_otp", slot: "pap_apply", path: "/pap-update-otp", scope: PAP, when: (d) => !d.papOtpVerified },
  { id: "financial_assistance.income", slot: "pap_apply", path: "/income-qualification", scope: PAP, when: (d) => d.incomeStatus !== "verified" },
  // Application received: the patient waits on the CRM agent's approval. The same screen shows the received message.
  { id: "financial_assistance.received", slot: "pap_apply", path: "/income-qualification", scope: PAP, when: (d) => d.papStatus !== "active" },
];
