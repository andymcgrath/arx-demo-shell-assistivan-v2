import type { ScenarioDefinition } from "@/engine/workflow/types";
import { COA_DTP, COA_COPAY, COA_DME } from "./coassist/scenarios";
import { IA_PA_APPROVED, IA_PA_DENIED_APPEAL } from "./iassist/scenarios";
import { STANDARD_PA_APPROVED } from "./standard/scenarios";
import { PAP_AUDIT, PAP_PRES } from "./pap/scenarios";

/** Every scenario, one per flow. */
export const ALL_SCENARIOS: ScenarioDefinition<any>[] = [
  STANDARD_PA_APPROVED,
  PAP_AUDIT,
  COA_DTP,
  COA_COPAY,
  COA_DME,
  IA_PA_APPROVED,
  IA_PA_DENIED_APPEAL,
  PAP_PRES,
];
