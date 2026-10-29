/** Income qualification screens and route rules: the application update text and code, the home card, the income form. */
import type { Screen } from "@/engine/workflow/screens";
import { PAP_JOURNEY, type CoaRoute } from "../slots";

export const INCOME_QUALIFICATION_SCREENS: Screen[] = [
  { path: "/pap-update-sms", label: "Application Update SMS", group: "Income verification", scope: PAP_JOURNEY },
  { path: "/pap-update-otp", label: "Application Update Code", group: "Income verification", scope: PAP_JOURNEY },
  { path: "/income-qualification", label: "Income Verification", group: "Income verification", scope: PAP_JOURNEY },
];

export const INCOME_QUALIFICATION_ROUTES: CoaRoute[] = [
  { id: "income_qualification.update_sms", slot: "income", path: "/pap-update-sms", scope: PAP_JOURNEY, when: (d) => d.papSmsSent && !d.papSmsVerified },
  { id: "income_qualification.update_otp", slot: "income", path: "/pap-update-otp", scope: PAP_JOURNEY, when: (d) => d.papSmsVerified && !d.papOtpVerified },
  // Code verified. Home explains no coverage was found and offers the program. "Enroll" opens the income form.
  { id: "income_qualification.home", slot: "income", path: "/", scope: PAP_JOURNEY, when: (d) => d.papOtpVerified && d.incomeStatus === "none" },
  { id: "income_qualification.form", slot: "income", path: "/income-qualification", scope: PAP_JOURNEY, when: (d) => d.incomeStatus === "pending" },
];
