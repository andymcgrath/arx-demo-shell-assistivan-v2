import type { FlowType } from "@/engine/types";
import type { ScreenMap } from "@/engine/workflow/screens";
import { COASSIST_SCREENS } from "./coassist/screens";
import { IASSIST_SCREENS } from "./iassist/screens";

/** Screen maps for workflows already on the screen list. Other flows still use the legacy route chain. */
const SCREEN_MAPS: ScreenMap[] = [COASSIST_SCREENS, IASSIST_SCREENS];

export function screenMapFor(flowType: FlowType): ScreenMap | undefined {
  return SCREEN_MAPS.find((m) => m.flows.includes(flowType));
}
