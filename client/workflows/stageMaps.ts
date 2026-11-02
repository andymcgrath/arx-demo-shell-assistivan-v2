import type { FlowType } from "@/engine/types";
import type { StageMap } from "@/engine/workflow/stages";
import { COASSIST_STAGES } from "./coassist/stages";
import { IASSIST_STAGES } from "./iassist/stages";
import { STANDARD_STAGES } from "./standard/stages";
import { PAP_STAGES } from "./pap/stages";

/** Stage maps for every workflow. The CRM's stage list and stage signals come from the flow's map. */
export const STAGE_MAPS: StageMap[] = [COASSIST_STAGES, IASSIST_STAGES, STANDARD_STAGES, PAP_STAGES];

/** The flow's map. An unknown flow gets the standard list, as the CRM page always did. */
export function stageMapFor(flowType: FlowType): StageMap {
  return STAGE_MAPS.find((m) => m.flows.includes(flowType)) ?? STANDARD_STAGES;
}
