/** Income qualification screens and route rules: the application update text and code, the home card, the income form. */
import type { Screen } from "@/engine/workflow/screens";
import { PAP_JOURNEY, type CoaRoute } from "../slots";

/** A recipe with a PA notice (APA, then assistance) runs the application after the notice. One without it runs it right after BI. */
const AFTER_PA_NOTICE = { module: "pa_notification" } as const;
const NO_PA_NOTICE = { not: AFTER_PA_NOTICE } as const;
/** The PES site has its own pages for this (`screens/hcp_patient.ts`), and no code screen. */
const NOT_PES_SITE = { not: { module: "enrollment", props: { variant: "hcp_patient" } } } as const;

export const INCOME_QUALIFICATION_SCREENS: Screen[] = [
  { path: "/pap-update-sms", label: "Application Update SMS", group: "Income verification", scope: [PAP_JOURNEY, NOT_PES_SITE] },
  { path: "/pap-update-otp", label: "Application Update Code", group: "Income verification", scope: [PAP_JOURNEY, NOT_PES_SITE] },
  { path: "/income-qualification", label: "Income Verification", group: "Income verification", scope: [PAP_JOURNEY, NOT_PES_SITE] },
];

type Step = { id: string; path: string; when: CoaRoute["when"] };
const STEPS: Step[] = [
  { id: "update_sms", path: "/pap-update-sms", when: (d) => d.papSmsSent && !d.papSmsVerified },
  { id: "update_otp", path: "/pap-update-otp", when: (d) => d.papSmsVerified && !d.papOtpVerified },
  // Code verified. Home explains no coverage was found and offers the program. "Enroll" opens the income form.
  { id: "home", path: "/", when: (d) => d.papOtpVerified && d.incomeStatus === "none" },
  { id: "form", path: "/income-qualification", when: (d) => d.incomeStatus === "pending" },
];

export const INCOME_QUALIFICATION_ROUTES: CoaRoute[] = [
  ...STEPS.map((s): CoaRoute => ({ id: `income_qualification.${s.id}`, slot: "income", path: s.path, scope: [PAP_JOURNEY, NO_PA_NOTICE, NOT_PES_SITE], when: s.when })),
  // With a PA notice the patient hears the approval first, then applies.
  ...STEPS.map((s): CoaRoute => ({ id: `income_qualification.${s.id}_after_pa`, slot: "assistance", path: s.path, scope: [PAP_JOURNEY, AFTER_PA_NOTICE, NOT_PES_SITE], when: (d) => d.paApprovedOtpVerified && !!s.when?.(d) })),
];
