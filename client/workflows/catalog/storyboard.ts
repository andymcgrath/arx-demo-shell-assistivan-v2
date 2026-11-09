import type { FlowType } from "@/engine/types";
import { MODULE_CONTRACTS, SOURCES, type ModuleId, type ScenarioRecipe } from "@/engine/workflow/components";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeMeets } from "@/engine/workflow/recipe";
import { scenarioFor } from "../scenarios";
import { forksForFlow } from "../forks";
import { catalogBlock, catalogExit, catalogFork, paletteCards, CATALOG_WHOLE_DEMOS } from "./index";
import type { CatalogApp, CatalogLane, CatalogPayer, CatalogStep, CatalogTrigger, CatalogWholeDemo } from "./index";

/**
 * The Demo Lab storyboard as data. Pure: no React, no store. The lab draws it, and a test checks it for every recipe
 * and every brand demo. A recipe that draws wrongly means its catalog entry is wrong.
 *
 * It is not a chain. The route comes from data, so each block says what it waits for (`waitsFor`), read from the
 * module contract and the forks. The lab shows that as text, not as one line of boxes.
 */

/** Lanes in the order the lab draws them. */
export const STORYBOARD_LANES: CatalogLane[] = ["hcp", "patient", "agent", "system"];

export interface StoryboardBlock {
  moduleId: ModuleId;
  variantId?: string;
  /** The card's label: the block name, or the variant's label. */
  label: string;
  /** The block's own name, shown when the label is a variant's. */
  blockName: string;
  summary: string;
  apps: CatalogApp[];
  lane: CatalogLane;
  trigger: CatalogTrigger;
  steps: CatalogStep[];
  /** What must come first, in sales words: earlier blocks and the forks the block reads. */
  waitsFor: string[];
}

export interface StoryboardExit {
  id: string;
  label: string;
  description: string;
  /** The exit this demo takes. Only one per story-chosen fork. */
  selected: boolean;
  /** Blocks the exit needs that the recipe lacks. A non-empty list means the recipe cannot take this exit. */
  missing: string[];
  payer?: CatalogPayer;
  paRequired?: boolean;
}

export interface StoryboardFork {
  id: string;
  label: string;
  chooser: "story" | "patient";
  exits: StoryboardExit[];
}

export interface Storyboard {
  kind: "recipe";
  flow: FlowType;
  title: string;
  description?: string;
  /** The recipe's source: where the case starts. */
  source: string;
  intake: "erx" | "fax" | "esign";
  legacy: boolean;
  panels: string[];
  triage?: string;
  forks: StoryboardFork[];
  blocks: StoryboardBlock[];
  /** Anything the catalog could not draw. Empty for a recipe the catalog covers. */
  problems: string[];
}

/** A scenario of a workflow with no recipe: drawn as one card, not as blocks. */
export interface WholeDemoBoard {
  kind: "whole";
  flow: FlowType;
  title: string;
  description?: string;
  intake: "erx" | "fax" | "esign";
  legacy: boolean;
  demo: CatalogWholeDemo;
  problems: string[];
}

export type AnyStoryboard = Storyboard | WholeDemoBoard;

export interface StoryboardInput {
  flow: FlowType;
  title: string;
  description?: string;
  /** Fork id to exit id. These win over the scenario's own picks. */
  choices?: Record<string, string>;
}

/** True when the recipe has the module, and the variant when `req` is `module:variant`. */
export const recipeHas = (recipe: ScenarioRecipe, req: string): boolean => recipeMeets(recipe, req);

/** What a block waits for, from the module contract. Keys the source provides need no wait. */
function waitsFor(recipe: ScenarioRecipe, index: number): string[] {
  const spec = recipe.modules[index];
  const contract = MODULE_CONTRACTS[spec.id];
  const earlier = recipe.modules.slice(0, index);
  const provided = new Set<string>(SOURCES[recipe.source]?.provides ?? []);
  const out: string[] = [];
  const add = (s: string) => out.includes(s) || out.push(s);
  const blockName = (id: ModuleId) => catalogBlock(id).name;
  for (const key of contract.needs) {
    if (provided.has(key)) continue;
    if (key.startsWith("fork:")) {
      const id = key.slice(5);
      if (recipe.forks.includes(id)) add(catalogFork(id)?.label ?? id);
      continue;
    }
    const setter = earlier.find((m) => MODULE_CONTRACTS[m.id].sets.includes(key));
    if (setter) add(blockName(setter.id));
  }
  for (const id of [...(contract.needsModules ?? []), ...(contract.orderedAfter ?? [])]) if (earlier.some((m) => m.id === id)) add(blockName(id));
  return out;
}

/** One storyboard: the scenario's recipe drawn with the demo's picks over the scenario's own. */
export function buildStoryboard(input: StoryboardInput): AnyStoryboard {
  const scenario = scenarioFor(input.flow);
  const base = { flow: input.flow, title: input.title, description: input.description, intake: scenario?.intake ?? "erx", legacy: !!scenario?.legacy };
  if (!scenario) return { kind: "whole", ...base, demo: undefined as never, problems: [`no scenario for flow "${input.flow}"`] };
  const recipe = scenario.recipe;
  if (!recipe) {
    const demo = CATALOG_WHOLE_DEMOS.find((d) => d.flowType === input.flow);
    return { kind: "whole", ...base, demo: demo as CatalogWholeDemo, problems: demo ? [] : [`no whole-demo entry for "${input.flow}"`] };
  }

  const problems: string[] = [];
  const picks = { ...recipe.choices, ...scenario.choices, ...input.choices };

  const blocks = recipe.modules.map((spec, i): StoryboardBlock => {
    const variant = typeof spec.props?.variant === "string" ? spec.props.variant : undefined;
    const card = paletteCards(catalogBlock(spec.id)).find((c) => c.variantId === variant);
    if (!card) problems.push(`no card for ${spec.id}${variant ? `:${variant}` : ""}`);
    const block = catalogBlock(spec.id);
    return {
      moduleId: spec.id,
      ...(variant ? { variantId: variant } : {}),
      label: card?.label ?? block.name,
      blockName: block.name,
      summary: card?.summary ?? block.summary,
      apps: card?.apps ?? block.apps,
      lane: card?.lane ?? block.lane,
      trigger: card?.trigger ?? block.trigger,
      steps: card?.steps ?? [],
      waitsFor: waitsFor(recipe, i),
    };
  });

  const forks = forksForScenario(forksForFlow(input.flow), input.flow)
    .filter((f) => recipe.forks.includes(f.id))
    .map((f): StoryboardFork => {
      const picked = picks[f.id];
      if (f.chooser === "story" && picked && !f.exits.some((e) => e.id === picked)) problems.push(`fork "${f.id}" has no exit "${picked}"`);
      return {
        id: f.id,
        label: catalogFork(f.id)?.label ?? f.label,
        chooser: f.chooser === "patient" ? "patient" : "story",
        exits: f.exits.map((e) => {
          const c = catalogExit(f.id, e.id);
          if (!c) problems.push(`no catalog entry for fork "${f.id}" exit "${e.id}"`);
          return {
            id: e.id,
            label: c?.label ?? e.label,
            description: c?.description ?? e.description ?? "",
            // A patient's pick is live, so no exit is highlighted for it.
            selected: f.chooser !== "patient" && (picked ? picked === e.id : e.id === f.exits[0].id),
            missing: (e.requires ?? []).filter((r) => !recipeHas(recipe, r)),
            ...(c?.payer ? { payer: c.payer, paRequired: c.paRequired } : {}),
          };
        }),
      };
    });

  return {
    kind: "recipe",
    ...base,
    source: recipe.source,
    panels: recipe.panels ?? [],
    ...(recipe.triage ? { triage: recipe.triage } : {}),
    forks,
    blocks,
    problems,
  };
}
