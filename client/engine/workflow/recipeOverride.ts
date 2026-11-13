import type { FlowType } from "@/engine/types";
import type { ModuleSpec, ScenarioRecipe } from "./components";
import type { ScenarioDefinition } from "./types";

/**
 * A demo can run its own block list on an existing scenario. The scenario still supplies the content (pharmacies, prices)
 * and the forks. The demo supplies which blocks run, in what order (`DemoRecipe`).
 *
 * Every lookup of a scenario's recipe goes through `withRecipeOverride`, so the machine, the route and stage rules, and
 * the UI all read the same blocks. `startDemo` sets the override and a restore sets it again from the stored demo id.
 * One override per flow at a time, because only one demo runs at a time.
 *
 * Pure apart from the one map. No React, no store.
 */

/** What a demo changes about its scenario's recipe. Everything else (source, panels, triage) stays the scenario's. */
export interface DemoRecipe {
  /** The blocks that run, in journey order. */
  modules: ModuleSpec[];
  /** Ids of the forks the demo passes through. Absent keeps the scenario's list. */
  forks?: string[];
}

const overrides = new Map<FlowType, DemoRecipe>();

/** Sets or clears the recipe a flow runs. Passing undefined puts the scenario's own recipe back. */
export function setRecipeOverride(flow: FlowType, recipe: DemoRecipe | undefined): void {
  if (recipe) overrides.set(flow, recipe);
  else overrides.delete(flow);
}

export const recipeOverrideFor = (flow: FlowType): DemoRecipe | undefined => overrides.get(flow);

/** The recipe a scenario runs with a demo's blocks laid over it. */
export function composeRecipe(base: ScenarioRecipe, demo: DemoRecipe): ScenarioRecipe {
  return { ...base, ...(demo.forks ? { forks: demo.forks } : {}), modules: demo.modules };
}

/** The scenario with the flow's override applied, or the scenario as it is when there is none. */
export function withRecipeOverride<S extends ScenarioDefinition<any>>(scenario: S): S {
  const override = overrides.get(scenario.flowType);
  if (!override || !scenario.recipe) return scenario;
  return { ...scenario, recipe: composeRecipe(scenario.recipe, override) };
}
