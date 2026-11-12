import type { WorkflowData } from "@/engine/types";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import type { CrmCan } from "../stages/actions";
import { usePatientStore } from "@/store/patientStore";

// ─── Tree Node Types ────────────────────────────────────────────────────────

export type TreeItem = {
  id: string;
  label: string;
  sublabel?: string;
};

export type TreeGroup = {
  id: string;
  label: string;
  expanded?: boolean;
  children?: TreeItem[];
};

export const TREE_DATA: TreeGroup[] = [
  { id: "material-items", label: "Material Items" },
  { id: "email", label: "Email" },
  {
    id: "secure-comms",
    label: "Secure Communications",
    expanded: true,
    children: [
      { id: "pap-application-update", label: "Application Update", sublabel: "PAP_Application_Update" },
    ],
  },
  {
    id: "consent-comms",
    label: "Consent Communications",
    expanded: true,
    children: [
      { id: "unsuccessful-contact", label: "Unsuccessful Contact", sublabel: "Unsuccessful_Contact" },
      { id: "electronic-consent", label: "Electronic Consent", sublabel: "ElectronicConsent" },
      { id: "consent-revocation", label: "Consent Revocation", sublabel: "Consent_Revocation" },
      { id: "consent-recap-reminder", label: "Consent Re-capture Reminder", sublabel: "Consent_Recap_Reminder" },
      { id: "consent-recap-confirm", label: "Consent Re-capture Confirmation", sublabel: "Consent_Recap_Confirma…" },
    ],
  },
];

// ─── Material metadata ──────────────────────────────────────────────────────
// One entry per wired catalog item (id must match a TREE_DATA leaf above).
// ItemDetails/OrderDetails read this instead of hardcoding "Electronic
// Consent" so a second real item (Application Update) renders correctly.

export type MaterialMeta = {
  title: string;
  typeLabel: string;
  subtypeLabel: string;
  description: string;
  checks: string[];
};

export const MATERIAL_META: Record<string, MaterialMeta> = {
  "electronic-consent": {
    title: "Communication Consent",
    typeLabel: "CommunicationConsent",
    subtypeLabel: "ElectronicConsent",
    description: "Communication Consent Capture",
    checks: [
      "Patient has valid mobile phone number",
      "Patient communication consent status is pending capture",
    ],
  },
  "pap-application-update": {
    title: "Application Update",
    typeLabel: "SecureCommunication",
    subtypeLabel: "PAP_Application_Update",
    description: "PAP Application Status Notification",
    checks: [
      "Benefits Investigation complete — no coverage found",
      "Patient has valid mobile phone number",
    ],
  },
};

/**
 * Whether the selected catalog item is ready to add to the order.
 * "electronic-consent" keys off the pre-enrollment consent record
 * (unchanged); "pap-application-update" keys off BI having just come back
 * no_insurance for a WF2 (Fax_PAP_Audit) patient who hasn't been texted yet
 * — see WorkflowEngine.ts's Fax_PAP_Audit routing branch.
 */
export function canAddItem(selectedId: string, consentStatus: string, workflowData: WorkflowData, can: CrmCan): boolean {
  if (selectedId === "pap-application-update") {
    // The machine says when the update can be staged (SEND_PAP_SMS). The scenario says whether this item is the one
    // the case needs: a fax or e-sign intake where BI found no insurance.
    const facts = scenarioFacts(workflowData.flowType);
    const noCoverage = (facts.isNoPaIntake && workflowData.biResult === "no_insurance") || (facts.agentSendsPapUpdate && workflowData.biStatus === "complete");
    return noCoverage && can({ type: "SEND_PAP_SMS", portal: "crm" });
  }
  if (selectedId === "electronic-consent") {
    return consentStatus === "pending";
  }
  return false;
}

export function buildMessageText(selectedId: string, noPaIntake: boolean): string {
  // Not a hook call — .getState() reads the current value at call time,
  // which is correct here since this is a plain template-building helper,
  // not a component that needs to re-render on change.
  const drugName = usePatientStore.getState().drugName;
  if (selectedId === "pap-application-update") {
    return `There's an update on your ${drugName} Patient Assistance Program application. Tap to continue:\n\nhttps://go.iassist/pap-update\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`;
  }
  return noPaIntake
    ? `Welcome! You've been referred to the ${drugName} Patient Assistance Program. Complete next step here:\n\nhttps://go.iassist/g6w9\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`
    : `Welcome! Your prescription is ready to process. Complete next step here:\n\nhttps://go.iassist/g6w9\n\nReply STOP to opt out, HELP for help. Msg&data rates may apply.`;
}
