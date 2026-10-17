import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { COASSIST_RULES } from "./rules";
import { COA_COPAY, COA_DME, COA_DTP } from "./scenarios";

/** CoAssist: one machine for CoA_DTP, CoA_Copay, and CoA_DME. The scenario arrives as `input: { flowType }`. */
export const coassistMachine = createWorkflowMachine({
  id: "coassist",
  defaultFlowType: "CoA_DTP",
  rules: COASSIST_RULES,
  scenarios: {
    CoA_DTP: COA_DTP,
    CoA_Copay: COA_COPAY,
    CoA_DME: COA_DME,
  },
});
