/**
 * FLOW_OPTIONS — the single source of truth for the 8 demo workflows
 *
 * Every FlowType (client/engine/types.ts) needs exactly one entry here.
 * DemoShell's flow dropdown and DemoConfigurator's workflow selector both
 * render from this list, so there is no risk of the two drifting out of
 * sync or a flow (e.g. Fax_PAP_Audit / WF2) being present in one picker
 * but missing from the other.
 *
 * CoA_DME sits at position 5, right after CoA_Copay — grouping all three
 * CoAssist flows (DTP, Copay, DME) together instead of tacking DME onto the
 * end of the list.
 *
 * This list stays separate from client/engine/WorkflowRegistry.ts. Several flows share one
 * machine (the three CoAssist flows, the two iAssist flows, Fax PAP and PrES), and the picker
 * needs one entry per flow, with its label and description.
 */
import type { FlowType } from "@/engine/types";

export interface FlowOption {
  value: FlowType;
  label: string;
  description: string;
}

export const FLOW_OPTIONS: FlowOption[] = [
  {
    value: "Fax_QS_PA_Approved",
    label: "1. Standard",
    description: "Standard enrollment with fax quick-start and PA approval",
  },
  {
    value: "Fax_PAP_Audit",
    label: "2. PAP",
    description: "Patient assistance program workflow with income-qualification audit",
  },
  {
    value: "CoA_DTP",
    label: "3. CoAssist DTP",
    description: "Cash-pay direct-to-patient workflow via CoAssist",
  },
  {
    value: "CoA_Copay",
    label: "4. CoAssist Copay",
    description: "CoAssist Copay Program variation — currently a direct copy of CoAssist DTP (WF3), pending its own divergent behavior",
  },
  {
    value: "CoA_DME",
    label: "5. CoAssist DME",
    description: "Medical-benefit DME (Dexcom CGM sensor) coverage — three Benefits Investigation outcomes (pharmacy covered, both covered / medical priority, or no coverage / cash pay)",
  },
  {
    value: "iAssist_PA_Approved",
    label: "6. iAssist",
    description: "Internal iAssist platform workflow with prior authorization approval",
  },
  {
    value: "iAssist_PAP",
    label: "7. iAssist Appeal",
    description: "Structural clone of iAssist (WF4), but the PA is denied instead of approved — sets up the Action Factory appeal-rule demo",
  },
  {
    value: "PrES_PAP",
    label: "8. PrES PAP",
    description: "Provider e-signature intake with PAP income-qualification (foundation placeholder — capture screens pending)",
  },
];
