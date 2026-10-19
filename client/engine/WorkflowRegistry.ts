/**
 * WorkflowRegistry — Runtime workflow machine registration and switching
 *
 * Allows multiple XState machine definitions to be registered at startup,
 * then switched at runtime. The active workflow ID is persisted to sessionStorage.
 */

import { coassistMachine } from "@/workflows/coassist";
import { iassistMachine } from "@/workflows/iassist";
import { standardMachine } from "@/workflows/standard";
import { papMachine } from "@/workflows/pap";

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

workflowRegistry.registerWorkflow("Fax_QS_PA_Approved", standardMachine, {
  label: "Fax QS / PA Approved",
  description: "Standard enrollment with fax QS and PA approval",
});

workflowRegistry.registerWorkflow("Fax_PAP_Audit", papMachine, {
  label: "Fax PAP / Audit",
  description: "Faxed referral, no insurance found, patient applies for the free drug program (income qualification)",
});

workflowRegistry.registerWorkflow("CoA_DTP", coassistMachine, {
  label: "COA Direct to Patient",
  description: "Cash-pay direct-to-patient workflow via CoAssist",
});

workflowRegistry.registerWorkflow("CoA_Copay", coassistMachine, {
  label: "CoAssist Copay",
  description: "CoAssist Copay Program variation — currently a direct copy of CoA_DTP (WF3), pending its own divergent behavior",
});

workflowRegistry.registerWorkflow("CoA_Coverage", coassistMachine, {
  label: "CoAssist Coverage (Medical Benefit)",
  description: "Commercial medical-benefit coverage — transfers to an outside provider (Advanced Diabetes Supply) after Benefits Investigation, no PA or in-house fulfillment.",
});

workflowRegistry.registerWorkflow("CoA_Medical_Transfer", coassistMachine, {
  label: "CoAssist Medical Transfer",
  description: "CoAssist scenario where the medical benefit covers it and a PA is required. HCP administered (Buy & Bill), so the Rx transfers to an assigned site of care with no payment or scheduling",
});

workflowRegistry.registerWorkflow("iAssist_PA_Approved", iassistMachine, {
  label: "iAssist PA Approved",
  description: "Internal iAssist platform workflow with prior authorization approval",
});

workflowRegistry.registerWorkflow("iAssist_PAP", iassistMachine, {
  label: "iAssist Appeal",
  description: "iAssist scenario with the PA denied, an appeal started by a Rules portal automation, then the infusion scheduled",
});

workflowRegistry.registerWorkflow("iAssist_Medical_Transfer", iassistMachine, {
  label: "iAssist Medical Transfer",
  description: "iAssist scenario where the medical benefit covers it and a PA is required. HCP administered (Buy & Bill), so the Rx transfers to an assigned pharmacy with no payment or scheduling",
});

workflowRegistry.registerWorkflow("PrES_PAP", papMachine, {
  label: "PrES / PAP",
  description: "Provider e-signature intake workflow with PAP income-qualification (foundation placeholder)",
});
