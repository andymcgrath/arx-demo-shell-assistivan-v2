import type { FlowType } from "@/engine/types";
import type { ForkDefinition } from "@/engine/workflow/types";
import { biFork } from "../shared/bi";

/**
 * iAssist forks. The story picks both, so there is no presenter button. They replace `content.biResult` and
 * `content.paOutcome`: the pick lives in `workflowData.choices`, and the rules read it.
 *
 * Each exit lists the modules a recipe must include to pick it (see `recipeProblems`). A branch that no module
 * handles fails a test, not a demo.
 */
const IASSIST_PA: FlowType[] = ["iAssist_PA_Approved", "iAssist_PAP", "iAssist_Medical_Transfer", "iAssist_Buy_And_Bill"];
/** Free drug (PAP) has no BI coverage to resolve into a PA, so it passes through `bi` only. */
const IASSIST: FlowType[] = [...IASSIST_PA, "iAssist_Buy_And_Bill_PAP"];

/**
 * What BI finds, from the shared BI catalog (workflows/shared/bi.ts). A PA starts only when the exit requires one.
 * `no_coverage` is reachable by event only: no module handles it yet, so it requires `financial_assistance` (a
 * no-coverage BI is a PAP qualification).
 */
export const IASSIST_BI_FORK: ForkDefinition = biFork({
  scenarios: IASSIST,
  exits: [{ id: "pharmacy_covered" }, { id: "medical_pa_required" }, { id: "medical_buy_and_bill" }, { id: "no_coverage", requires: ["financial_assistance"] }],
});

/**
 * The PA decision. Approved leads to the PA-approved SMS and OTP, so it requires `pa_notification`. Denied leads
 * to the appeal and nothing else, so it requires `appeal`.
 */
export const IASSIST_PA_FORK: ForkDefinition = {
  id: "pa",
  label: "Prior authorization decision",
  chooser: "story",
  scenarios: IASSIST_PA,
  resolved: (d) => d.paStatus === "approved" || d.paStatus === "denied",
  exits: [
    { id: "approved", label: "Approved", description: "The PA is approved.", data: { paStatus: "approved" }, requires: ["pa_notification"] },
    { id: "denied", label: "Denied", description: "The PA is denied and the appeal follows.", data: { paStatus: "denied" }, requires: ["appeal"] },
  ],
};

/**
 * Who captures the patient's consent. The iAssist form looks the same either way, and the HCP always has both
 * options. The story picks the one that runs. `patient_text`: the patient consents in the patient app and confirms
 * household size and income there. `hcp_signs`: the HCP captured consent and income on the iAssist form.
 */
export const IASSIST_CONSENT_FORK: ForkDefinition = {
  id: "consent",
  label: "Patient consent",
  chooser: "story",
  scenarios: ["iAssist_Buy_And_Bill"],
  resolved: (d) => d.enrollmentStatus !== "none",
  exits: [
    { id: "patient_text", label: "Patient consents by text", description: "The patient consents and confirms household income in the patient app.", data: {} },
    { id: "hcp_signs", label: "HCP captures consent", description: "The HCP captures consent and income on the iAssist form.", data: {} },
  ],
};

export const IASSIST_FORKS: ForkDefinition[] = [IASSIST_BI_FORK, IASSIST_PA_FORK, IASSIST_CONSENT_FORK];
