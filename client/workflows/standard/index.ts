import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { STANDARD_RULES } from "./rules";
import { STANDARD_PA_APPROVED } from "./scenarios";

/** Standard (fax): one machine, built by the shared factory. */
export const standardMachine = createWorkflowMachine({
  id: "standard",
  defaultFlowType: "Fax_QS_PA_Approved",
  rules: STANDARD_RULES,
  scenarios: { Fax_QS_PA_Approved: STANDARD_PA_APPROVED },
});
