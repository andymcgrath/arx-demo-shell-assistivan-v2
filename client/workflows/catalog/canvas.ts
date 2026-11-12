import { MODULE_CONTRACTS, type ModuleId } from "@/engine/workflow/components";
import { scenarioFor } from "../scenarios";
import { buildStoryboard, type Storyboard, type StoryboardBlock, type StoryboardExit, type StoryboardFork, type StoryboardInput, type WholeDemoBoard } from "./storyboard";
import { exitFeeds, exitSteps, forkOwnerIndex } from "./index";
import type { CatalogStep } from "./types";

/**
 * The Demo Lab canvas model. Pure: no React. It reads the storyboard and adds what the canvas needs: the cards in order
 * with what each takes in and sets, each fork under its owner card, what each outcome feeds, and which cards the picked
 * outcome no longer feeds (they stay on the canvas, disabled, with the reason).
 */

export interface CanvasCard extends StoryboardBlock {
  index: number;
  /** What the card waits for, in sales words (`waitsFor`). */
  inputs: string[];
  /** What the card sets, from its module contract. These are labels, not data fields. */
  outputs: string[];
  /** Why the card is disabled. Empty when the picked outcomes feed it. */
  disabled: string[];
}

export interface CanvasExit extends StoryboardExit {
  /** For a patient fork: what the audience sees after this outcome in this recipe. */
  steps: CatalogStep[];
  /** The cards after the fork's owner that this outcome works with, and the ones it does not. */
  feeds: number[];
  leaves: number[];
}

export interface CanvasFork extends Omit<StoryboardFork, "exits"> {
  /** The card the fork is drawn under. */
  ownerIndex: number;
  exits: CanvasExit[];
}

export interface CanvasBoard {
  kind: "canvas";
  /** The storyboard it was built from: title, intake, source, panels. */
  board: Storyboard;
  cards: CanvasCard[];
  forks: CanvasFork[];
  problems: string[];
}

/** The canvas for a recipe or demo. A scenario with no recipe has no cards, so it comes back as the whole-demo board. */
export function buildCanvas(input: StoryboardInput): CanvasBoard | WholeDemoBoard {
  const board = buildStoryboard(input);
  if (board.kind === "whole") return board;
  const modules = scenarioFor(board.flow)?.recipe?.modules ?? [];
  const problems = [...board.problems];

  const cards: CanvasCard[] = board.blocks.map((b, index) => ({
    ...b,
    index,
    inputs: b.waitsFor,
    outputs: MODULE_CONTRACTS[b.moduleId as ModuleId]?.sets ?? [],
    disabled: [],
  }));

  const forks: CanvasFork[] = board.forks.map((f) => {
    let ownerIndex = forkOwnerIndex(f.id, modules);
    if (ownerIndex < 0) {
      problems.push(`fork "${f.id}" has no owner block in this recipe`);
      ownerIndex = 0;
    }
    const exits = f.exits.map((e): CanvasExit => {
      const after = cards.filter((c) => c.index > ownerIndex);
      const feeds = after.filter((c) => exitFeeds(f.id, e.id, { id: c.moduleId, variantId: c.variantId })).map((c) => c.index);
      const leaves = after.filter((c) => !feeds.includes(c.index)).map((c) => c.index);
      return { ...e, steps: f.chooser === "patient" ? exitSteps(f.id, e.id, modules) : [], feeds, leaves };
    });
    // A story fork's picked outcome decides which cards stay live. A patient fork keeps every branch.
    if (f.chooser === "story") {
      const picked = exits.find((e) => e.selected);
      for (const i of picked?.leaves ?? []) cards[i].disabled.push(`${f.label}: "${picked!.label}" does not work with this block.`);
    }
    return { ...f, ownerIndex, exits };
  });

  return { kind: "canvas", board, cards, forks, problems };
}
