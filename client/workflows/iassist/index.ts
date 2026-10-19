import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { IASSIST_FORKS } from "./forks";
import { IASSIST_RULES } from "./rules";
import { IA_PA_APPROVED, IA_PA_DENIED_APPEAL } from "./scenarios";

/** iAssist: one machine for iAssist_PA_Approved and iAssist_PAP (the appeal). The scenario arrives as `input: { flowType }`. */
export const iassistMachine = createWorkflowMachine({
  id: "iassist",
  defaultFlowType: "iAssist_PA_Approved",
  rules: IASSIST_RULES,
  forks: IASSIST_FORKS,
  scenarios: {
    iAssist_PA_Approved: IA_PA_APPROVED,
    iAssist_PAP: IA_PA_DENIED_APPEAL,
  },
});
