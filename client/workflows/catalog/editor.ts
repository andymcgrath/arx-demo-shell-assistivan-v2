import { MODULE_CONTRACTS, type ModuleId, type ScenarioRecipe, type SourceId } from "@/engine/workflow/components";
import { recipeProblems } from "@/engine/workflow/recipe";
import type { FlowType } from "@/engine/types";
import type { ForkDefinition } from "@/engine/workflow/types";
import { forksForScenario } from "@/engine/workflow/forks";
import { ALL_FORKS } from "../forks";
import { COASSIST_RECIPES } from "../coassist/recipes";
import { IASSIST_RECIPES } from "../iassist/recipes";
import { scenarioFor } from "../scenarios";
import { catalogBlock, catalogExit, catalogFork, exitFeeds, forkOwnerIndex, paletteCards, type PaletteCard } from "./index";
import { recipeHas } from "./storyboard";
import { validateDemoRequest, REQUEST_VERSION, type DemoRequest, type RequestBrand, type RequestCard, type RequestDemo, type RequestGhostCard, type RequestWorkflow } from "./request";
import { DEFAULT_VARIANT, type CatalogApp } from "./types";

/**
 * The Demo Lab's editing model. Pure: no React. A draft is a `DemoRequest` that may be incomplete. Every edit returns a
 * new draft. `editorProblems` says why a draft cannot be exported yet, and the palette uses the same ordering rules
 * (`recipeProblems`), so a greyed block and a blocked export agree.
 */

/** Workflows the editor builds. Standard and PAP have no recipes yet, so they stay whole demos. */
export const EDITOR_WORKFLOWS = ["iassist", "coassist"] as const satisfies readonly RequestWorkflow[];
export type EditorWorkflow = (typeof EDITOR_WORKFLOWS)[number];

const RECIPES: Record<EditorWorkflow, Record<string, ScenarioRecipe>> = { coassist: COASSIST_RECIPES, iassist: IASSIST_RECIPES };

const APP_ORDER: CatalogApp[] = ["crm", "patient", "provider", "field", "iassist", "rules", "web", "gateway"];

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const isEditorWorkflow = (w: string): w is EditorWorkflow => (EDITOR_WORKFLOWS as readonly string[]).includes(w);

/** The forks a workflow declares, one per id. Exits of same-id forks (the two pricing forks) are merged. */
export function workflowForks(workflow: EditorWorkflow): ForkDefinition[] {
  const flows = Object.keys(RECIPES[workflow]) as FlowType[];
  const byId = new Map<string, ForkDefinition>();
  for (const flow of flows) {
    for (const f of forksForScenario(ALL_FORKS, flow)) {
      const seen = byId.get(f.id);
      if (!seen) byId.set(f.id, { ...f, exits: [...f.exits] });
      else for (const e of f.exits) if (!seen.exits.some((x) => x.id === e.id)) seen.exits.push(e);
    }
  }
  return [...byId.values()];
}

/** The apps the cards touch, in a fixed order. */
export function deriveApps(cards: RequestCard[]): CatalogApp[] {
  const used = new Set<CatalogApp>();
  for (const c of cards) {
    if (c.kind === "ghost") used.add(c.app);
    else for (const card of paletteCards(catalogBlock(c.moduleId))) if (card.variantId === c.variantId) card.apps.forEach((a) => used.add(a));
  }
  return APP_ORDER.filter((a) => used.has(a));
}

const withApps = (d: DemoRequest): DemoRequest => ({ ...d, apps: deriveApps(d.cards) });

const emptyBrand = { name: "", drug: "", documents: [] as string[] };

/** The request's brand block, read from the active brand file: the manufacturer name, the drug, and the brand's color source when it is a URL. */
export function requestBrand(b: { manufacturer: { name: string }; program: { drugDisplayName: string; colors?: { source?: string } } }): RequestBrand {
  const source = b.program.colors?.source;
  return { name: b.manufacturer.name, drug: b.program.drugDisplayName, ...(source && /^https?:\/\//.test(source) ? { sourceUrl: source } : {}), documents: [] };
}

/** A blank draft: BI is always first, with one empty demo. `brand` fills the brand block (see `requestBrand`). */
export function blankDraft(workflow: EditorWorkflow, client = "", brand?: RequestBrand): DemoRequest {
  return {
    version: REQUEST_VERSION,
    client,
    slug: "",
    title: "",
    workflow,
    intake: "erx",
    apps: [],
    forks: ["bi"],
    cards: [],
    demos: [{ id: "demo-1", label: "", choices: {} }],
    brand: brand ? { ...brand, documents: [...brand.documents] } : { ...emptyBrand },
    winTheme: "",
    openQuestions: [],
  };
}

/** Whether the scenario has a BI fork. The HCP enrollment ends before BI, so its draft and demos carry no pick for it. */
export const scenarioHasBi = (flow: FlowType): boolean => forksForScenario(ALL_FORKS, flow).some((f) => f.id === "bi");

/** A ready-made draft from a scenario's recipe, and a demo's picks over it. Undefined for a scenario with no recipe. */
export function draftFromScenario(flow: FlowType, opts: { title: string; client?: string; brand?: RequestBrand; choices?: Record<string, string> }): DemoRequest | undefined {
  const scenario = scenarioFor(flow);
  const recipe = scenario?.recipe;
  if (!scenario || !recipe) return undefined;
  const workflow: EditorWorkflow = recipe.source === "iassist" ? "iassist" : "coassist";
  const forks = [...new Set([...(scenarioHasBi(flow) ? ["bi"] : []), ...recipe.forks])];
  const choices = Object.fromEntries(Object.entries({ ...recipe.choices, ...scenario.choices, ...opts.choices }).filter(([k]) => forks.includes(k)));
  return withApps({
    ...blankDraft(workflow, opts.client, opts.brand),
    title: opts.title,
    slug: slugOf(opts.title),
    intake: scenario.intake,
    forks,
    cards: recipe.modules.map((m): RequestCard => ({ kind: "block", moduleId: m.id, ...(typeof m.props?.variant === "string" ? { variantId: m.props.variant } : {}) })),
    demos: [{ id: slugOf(opts.title) || "demo-1", label: opts.title, choices }],
  });
}

/** The recipe a draft describes, for the ordering checks. Ghost cards have no contract and are skipped. */
export function recipeFor(d: DemoRequest, choices: Record<string, string> = {}): ScenarioRecipe {
  return {
    source: d.workflow as SourceId,
    forks: d.forks,
    choices,
    modules: d.cards.flatMap((c) => (c.kind === "block" ? [{ id: c.moduleId, ...(c.variantId && c.variantId !== DEFAULT_VARIANT ? { props: { variant: c.variantId } } : {}) }] : [])),
  };
}

const WORKFLOW_NAME: Record<string, string> = { coassist: "CoAssist", iassist: "iAssist" };
const onlyFor = (label: string, workflows: string[]) => `${label} is built for ${workflows.map((w) => WORKFLOW_NAME[w] ?? w).join(" and ")} only.`;

const name = (id: string) => catalogBlock(id.split(":")[0] as ModuleId)?.name ?? id;
const forkName = (id: string) => catalogFork(id)?.label ?? id;
/** The block that sets a key, in sales words. */
const setterOf = (key: string): string => {
  const id = (Object.keys(MODULE_CONTRACTS) as ModuleId[]).find((m) => MODULE_CONTRACTS[m].sets.includes(key));
  return id ? `"${name(id)}"` : `something that sets ${key}`;
};

/** A `recipeProblems` line in sales words. Lines it does not know pass through. */
export function plainProblem(p: string): string {
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^(\w+) needs "fork:(\w+)", and nothing/))) return `${name(m[1])} needs the "${forkName(m[2])}" fork. Add it to the forks.`;
  if ((m = p.match(/^(\w+) needs "(\w+)", and nothing/))) return `${name(m[1])} needs ${setterOf(m[2])} before it.`;
  if ((m = p.match(/^(\w+) needs (\w+) earlier in the recipe$/))) return `${name(m[1])} needs "${name(m[2])}" before it.`;
  if ((m = p.match(/^(\w+) must come after (\w+)$/))) return `${name(m[1])} must come after "${name(m[2])}".`;
  if ((m = p.match(/^module "(\w+)" appears twice$/))) return `"${name(m[1])}" is in the demo twice.`;
  if (p === "tracking must be last") return `"${name("tracking")}" must be last.`;
  if ((m = p.match(/^fork "(\w+)" exit "(\w+)" requires ([\w:|]+) in the recipe$/))) return `The "${forkName(m[1])}" pick "${m[2]}" needs "${m[3].split("|").map(name).join('" or "')}" in the demo.`;
  return p;
}

/** Why a block cannot go next, in sales words. Empty when it can. */
export function appendReasons(d: DemoRequest, card: PaletteCard): string[] {
  if (card.workflows && !card.workflows.includes(d.workflow)) return [onlyFor(card.label, card.workflows)];
  const before = new Set(recipeProblems(recipeFor(d)));
  const next: RequestCard = { kind: "block", moduleId: card.moduleId, ...(card.variantId ? { variantId: card.variantId } : {}) };
  const after = recipeProblems(recipeFor({ ...d, cards: [...d.cards, next] }));
  return after.filter((p) => !before.has(p)).map(plainProblem);
}

/**
 * Why a block cannot go at `at` (0 puts it first, the card count puts it last), in sales words. Empty when it can.
 * Two kinds of reason: the ordering rules (the same ones `appendReasons` uses), and a story fork's picked outcome that
 * the block does not work with, for a block that would sit after that fork's owner card. `demoIndex` says whose picks.
 */
export function insertReasons(d: DemoRequest, at: number, card: PaletteCard, demoIndex = 0): string[] {
  if (card.workflows && !card.workflows.includes(d.workflow)) return [onlyFor(card.label, card.workflows)];
  const next: RequestCard = { kind: "block", moduleId: card.moduleId, ...(card.variantId ? { variantId: card.variantId } : {}) };
  const placed = (cards: RequestCard[]) => [...cards.slice(0, at), next, ...cards.slice(at)];
  const before = new Set(recipeProblems(recipeFor(d)));
  const out = recipeProblems(recipeFor({ ...d, cards: placed(d.cards) })).filter((p) => !before.has(p)).map(plainProblem);

  const picks = d.demos[demoIndex]?.choices ?? {};
  const modules = recipeFor(d).modules;
  // Position among the blocks only: ghost cards are not modules.
  const moduleAt = d.cards.slice(0, at).filter((c) => c.kind === "block").length;
  for (const forkId of d.forks) {
    const exitId = picks[forkId];
    const fork = workflowForks(d.workflow as EditorWorkflow).find((f) => f.id === forkId);
    if (!exitId || fork?.chooser !== "story") continue;
    const owner = forkOwnerIndex(forkId, modules);
    if (owner >= 0 && moduleAt > owner && !exitFeeds(forkId, exitId, { id: card.moduleId, variantId: card.variantId })) {
      out.push(`"${card.label}" does not work with "${catalogExit(forkId, exitId)?.label ?? exitId}" (${forkName(forkId)}). Pick another outcome first.`);
    }
  }
  return out;
}

/** The blocks an exit needs that the draft lacks. A non-empty list means the exit is not available. */
export const exitMissing = (d: DemoRequest, exit: { requires?: string[] }): string[] => (exit.requires ?? []).filter((r) => !recipeHas(recipeFor(d), r));

/** Why a draft cannot be exported. Empty means it can. */
export function editorProblems(d: DemoRequest): string[] {
  const out = new Set<string>();
  const shape = validateDemoRequest(d);
  if (!shape.ok) shape.problems.forEach((p) => out.add(p));

  if (!isEditorWorkflow(d.workflow)) {
    out.add(`the editor builds ${EDITOR_WORKFLOWS.join(" and ")} demos`);
    return [...out];
  }
  const forks = workflowForks(d.workflow);
  recipeProblems(recipeFor(d)).forEach((p) => out.add(plainProblem(p)));
  for (const c of d.cards) {
    if (c.kind !== "block" || !c.variantId) continue;
    const card = paletteCards(catalogBlock(c.moduleId)).find((p) => p.variantId === c.variantId);
    if (card?.workflows && !card.workflows.includes(d.workflow)) out.add(onlyFor(card.label, card.workflows));
  }
  d.demos.forEach((demo, i) => {
    const at = demo.label.trim() ? `Demo "${demo.label}"` : `Demo ${i + 1}`;
    for (const f of forks.filter((x) => d.forks.includes(x.id) && x.chooser === "story")) {
      if (!demo.choices[f.id]) out.add(`${at} has no pick for the "${forkName(f.id)}" fork.`);
    }
    // Only the exit rules: shape and unknown names are reported above.
    for (const p of recipeProblems({ ...recipeFor(d, demo.choices) }, forks)) {
      if (/ requires /.test(p) && /^fork /.test(p)) out.add(`${at}: ${plainProblem(p)}`);
    }
  });
  return [...out];
}

/** The draft as an object that is safe to export: apps follow the cards. */
export const exportable = (d: DemoRequest): DemoRequest => withApps(d);

// ---- Edits. Each returns a new draft with the apps kept in step. ----

export const addBlock = (d: DemoRequest, card: PaletteCard): DemoRequest =>
  withApps({ ...d, cards: [...d.cards, { kind: "block", moduleId: card.moduleId, ...(card.variantId ? { variantId: card.variantId } : {}) }] });

/** Put a block at `at`: 0 first, the card count last. */
export const insertBlock = (d: DemoRequest, at: number, card: PaletteCard): DemoRequest => {
  const next: RequestCard = { kind: "block", moduleId: card.moduleId, ...(card.variantId ? { variantId: card.variantId } : {}) };
  return withApps({ ...d, cards: [...d.cards.slice(0, at), next, ...d.cards.slice(at)] });
};

/** Change a block card's variant. `undefined` or `default` clears it. A ghost card has none. */
export const setVariant = (d: DemoRequest, index: number, variantId?: string): DemoRequest =>
  withApps({
    ...d,
    cards: d.cards.map((c, i) => {
      if (i !== index || c.kind !== "block") return c;
      const { variantId: _old, ...rest } = c;
      return variantId && variantId !== DEFAULT_VARIANT ? { ...rest, variantId } : rest;
    }),
  });

export const GHOST_BLANK: RequestGhostCard = { kind: "ghost", name: "", sees: "", app: "crm", lane: "agent" };

export const addGhost = (d: DemoRequest): DemoRequest => withApps({ ...d, cards: [...d.cards, { ...GHOST_BLANK }] });

/** Put a ghost card at `at`. */
export const insertGhost = (d: DemoRequest, at: number): DemoRequest => withApps({ ...d, cards: [...d.cards.slice(0, at), { ...GHOST_BLANK }, ...d.cards.slice(at)] });

export const updateCard = (d: DemoRequest, index: number, patch: Partial<RequestGhostCard>): DemoRequest =>
  withApps({ ...d, cards: d.cards.map((c, i) => (i === index && c.kind === "ghost" ? { ...c, ...patch } : c)) });

export const removeCard = (d: DemoRequest, index: number): DemoRequest => withApps({ ...d, cards: d.cards.filter((_, i) => i !== index) });

export function moveCard(d: DemoRequest, index: number, by: -1 | 1): DemoRequest {
  const to = index + by;
  if (to < 0 || to >= d.cards.length) return d;
  const cards = [...d.cards];
  [cards[index], cards[to]] = [cards[to], cards[index]];
  return { ...d, cards };
}

/** Add or remove a fork. `bi` stays. Removing a fork clears every demo's pick for it. */
export function toggleFork(d: DemoRequest, forkId: string): DemoRequest {
  if (forkId === "bi") return d;
  if (d.forks.includes(forkId)) {
    return { ...d, forks: d.forks.filter((f) => f !== forkId), demos: d.demos.map((x) => ({ ...x, choices: Object.fromEntries(Object.entries(x.choices).filter(([k]) => k !== forkId)) })) };
  }
  return { ...d, forks: [...d.forks, forkId] };
}

export const setPick = (d: DemoRequest, demoIndex: number, forkId: string, exitId: string): DemoRequest => ({
  ...d,
  demos: d.demos.map((x, i) => (i === demoIndex ? { ...x, choices: { ...x.choices, [forkId]: exitId } } : x)),
});

/** Clear a demo's pick for a fork. For a patient fork this means the patient picks live again. */
export const clearPick = (d: DemoRequest, demoIndex: number, forkId: string): DemoRequest => ({
  ...d,
  demos: d.demos.map((x, i) => (i === demoIndex ? { ...x, choices: Object.fromEntries(Object.entries(x.choices).filter(([k]) => k !== forkId)) } : x)),
});

export function addDemo(d: DemoRequest): DemoRequest {
  const n = d.demos.length + 1;
  return { ...d, demos: [...d.demos, { id: `demo-${n}`, label: "", choices: {} }] };
}

export const removeDemo = (d: DemoRequest, index: number): DemoRequest => (d.demos.length < 2 ? d : { ...d, demos: d.demos.filter((_, i) => i !== index) });

export const updateDemo = (d: DemoRequest, index: number, patch: Partial<Pick<RequestDemo, "label" | "description" | "id">>): DemoRequest => ({
  ...d,
  demos: d.demos.map((x, i) => (i === index ? { ...x, ...patch } : x)),
});
