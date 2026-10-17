import type { FlowType } from "@/engine/types";
import type { ScreenMap } from "@/engine/workflow/screens";
import { COASSIST_SCREENS } from "./coassist/screens";
import { IASSIST_SCREENS } from "./iassist/screens";
import { STANDARD_SCREENS } from "./standard/screens";
import { PAP_SCREENS } from "./pap/screens";

/** Screen maps for every workflow. A flow's route, menu and stay-put screens come from its map. */
const SCREEN_MAPS: ScreenMap[] = [COASSIST_SCREENS, IASSIST_SCREENS, STANDARD_SCREENS, PAP_SCREENS];

export function screenMapFor(flowType: FlowType): ScreenMap | undefined {
  return SCREEN_MAPS.find((m) => m.flows.includes(flowType));
}
