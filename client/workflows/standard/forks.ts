import type { WorkflowData } from "@/engine/types";
import type { ForkDefinition } from "@/engine/workflow/types";
import { exitFor } from "@/engine/workflow/forks";

/**
 * How the case reaches the platform in the Standard workflow: a faxed referral (the default) or an HCP who completes the enrollment
 * form on the client's engagement site (PrES). PrES is an extra entry point. It creates the case the way the fax does, so the
 * agent works it in the CRM, the patient is texted into the patient app, and everything after is the same. The story picks it and
 * a demo in the brand file pins it, so the presenter has no branch buttons. It resolves when the case is enrolled.
 */
export const STANDARD_ENTRY_FORK: ForkDefinition = {
  id: "entry",
  label: "How the case starts",
  chooser: "story",
  scenarios: ["Fax_QS_PA_Approved"],
  resolved: (d) => d.enrollmentStatus !== "none",
  exits: [
    { id: "fax", label: "Faxed referral", description: "The referral lands in the CRM as a fax.", data: {} },
    { id: "pres", label: "HCP enrolls on the engagement site (PrES)", description: "The HCP completes the enrollment form on the client's engagement site. The submit creates the case, and it runs like a fax case from there.", data: {} },
  ],
};

export const STANDARD_FORKS: ForkDefinition[] = [STANDARD_ENTRY_FORK];

/** How the case started, read from the `entry` pick (the demo pins it). Without a pick the fork's first exit, `fax`, applies. */
export const entryOf = (d: Pick<WorkflowData, "choices">): "fax" | "pres" => (exitFor(STANDARD_ENTRY_FORK, d).id === "pres" ? "pres" : "fax");
