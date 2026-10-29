import type { FlowType } from "@/engine/types";
import type { ForkDefinition } from "@/engine/workflow/types";
import { biForkFor, COASSIST_FORKS } from "./coassist/forks";
import { COASSIST_FLOWS } from "./coassist/scenarios";
import { IASSIST_FORKS } from "./iassist/forks";

/** Every declared fork. The CRM draws its branch buttons from this, and the brand test checks demo choices against it. */
export const ALL_FORKS: ForkDefinition[] = [...COASSIST_FORKS, ...IASSIST_FORKS];

/**
 * The forks a demo on this flow can pick from. A CoAssist scenario with its own rungs reaches only some `bi` exits
 * (`biForkFor`), and the machine would fall back to the first reachable one for a pin outside them. So a pin has to
 * name a reachable exit. Other flows take every declared fork.
 */
export const forksForFlow = (flowType: FlowType): ForkDefinition[] =>
  COASSIST_FLOWS.includes(flowType) ? ALL_FORKS.map((f) => (f.id === "bi" && f.scenarios?.includes(flowType) ? biForkFor(flowType) : f)) : ALL_FORKS;
