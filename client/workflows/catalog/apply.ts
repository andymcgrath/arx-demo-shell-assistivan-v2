import type { FlowType } from "@/engine/types";
import { forksForScenario, choiceProblems } from "@/engine/workflow/forks";
import { composeRecipe, type DemoRecipe } from "@/engine/workflow/recipeOverride";
import { recipeProblems } from "@/engine/workflow/recipe";
import type { ModuleSpec } from "@/engine/workflow/components";
import type { BrandDemo } from "@/brand/schema";
import { forksForFlow } from "../forks";
import { ALL_SCENARIOS } from "../scenarios";
import { editorProblems, scenarioHasBi } from "./editor";
import { ghostCards, type DemoRequest } from "./request";

/**
 * Plan for `pnpm demo:apply`: a request with no ghost cards becomes `demos` entries in the client's brand file. No model.
 *
 * When the request's blocks match an existing recipe, the demo points at that flow. When none does, the demo runs on the
 * closest scenario that has the same intake and every fork the request names, and carries its own block list
 * (`BrandDemo.recipe`). The scenario still supplies the content. The composed list must pass the same ordering checks as
 * a recipe, so a bad order is rejected here. What apply cannot build is a ghost card: that needs the generated prompt.
 *
 * Pure. The script reads and writes the files.
 */

type Json = Record<string, unknown>;

export interface ApplyPlan {
  ok: true;
  /** The recipe's flow. */
  flow: FlowType;
  /** The full brand file to write. */
  brand: Json;
  /** True when the brand file did not exist and this builds a minimal one. */
  created: boolean;
  demos: BrandDemo[];
  notes: string[];
  /** True when the blocks matched no recipe and the demos carry their own. */
  composed: boolean;
}

export type ApplyResult = ApplyPlan | { ok: false; problems: string[] };

const workflowOf = (source: string): string => (source === "iassist" ? "iassist" : "coassist");

/** Blocks as `module:variant` keys, so two lists compare as sets. */
const keysOf = (modules: { id: string; props?: Record<string, unknown> }[]): string[] =>
  modules.map((m) => `${m.id}:${typeof m.props?.variant === "string" ? m.props.variant : "default"}`);

const requestKeys = (r: DemoRequest): string[] =>
  r.cards.flatMap((c) => (c.kind === "block" ? [`${c.moduleId}:${c.variantId && c.variantId !== "default" ? c.variantId : "default"}`] : []));

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** The recipes of the request's workflow and intake, with how far each is from the request's blocks. */
function candidates(r: DemoRequest) {
  const have = requestKeys(r);
  const forks = [...new Set(r.forks)];
  return ALL_SCENARIOS.filter((s) => s.recipe && workflowOf(s.recipe.source) === r.workflow).map((s) => {
    const want = keysOf(s.recipe!.modules);
    return {
      flow: s.flowType,
      intake: s.intake,
      order: want,
      missing: want.filter((k) => !have.includes(k)),
      extra: have.filter((k) => !want.includes(k)),
      forksMatch: sameSet([...new Set([...(scenarioHasBi(s.flowType) ? ["bi"] : []), ...s.recipe!.forks])], forks),
    };
  });
}

/** The request's blocks as module specs, in the order the canvas shows them. */
const requestModules = (r: DemoRequest): ModuleSpec[] =>
  r.cards.flatMap((c): ModuleSpec[] => (c.kind === "block" ? [{ id: c.moduleId, ...(c.variantId && c.variantId !== "default" ? { props: { variant: c.variantId } } : {}) }] : []));

/**
 * The scenario a composed demo runs on: same intake, and it declares every fork the request names (a pick on a fork the
 * scenario lacks would be ignored). Of those, the one whose blocks are closest to the request's, so its content fits.
 */
function baseFor(r: DemoRequest, all: ReturnType<typeof candidates>): { flow: FlowType; order: string[] } | { problem: string } {
  const named = [...new Set(r.forks)];
  const sameIntake = all.filter((c) => c.intake === r.intake);
  if (!sameIntake.length) return { problem: `there is no ${r.workflow} scenario with ${r.intake} intake to run these blocks on. Use the generated prompt.` };
  const fits = sameIntake.filter((c) => {
    const declared = new Set(forksForScenario(forksForFlow(c.flow), c.flow).map((f) => f.id));
    return named.every((f) => declared.has(f));
  });
  if (!fits.length) return { problem: `no ${r.workflow} scenario with ${r.intake} intake declares all of the forks ${named.join(", ")}. Use the generated prompt.` };
  const [closest] = [...fits].sort((a, b) => a.missing.length + a.extra.length - (b.missing.length + b.extra.length));
  return { flow: closest.flow, order: closest.order };
}

/** `parent` is the brand a new brand file extends. The script names it, so no brand name lives in source. */
export function planApply(request: DemoRequest, existing: Json | undefined, parent: string): ApplyResult {
  const problems = editorProblems(request);
  if (problems.length) return { ok: false, problems: ["the request is not ready:", ...problems] };
  const ghosts = ghostCards(request);
  if (ghosts.length) {
    return { ok: false, problems: [`the request has ${ghosts.length} ghost card${ghosts.length === 1 ? "" : "s"} (${ghosts.map((g) => g.name).join(", ")}). Apply builds nothing new. Use the generated prompt.`] };
  }

  const all = candidates(request);
  const have = requestKeys(request);
  const match = all.filter((c) => !c.missing.length && !c.extra.length && c.intake === request.intake && c.forksMatch);
  if (match.length > 1) {
    return { ok: false, problems: [`${match.length} recipes match (${match.map((m) => m.flow).join(", ")}), so it cannot choose one.`] };
  }

  let flow: FlowType;
  let order: string[];
  let composed: DemoRecipe | undefined;
  if (match.length === 1) {
    ({ flow, order } = match[0]);
  } else {
    const base = baseFor(request, all);
    if ("problem" in base) return { ok: false, problems: [base.problem] };
    flow = base.flow;
    order = base.order;
    composed = { modules: requestModules(request), forks: [...new Set(request.forks)] };
  }

  const forks = forksForFlow(flow);
  const bad = request.demos.flatMap((d) => choiceProblems(forks, flow, d.choices).map((p) => `demo "${d.id}": ${p}`));
  if (bad.length) return { ok: false, problems: bad };
  // Every named fork must apply to this flow, since a pick on another flow's fork is silently ignored.
  const applies = new Set(forksForScenario(forks, flow).map((f) => f.id));
  const stray = request.demos.flatMap((d) => Object.keys(d.choices).filter((k) => !applies.has(k)).map((k) => `demo "${d.id}" picks fork "${k}", which ${flow} does not have`));
  if (stray.length) return { ok: false, problems: stray };

  const notes: string[] = [];
  if (composed) {
    // The composed list gets the checks a recipe gets, once per demo, with that demo's picks over the scenario's.
    const scenario = ALL_SCENARIOS.find((s) => s.flowType === flow)!;
    const applying = forksForScenario(forks, flow);
    const orderProblems = request.demos.flatMap((d) =>
      recipeProblems({ ...composeRecipe(scenario.recipe!, composed!), choices: { ...scenario.recipe!.choices, ...scenario.choices, ...d.choices } }, applying).map((p) => `demo "${d.id}": ${p}`),
    );
    if (orderProblems.length) return { ok: false, problems: ["the blocks cannot run in this order:", ...orderProblems] };
    notes.push(`No existing recipe has these blocks, so the demo runs on ${flow} (content and forks) with its own block list.`);
  } else if (have.join() !== order.join()) notes.push(`The request lists its blocks in a different order from ${flow}. The machine follows the recipe's own order.`);

  const demos: BrandDemo[] = request.demos.map((d) => ({
    id: d.id,
    flow,
    label: d.label,
    ...(d.description ? { description: d.description } : {}),
    ...(Object.keys(d.choices).length ? { choices: d.choices } : {}),
    ...(composed ? { recipe: composed } : {}),
  }));

  const created = !existing;
  const brand: Json = created
    ? {
        extends: parent,
        slug: request.client,
        name: request.brand.name,
        title: `${request.brand.name} Demo`,
        demos,
        manufacturer: { name: request.brand.name },
        program: { drugDisplayName: request.brand.drug },
      }
    : { ...existing, demos: mergeDemos(Array.isArray(existing!.demos) ? (existing!.demos as BrandDemo[]) : [], demos) };
  if (created) notes.push(`Created a minimal brand file that extends "${parent}". It has the brand name and drug name only. Add colors, logos, and copy by hand (docs/BRANDS.md).`);
  else if (!Array.isArray(existing!.demos)) notes.push("The brand file has no demos of its own, so it now lists only these. The parent's demos no longer show.");

  return { ok: true, flow, brand, created, demos, notes, composed: !!composed };
}

/** New demos replace an entry with the same id and are appended otherwise. The brand's other demos stay. */
export function mergeDemos(current: BrandDemo[], incoming: BrandDemo[]): BrandDemo[] {
  const next = current.map((d) => incoming.find((n) => n.id === d.id) ?? d);
  return [...next, ...incoming.filter((d) => !current.some((c) => c.id === d.id))];
}
