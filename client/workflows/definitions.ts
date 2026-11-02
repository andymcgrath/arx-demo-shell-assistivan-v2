import type { FlowType } from "@/engine/types";
import type { WorkflowDefinition } from "@/engine/workflow/types";
import { coassistDefinition } from "./coassist";
import { iassistDefinition } from "./iassist";
import { papDefinition } from "./pap";
import { standardDefinition } from "./standard";

/** Every workflow definition, the same objects the machines are built from. */
export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [coassistDefinition, iassistDefinition, standardDefinition, papDefinition];

/** The definition that runs a flow. UI and tools read rules and scenarios through this, never `flowType ===`. */
export function definitionFor(flowType: FlowType): WorkflowDefinition | undefined {
  return WORKFLOW_DEFINITIONS.find((d) => d.scenarios[flowType]);
}
