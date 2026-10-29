import type { ScenarioDefinition } from "@/engine/workflow/types";
import type { ModuleId } from "@/engine/workflow/components";
import { COA_DTP, COA_COPAY, COA_COVERAGE, COA_MEDICAL_TRANSFER, COA_PAP } from "./coassist/scenarios";
import { IA_BUY_AND_BILL_PAP, IA_BUY_AND_BILL, IA_MEDICAL_TRANSFER, IA_PA_APPROVED, IA_PA_DENIED_APPEAL } from "./iassist/scenarios";
import { STANDARD_PA_APPROVED } from "./standard/scenarios";
import { PAP_AUDIT, PAP_PRES } from "./pap/scenarios";

/** Every scenario, one per flow. */
export const ALL_SCENARIOS: ScenarioDefinition<any>[] = [
  STANDARD_PA_APPROVED,
  PAP_AUDIT,
  COA_DTP,
  COA_COPAY,
  COA_COVERAGE,
  COA_MEDICAL_TRANSFER,
  COA_PAP,
  IA_PA_APPROVED,
  IA_PA_DENIED_APPEAL,
  IA_MEDICAL_TRANSFER,
  IA_BUY_AND_BILL,
  IA_BUY_AND_BILL_PAP,
  PAP_PRES,
];

/** True when the scenario's recipe lists the module. UI reads the definition through this, never `flowType ===`. */
export const scenarioHasModule = (flowType: string, id: ModuleId): boolean =>
  !!ALL_SCENARIOS.find((s) => s.flowType === flowType)?.recipe?.modules.some((m) => m.id === id);
