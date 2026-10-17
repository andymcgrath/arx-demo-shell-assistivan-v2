import type { FlowType } from "@/engine/types";
import type { ScenarioDefinition } from "@/engine/workflow/types";
import type { IntakeContent } from "../shared/intake";

/**
 * PAP scenarios. BI finds no insurance, so there is no PA. The patient applies for
 * the free drug program instead (income qualification), then the Rx is sent to the
 * pharmacy and the patient's tracker follows it to delivery.
 */
export const PAP_AUDIT: ScenarioDefinition<IntakeContent> = {
  flowType: "Fax_PAP_Audit",
  intake: "fax",
  content: { biResult: "no_insurance", paOutcome: "approved" },
};

/** Provider e-signature intake. Legacy: keep it working and tested, add no features. */
export const PAP_PRES: ScenarioDefinition<IntakeContent> = {
  flowType: "PrES_PAP",
  intake: "esign",
  legacy: true,
  content: { biResult: "no_insurance", paOutcome: "approved" },
};

/** The scenarios of the PAP workflow. */
export const PAP_FLOWS: FlowType[] = ["Fax_PAP_Audit", "PrES_PAP"];
