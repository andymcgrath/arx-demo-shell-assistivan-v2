import type { FlowType } from "@/engine/types";
import type { ScenarioDefinition } from "@/engine/workflow/types";
import type { IntakeContent } from "../shared/intake";

/** Standard: faxed referral, coverage found, a manual PA that is approved. */
export const STANDARD_PA_APPROVED: ScenarioDefinition<IntakeContent> = {
  flowType: "Fax_QS_PA_Approved",
  intake: "fax",
  content: { biResult: "coverage_found", paOutcome: "approved" },
};

/** The scenarios of the Standard workflow. */
export const STANDARD_FLOWS: FlowType[] = ["Fax_QS_PA_Approved"];
