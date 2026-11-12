/** The assistance fork's screen: after the patient qualifies, they choose the free drug program or the copay program. */
import type { Screen } from "@/engine/workflow/screens";
import { assistanceOutcomes } from "../../forks";
import type { CoaRoute } from "../slots";

const ASSISTANCE = { fork: "assistance" } as const;
const WITH_INCOME = [ASSISTANCE, { module: "income_qualification" }] as const;

export const ASSISTANCE_SCREENS: Screen[] = [
  { path: "/assistance-choice", label: "Choose Assistance", group: "Financial assistance", scope: [...WITH_INCOME], sticky: true },
];

export const ASSISTANCE_ROUTES: CoaRoute[] = [
  // Qualified for the free drug program, and nothing chosen yet. Choosing PAP or copay is the patient's, and ends the fork.
  {
    id: "assistance.choose",
    slot: "assistance",
    path: "/assistance-choice",
    scope: [...WITH_INCOME],
    when: (d) => d.paApprovedOtpVerified && d.incomeStatus === "verified" && assistanceOutcomes(d).length === 0,
  },
];
