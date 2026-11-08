import type { FlowType } from "@/engine/types";
import { forksForScenario, choiceProblems } from "@/engine/workflow/forks";
import type { BrandDemo } from "@/brand/schema";
import { forksForFlow } from "../forks";
import { ALL_SCENARIOS } from "../scenarios";
import { editorProblems } from "./editor";
import { ghostCards, type DemoRequest } from "./request";

/**
 * Plan for `pnpm demo:apply`: a request with no ghost cards becomes `demos` entries in the client's brand file. No model.
 *
 * What it does not do: write a recipe. The machine reads a recipe's module set and variants, and the recipe belongs to
 * one flow and one scenario's content. So the request's blocks must match an existing recipe. When none does, the
 * request goes through the generated prompt instead, and this says how far off the closest recipe is.
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
      forksMatch: sameSet([...new Set(["bi", ...s.recipe!.forks])], forks),
    };
  });
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
  if (match.length !== 1) {
    const closest = [...all].sort((a, b) => a.missing.length + a.extra.length - (b.missing.length + b.extra.length))[0];
    const why = match.length > 1
      ? `${match.length} recipes match (${match.map((m) => m.flow).join(", ")}), so it cannot choose one.`
      : closest
        ? `no recipe has these blocks. Closest is ${closest.flow}${closest.missing.length ? `, which also has ${closest.missing.join(", ")}` : ""}${closest.extra.length ? `, and lacks ${closest.extra.join(", ")}` : ""}${closest.intake !== request.intake ? `, and its intake is ${closest.intake}` : ""}${!closest.forksMatch ? ", and its forks differ" : ""}.`
        : `there is no ${request.workflow} recipe.`;
    return { ok: false, problems: [`${why} Apply writes demos for an existing recipe only. Use the generated prompt for a new one.`] };
  }
  const { flow, order } = match[0];

  const forks = forksForFlow(flow);
  const bad = request.demos.flatMap((d) => choiceProblems(forks, flow, d.choices).map((p) => `demo "${d.id}": ${p}`));
  if (bad.length) return { ok: false, problems: bad };
  // Every named fork must apply to this flow, since a pick on another flow's fork is silently ignored.
  const applies = new Set(forksForScenario(forks, flow).map((f) => f.id));
  const stray = request.demos.flatMap((d) => Object.keys(d.choices).filter((k) => !applies.has(k)).map((k) => `demo "${d.id}" picks fork "${k}", which ${flow} does not have`));
  if (stray.length) return { ok: false, problems: stray };

  const notes: string[] = [];
  if (have.join() !== order.join()) notes.push(`The request lists its blocks in a different order from ${flow}. The machine follows the recipe's own order.`);

  const demos: BrandDemo[] = request.demos.map((d) => ({
    id: d.id,
    flow,
    label: d.label,
    ...(d.description ? { description: d.description } : {}),
    ...(Object.keys(d.choices).length ? { choices: d.choices } : {}),
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

  return { ok: true, flow, brand, created, demos, notes };
}

/** New demos replace an entry with the same id and are appended otherwise. The brand's other demos stay. */
export function mergeDemos(current: BrandDemo[], incoming: BrandDemo[]): BrandDemo[] {
  const next = current.map((d) => incoming.find((n) => n.id === d.id) ?? d);
  return [...next, ...incoming.filter((d) => !current.some((c) => c.id === d.id))];
}
