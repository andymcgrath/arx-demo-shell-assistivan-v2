import { MODULE_CONTRACTS, type ModuleId } from "@/engine/workflow/components";
import { recipeMeets } from "@/engine/workflow/recipe";
import { scenarioFor } from "../scenarios";
import { CATALOG_FORKS, catalogBlock, catalogExit, catalogFork, exitFeeds, exitSteps, forkOwnerIndex, paletteCards } from "./index";
import { draftFromScenario, editorProblems, recipeFor, workflowForks, isEditorWorkflow } from "./editor";
import type { DemoRequest } from "./request";
import { buildStoryboard, waitsFor, type StoryboardInput, type WholeDemoBoard } from "./storyboard";
import type { CatalogApp, CatalogLane, CatalogStep, CatalogTrigger } from "./types";

/**
 * The Demo Lab canvas model. Pure: no React. It draws a draft request (`DemoRequest`): the cards in order, each fork under
 * its owner card, what each outcome feeds, and which cards the demo's picked outcome no longer feeds (they stay on the
 * canvas, disabled, with the reason). A recipe or a brand demo goes through `draftFromScenario` first, so the canvas
 * edits and draws the same thing.
 */

export interface CanvasCard {
  /** The card's index in `draft.cards`. Ghost cards count. */
  index: number;
  kind: "block" | "ghost";
  moduleId?: ModuleId;
  variantId?: string;
  label: string;
  /** The block's own name. A ghost card has none. */
  blockName: string;
  summary: string;
  apps: CatalogApp[];
  lane: CatalogLane;
  trigger: CatalogTrigger;
  steps: CatalogStep[];
  /** What the card waits for, in sales words. */
  inputs: string[];
  /** What the card sets, from its module contract. These are labels, not data fields. */
  outputs: string[];
  /** Why the card is disabled. Empty when the picked outcomes feed it. */
  disabled: string[];
}

export interface CanvasExit {
  id: string;
  label: string;
  description: string;
  /** Story fork: the demo picked this outcome. Patient fork: the demo pins it, so the patient does not choose. */
  selected: boolean;
  /** Blocks the outcome needs that the draft lacks. */
  missing: string[];
  payer?: "pharmacy" | "medical" | "none";
  paRequired?: boolean;
  /** For a patient fork: what the audience sees after this outcome in this recipe. */
  steps: CatalogStep[];
  /** The cards after the fork's owner that this outcome works with, and the ones it does not. */
  feeds: number[];
  leaves: number[];
}

export interface CanvasFork {
  id: string;
  label: string;
  chooser: "story" | "patient";
  /** The card the fork is drawn under. */
  ownerIndex: number;
  exits: CanvasExit[];
}

export interface CanvasMeta {
  title: string;
  description?: string;
  intake: "erx" | "fax" | "esign";
  workflow: string;
}

export interface CanvasBoard {
  kind: "canvas";
  meta: CanvasMeta;
  cards: CanvasCard[];
  forks: CanvasFork[];
  /** Forks the workflow declares that the draft does not pass through, for the toggle row. */
  otherForks: { id: string; label: string }[];
  /** Things the catalog could not draw. Empty for every recipe. */
  problems: string[];
  /** Why the draft cannot be exported yet (the editor's checks). */
  exportProblems: string[];
}

/** The canvas for a draft, with one demo's picks. */
export function canvasFromDraft(d: DemoRequest, demoIndex = 0): CanvasBoard {
  const problems: string[] = [];
  const picks = d.demos[demoIndex]?.choices ?? {};
  const editable = isEditorWorkflow(d.workflow);
  const recipe = recipeFor(d, picks);
  const modules = recipe.modules;

  // The module index of each block card, so ghost cards do not shift what a block waits for.
  let m = -1;
  const moduleOf: number[] = d.cards.map((c) => (c.kind === "block" ? ++m : -1));

  const cards: CanvasCard[] = d.cards.map((c, index) => {
    if (c.kind === "ghost") {
      const trigger = c.trigger ?? "click";
      return {
        index, kind: "ghost", label: c.name.trim() || "New block", blockName: "", summary: c.sees, apps: [c.app], lane: c.lane, trigger,
        steps: [{ label: c.sees.trim() || c.name.trim() || "New block", lane: c.lane, trigger }], inputs: [], outputs: [], disabled: [],
      };
    }
    const block = catalogBlock(c.moduleId);
    const pc = paletteCards(block).find((p) => p.variantId === (c.variantId === "default" ? undefined : c.variantId));
    if (!pc) problems.push(`no card for ${c.moduleId}${c.variantId ? `:${c.variantId}` : ""}`);
    return {
      index, kind: "block", moduleId: c.moduleId, ...(c.variantId ? { variantId: c.variantId } : {}),
      label: pc?.label ?? block.name, blockName: block.name, summary: pc?.summary ?? block.summary, apps: pc?.apps ?? block.apps,
      lane: pc?.lane ?? block.lane, trigger: pc?.trigger ?? block.trigger, steps: pc?.steps ?? [],
      inputs: waitsFor(recipe, moduleOf[index]), outputs: MODULE_CONTRACTS[c.moduleId]?.sets ?? [], disabled: [],
    };
  });

  const workflowForkList = editable ? workflowForks(d.workflow as never) : [];
  const forks: CanvasFork[] = workflowForkList
    .filter((f) => d.forks.includes(f.id))
    .map((f) => {
      const ownerModule = forkOwnerIndex(f.id, modules);
      let ownerIndex = ownerModule < 0 ? 0 : moduleOf.indexOf(ownerModule);
      if (ownerModule < 0) problems.push(`fork "${f.id}" has no owner block in this draft`);
      if (ownerIndex < 0) ownerIndex = 0;
      const chooser = f.chooser === "patient" ? "patient" : "story";
      const offered = f.exits.filter((e) => {
        const hidden = CATALOG_FORKS.find((c) => c.id === f.id)?.exits.find((x) => x.id === e.id)?.hiddenWith;
        return !hidden || !recipeMeets(recipe, hidden);
      });
      const exits = offered.map((e): CanvasExit => {
        const c = catalogExit(f.id, e.id);
        if (!c) problems.push(`no catalog entry for fork "${f.id}" exit "${e.id}"`);
        const after = cards.filter((x) => x.index > ownerIndex && x.kind === "block");
        const feeds = after.filter((x) => exitFeeds(f.id, e.id, { id: x.moduleId!, variantId: x.variantId })).map((x) => x.index);
        return {
          id: e.id,
          label: c?.label ?? e.label,
          description: c?.description ?? e.description ?? "",
          selected: picks[f.id] === e.id,
          missing: (e.requires ?? []).filter((r) => !recipeMeets(recipe, r)),
          ...(c?.payer ? { payer: c.payer, paRequired: c.paRequired } : {}),
          steps: chooser === "patient" ? exitSteps(f.id, e.id, modules) : [],
          feeds,
          leaves: after.filter((x) => !feeds.includes(x.index)).map((x) => x.index),
        };
      });
      // A story fork's picked outcome decides which cards stay live. A patient fork keeps every branch.
      const picked = exits.find((e) => e.selected);
      if (chooser === "story" && picked) for (const i of picked.leaves) cards[i].disabled.push(`${catalogFork(f.id)?.label ?? f.label}: "${picked.label}" does not work with this block.`);
      return { id: f.id, label: catalogFork(f.id)?.label ?? f.label, chooser, ownerIndex, exits };
    });

  return {
    kind: "canvas",
    meta: { title: d.title, description: d.demos[demoIndex]?.description, intake: d.intake, workflow: d.workflow },
    cards,
    forks,
    otherForks: workflowForkList.filter((f) => !d.forks.includes(f.id)).map((f) => ({ id: f.id, label: catalogFork(f.id)?.label ?? f.label })),
    problems,
    exportProblems: editorProblems(d),
  };
}

/** The canvas for a recipe or demo. A scenario with no recipe has no cards, so it comes back as the whole-demo board. */
export function buildCanvas(input: StoryboardInput): CanvasBoard | WholeDemoBoard {
  const scenario = scenarioFor(input.flow);
  if (!scenario?.recipe) {
    const board = buildStoryboard(input);
    if (board.kind === "whole") return board;
  }
  const draft = draftFromScenario(input.flow, { title: input.title, choices: input.choices });
  if (!draft) return buildStoryboard(input) as WholeDemoBoard;
  const canvas = canvasFromDraft(draft, 0);
  return { ...canvas, meta: { ...canvas.meta, description: input.description } };
}

