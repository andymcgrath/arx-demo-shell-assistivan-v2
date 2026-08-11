/**
 * WorkflowRegistry — Runtime workflow machine registration and switching
 *
 * Allows multiple XState machine definitions to be registered at startup,
 * then switched at runtime. The active workflow ID is persisted to sessionStorage.
 */

import { workflowMachine } from "@/engine/workflowMachine";
import { coaDtpMachine } from "@/workflows/coaDtp";
import { iAssistMachine } from "@/workflows/iAssist";
import { presPapMachine } from "@/workflows/presPap";

export interface WorkflowMetadata {
  id: string;
  label: string;
  description: string;
}

type AnyStateMachine = any;

class WorkflowRegistry {
  private workflows: Map<string, AnyStateMachine> = new Map();
  private metadata: Map<string, WorkflowMetadata> = new Map();

  registerWorkflow(
    id: string,
    machine: AnyStateMachine,
    metadata: Omit<WorkflowMetadata, 'id'>
  ): void {
    this.workflows.set(id, machine);
    this.metadata.set(id, { id, ...metadata });
  }

  getWorkflow(id: string): AnyStateMachine | null {
    return this.workflows.get(id) ?? null;
  }

  listWorkflows(): WorkflowMetadata[] {
    return Array.from(this.metadata.values());
  }
}

export const workflowRegistry = new WorkflowRegistry();

workflowRegistry.registerWorkflow("enrollment", workflowMachine, {
  label: "Fax QS / PA Approved",
  description: "Standard enrollment with fax QS and PA approval",
});

workflowRegistry.registerWorkflow("CoA_DTP", coaDtpMachine, {
  label: "COA Direct to Patient",
  description: "Cash-pay direct-to-patient workflow via CoAssist",
});

workflowRegistry.registerWorkflow("iAssist_PA_Approved", iAssistMachine, {
  label: "iAssist PA Approved",
  description: "Internal iAssist platform workflow with prior authorization approval",
});

workflowRegistry.registerWorkflow("PrES_PAP", presPapMachine, {
  label: "PrES / PAP",
  description: "Provider e-signature intake workflow with PAP income-qualification (foundation placeholder)",
});
