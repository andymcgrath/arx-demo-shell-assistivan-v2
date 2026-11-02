import type { WorkflowData } from "@/engine/types";
import type { StageDef } from "@/engine/workflow/stages";

/**
 * The CRM stages, by the id the agent reads, with the signal each one sends while its tab is open. A workflow's stage
 * map (workflows/<name>/stages.ts) picks the ones it uses, in its own order. The machine owns what a signal does:
 * the 3 second reveal of the BI result and the PA decision, the payer's appeal response, the provider transfer notice.
 * The CRM only reports that the agent is looking, and that the agent left.
 */
export const STAGE_DEFS = {
  EA: { id: "EA-14272" },
  BI: { id: "BI-14273", signal: "BI", signalWhen: (d: WorkflowData) => d.biStatus === "running" },
  PA: { id: "PA-14274", signal: "PA", signalWhen: (d: WorkflowData) => d.paStatus === "submitted" },
  PT: {
    id: "PT-14282",
    signal: "PROVIDER_TRANSFER",
    signalWhen: (d: WorkflowData) => d.biStatus === "complete" && d.medicalBenefitStatus === "covered" && d.providerTransferStatus === "none",
  },
  CO: { id: "CO-14281" },
  A: { id: "A-14275", signal: "APPEAL", signalWhen: (d: WorkflowData) => d.appealStatus === "initiated" },
  PAP: { id: "PAP-14279" },
  PSP: { id: "PSP-14283" },
  FA: { id: "FA-14276" },
  TP: { id: "TP-14277" },
  PS: { id: "PS-14278" },
} satisfies Record<string, StageDef>;
