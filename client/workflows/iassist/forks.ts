import type { FlowType } from "@/engine/types";
import type { ForkDefinition } from "@/engine/workflow/types";

/**
 * iAssist forks. The story picks both, so there is no presenter button. They replace `content.biResult` and
 * `content.paOutcome`: the pick lives in `workflowData.choices`, and the rules read it.
 *
 * Each exit lists the modules a recipe must include to pick it (see `recipeProblems`). A branch that no module
 * handles fails a test, not a demo.
 */
const IASSIST: FlowType[] = ["iAssist_PA_Approved", "iAssist_PAP"];

/**
 * What BI finds. Only `coverage_found` means a PA is required. `no_coverage` is reachable by event only: no
 * module handles it yet, so it requires `financial_assistance` (a no-coverage BI is a PAP qualification).
 */
export const IASSIST_BI_FORK: ForkDefinition = {
  id: "bi",
  label: "Benefits investigation result",
  chooser: "story",
  scenarios: IASSIST,
  resolved: (d) => d.biStatus === "complete",
  exits: [
    {
      id: "coverage_found",
      label: "Coverage found",
      description: "Coverage is found and a PA is required.",
      data: { biResult: "coverage_found" },
    },
    {
      id: "no_coverage",
      label: "No coverage",
      description: "No coverage is found. No PA is submitted.",
      data: { biResult: "no_coverage" },
      requires: ["financial_assistance"],
    },
  ],
};

/**
 * The PA decision. Approved leads to the PA-approved SMS and OTP, so it requires `pa_notification`. Denied leads
 * to the appeal and nothing else, so it requires `appeal`.
 */
export const IASSIST_PA_FORK: ForkDefinition = {
  id: "pa",
  label: "Prior authorization decision",
  chooser: "story",
  scenarios: IASSIST,
  resolved: (d) => d.paStatus === "approved" || d.paStatus === "denied",
  exits: [
    { id: "approved", label: "Approved", description: "The PA is approved.", data: { paStatus: "approved" }, requires: ["pa_notification"] },
    { id: "denied", label: "Denied", description: "The PA is denied and the appeal follows.", data: { paStatus: "denied" }, requires: ["appeal"] },
  ],
};

export const IASSIST_FORKS: ForkDefinition[] = [IASSIST_BI_FORK, IASSIST_PA_FORK];
