import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import type { WorkflowDefinition } from "@/engine/workflow/types";
import { STANDARD_RULES } from "./rules";
import { STANDARD_PA_APPROVED } from "./scenarios";

/** Standard (fax): one machine, built by the shared factory. */
export const standardDefinition: WorkflowDefinition = {
  id: "standard",
  defaultFlowType: "Fax_QS_PA_Approved",
  rules: STANDARD_RULES,
  scenarios: { Fax_QS_PA_Approved: STANDARD_PA_APPROVED },
};

export const standardMachine = createWorkflowMachine(standardDefinition);
