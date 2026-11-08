import { useMemo } from "react";
import { BRAND } from "@/brand";
import { workflowRegistry } from "@/engine/WorkflowRegistry";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import type { FlowType } from "@/engine/types";

/** What the Demo Lab can draw or start from: the active brand's demos, every recipe, and the workflows with no recipe. */

export interface Item {
  key: string;
  group: string;
  flow: FlowType;
  title: string;
  description?: string;
  choices?: Record<string, string>;
}

export function useItems(): Item[] {
  return useMemo(() => {
    const label = (flow: string) => workflowRegistry.listWorkflows().find((w) => w.id === flow)?.label ?? flow;
    const demos: Item[] = (BRAND.demos ?? []).map((d) => ({ key: `demo:${d.id}`, group: `Demos in ${BRAND.name}`, flow: d.flow, title: d.label, description: d.description, choices: d.choices }));
    const recipes: Item[] = ALL_SCENARIOS.filter((s) => s.recipe).map((s) => ({ key: `recipe:${s.flowType}`, group: "Recipes", flow: s.flowType, title: label(s.flowType) }));
    const whole: Item[] = ALL_SCENARIOS.filter((s) => !s.recipe).map((s) => ({ key: `whole:${s.flowType}`, group: "Whole demos (no recipe yet)", flow: s.flowType, title: label(s.flowType) }));
    return [...demos, ...recipes, ...whole];
  }, []);
}
