/**
 * pspStepBar.ts: the shell step bar for a scenario that hands a no-coverage case to the patient support program
 * (the recipe lists the `pap_transfer` module). Pure: no store, no actor, no React.
 *
 * It reads the recipe, never the flow id. Each step names `rung`, the first stage-jump rung (workflows/coassist/forks.ts,
 * `BI_STAGES`) at which the step is done, so stageLadders-style tests can check the bar against the jump menu.
 */
import { scenarioHasModule } from "@/workflows/scenarios";
import type { WorkflowData } from "@/engine/types";

export interface PspStep {
  label: string;
  /** Label of the first stage-jump rung where `done` turns true. */
  rung: string;
  done: (d: WorkflowData) => boolean;
}

const PSP_STEPS: PspStep[] = [
  { label: "Referral", rung: "Patient Enrolled", done: (d) => d.enrollmentStatus !== "none" },
  { label: "Enrolled", rung: "Patient Enrolled", done: (d) => d.consentStatus === "confirmed" },
  { label: "BI", rung: "No Coverage Confirmed (referred to patient support program)", done: (d) => d.biStatus === "complete" },
  { label: "Transfer to PSP", rung: "Transfer SMS Confirmed", done: (d) => d.papTransferSmsVerified },
  { label: "Income verified", rung: "Income Verified", done: (d) => d.incomeStatus === "verified" },
  { label: "Delivery", rung: "Medication Delivered", done: (d) => d.pharmacyStatus === "delivered" },
];

/** The step bar for the scenario, or null when its recipe has no `pap_transfer` module. */
export function pspStepBar(flowType: string): PspStep[] | null {
  return scenarioHasModule(flowType, "pap_transfer") ? PSP_STEPS : null;
}
