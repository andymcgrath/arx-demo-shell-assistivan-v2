import type { WorkflowData } from "@/engine/types";
import { scenarioFacts } from "@/workflows/scenarioFacts";

/**
 * The buttons and badges a CRM stage shows, as data. `enabled` comes from the machine (`snapshot.can`), so a button
 * cannot disagree with the workflow's preconditions (CLAUDE.md rule 11). This file holds only what the machine cannot
 * say: which stage an action sits on, its label, and whether it shows while the machine refuses it.
 *
 * Pure: it takes the data and a `can` function and reads no store, actor or React.
 * Stage ids are matched as written in the stage list. Step 5 of docs/plans/PROMPT_CRM_REFACTOR.md replaces them.
 */

export interface CrmEvent {
  type: string;
  portal: "crm";
}

/** Whether the machine accepts this event now. The page passes `(e) => actor.getSnapshot().can(e)`. */
export type CrmCan = (event: CrmEvent) => boolean;

export interface CrmAction {
  id: string;
  label: string;
  /** `primary` and `success` are buttons. `badge` is a status label that sends nothing. */
  kind: "primary" | "success" | "badge";
  /** The event a button sends. A badge has none. */
  event: CrmEvent | null;
  enabled: boolean;
}

interface ButtonDef {
  stage: string;
  id: string;
  label: string;
  kind: "primary" | "success";
  event: string;
  /**
   * `when_enabled`: shown only while the machine accepts the event.
   * `always`: shown on the stage, and disabled while the machine refuses it.
   */
  shown: "when_enabled" | "always";
  /** Scenarios the button belongs to. Omit for every scenario that has the stage. */
  appliesTo?: (d: WorkflowData) => boolean;
}

interface BadgeDef {
  stage: string;
  id: string;
  label: string;
  when: (d: WorkflowData) => boolean;
}

const BUTTONS: ButtonDef[] = [
  { stage: "BI-14273", id: "bi.check_status", label: "Check Status", kind: "primary", event: "COMPLETE_BI", shown: "when_enabled" },
  {
    stage: "CO-14281",
    id: "cash_offer.send",
    label: "Send Cash Offer",
    kind: "primary",
    event: "SEND_CASH_OFFER",
    shown: "always",
    // The coverage scenario shows the price to the patient in the app. It has no cash offer to send.
    appliesTo: (d) => !scenarioFacts(d.flowType).isCoverageScenario,
  },
  { stage: "PS-14278", id: "pharmacy.received", label: "Mark as Received at Pharmacy", kind: "primary", event: "READY_RX", shown: "when_enabled" },
  { stage: "PS-14278", id: "pharmacy.shipped", label: "Mark as Shipped", kind: "primary", event: "SHIP_RX", shown: "when_enabled" },
  { stage: "PS-14278", id: "pharmacy.delivered", label: "Mark as Delivered", kind: "success", event: "DELIVER_RX", shown: "when_enabled" },
  { stage: "FA-14276", id: "pap.approve", label: "Approve Application", kind: "primary", event: "APPROVE_PAP", shown: "when_enabled" },
  { stage: "PT-14282", id: "provider_transfer.notify", label: "Notify Provider", kind: "primary", event: "NOTIFY_PROVIDER_TRANSFER", shown: "when_enabled" },
];

const BADGES: BadgeDef[] = [
  { stage: "FA-14276", id: "pap.approved", label: "Approved", when: (d) => scenarioFacts(d.flowType).isFreeDrug && d.papStatus === "active" },
  { stage: "PT-14282", id: "provider_transfer.transferred", label: "Transferred", when: (d) => d.providerTransferStatus === "notified" },
];

/** What the stage shows now, in display order: buttons first, then badges. */
export function crmActions(workflowData: WorkflowData, stageId: string, can: CrmCan): CrmAction[] {
  const out: CrmAction[] = [];
  for (const b of BUTTONS) {
    if (b.stage !== stageId || (b.appliesTo && !b.appliesTo(workflowData))) continue;
    const event: CrmEvent = { type: b.event, portal: "crm" };
    const enabled = can(event);
    if (b.shown === "when_enabled" && !enabled) continue;
    out.push({ id: b.id, label: b.label, kind: b.kind, event, enabled });
  }
  for (const b of BADGES) {
    if (b.stage === stageId && b.when(workflowData)) out.push({ id: b.id, label: b.label, kind: "badge", event: null, enabled: false });
  }
  return out;
}

/** Every event a CRM button can send. The test uses it to check each one against the machine. */
export const CRM_ACTION_EVENTS: string[] = [...new Set(BUTTONS.map((b) => b.event))];
