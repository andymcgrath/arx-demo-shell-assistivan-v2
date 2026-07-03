/**
 * Workflow machines — centralized registration
 *
 * Registers all available workflow machines with the WorkflowRegistry
 * at application startup.
 */

import { workflowMachine } from "@/engine/workflowMachine";
import { reauthMachine } from "./reauth";
import { workflowRegistry } from "@/engine/WorkflowRegistry";

/**
 * Register all workflows
 * Call this once at application startup in main.tsx or App.tsx
 */
export function registerWorkflows() {
  workflowRegistry.registerWorkflow("enrollment", workflowMachine, {
    label: "Enrollment & PA",
    description: "Standard enrollment, benefits investigation, and prior authorization workflow",
  });

  workflowRegistry.registerWorkflow("reauth", reauthMachine, {
    label: "Reauthorization",
    description: "Reauthorization request handling with CRM review and PA resubmission",
  });
}

export { workflowRegistry };
