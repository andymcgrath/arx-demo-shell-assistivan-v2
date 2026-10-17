import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { PAP_RULES } from "./rules";
import { PAP_AUDIT, PAP_PRES } from "./scenarios";

/** PAP: one machine for Fax_PAP_Audit and PrES_PAP (legacy). The scenario arrives as `input: { flowType }`. */
export const papMachine = createWorkflowMachine({
  id: "pap",
  defaultFlowType: "Fax_PAP_Audit",
  rules: PAP_RULES,
  scenarios: { Fax_PAP_Audit: PAP_AUDIT, PrES_PAP: PAP_PRES },
});
