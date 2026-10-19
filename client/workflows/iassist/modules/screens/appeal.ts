/**
 * Appeal (iAssist_PAP): the PA stays denied forever. Once the appeal is approved the patient sees the approval and
 * schedules the infusion. /medication-delivered is the terminal screen.
 */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const SCOPE = { module: "appeal" } as const;

export const APPEAL_SCREENS: Screen[] = [
  { path: "/pa-approved", label: "Appeal Approved: Schedule Infusion", group: "Prior authorization", scope: SCOPE },
  { path: "/infusion-date", label: "Infusion Date", group: "Prior authorization", scope: SCOPE, sticky: true },
  { path: "/appointment-confirmation", label: "Appointment Confirmation", group: "Prior authorization", scope: SCOPE, sticky: true },
];

export const APPEAL_ROUTES: IaRoute[] = [
  { id: "appeal.medication_delivered", slot: "appeal_result", path: "/medication-delivered", scope: SCOPE, when: (d) => d.appealStatus === "approved" && d.infusionDate !== null },
  { id: "appeal.approved", slot: "appeal_result", path: "/pa-approved", scope: SCOPE, when: (d) => d.appealStatus === "approved" },
];
