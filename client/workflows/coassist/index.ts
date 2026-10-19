import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { COASSIST_FORKS } from "./forks";
import { COASSIST_RULES } from "./rules";
import { COA_COPAY, COA_COVERAGE, COA_DTP, COA_MEDICAL_TRANSFER } from "./scenarios";

/** CoAssist: one machine for CoA_DTP, CoA_Copay, CoA_Coverage, and CoA_Medical_Transfer. The scenario arrives as `input: { flowType }`. */
export const coassistMachine = createWorkflowMachine({
  id: "coassist",
  defaultFlowType: "CoA_DTP",
  rules: COASSIST_RULES,
  forks: COASSIST_FORKS,
  scenarios: {
    CoA_DTP: COA_DTP,
    CoA_Copay: COA_COPAY,
    CoA_Coverage: COA_COVERAGE,
    CoA_Medical_Transfer: COA_MEDICAL_TRANSFER,
  },
});
