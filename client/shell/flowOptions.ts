/**
 * FLOW_OPTIONS — the single source of truth for the 4 demo workflows
 *
 * Every FlowType (client/engine/types.ts) needs exactly one entry here.
 * DemoShell's flow dropdown and DemoConfigurator's workflow selector both
 * render from this list, so there is no risk of the two drifting out of
 * sync or a flow (e.g. Fax_PAP_Audit / WF2) being present in one picker
 * but missing from the other.
 *
 * This intentionally does NOT import from client/engine/WorkflowRegistry.ts.
 * That registry tracks XState machine IDs, not FlowTypes — CoA_DTP and
 * iAssist_PA_Approved each get their own machine, but Fax_QS_PA_Approved
 * (WF1) and Fax_PAP_Audit (WF2) share the "enrollment" machine (see
 * machineIdForFlow() in actorSingleton.ts). Deriving a user-facing flow
 * picker from machine IDs collapses WF1/WF2 into one option and is what
 * caused WF2 to go missing from the old DemoConfigurator dropdown.
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
    label: "3. CoAssist",
    description: "Cash-pay direct-to-patient workflow via CoAssist",
  },
  {
    value: "iAssist_PA_Approved",
    label: "4. iAssist",
    description: "Internal iAssist platform workflow with prior authorization approval",
  },
];
