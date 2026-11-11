import type { ModuleId } from "@/engine/workflow/components";
import { ALL_FORKS } from "../forks";
import { CATALOG_BLOCKS } from "./blocks";
import { DEFAULT_VARIANT, type CatalogApp, type CatalogLane, type CatalogTrigger } from "./types";

/**
 * A demo request: what sales wants built, as one JSON file. The file is the source of truth. The generated prompt
 * points at it and does not carry the storyboard.
 *
 * This file is the type and the validator. It checks shape and names: every block, variant, fork, and exit must exist,
 * and every ghost card must say what the audience sees, which app, and who triggers it. It does not check block
 * order against `needs`. The editor does that (plan step 5).
 */

export const REQUEST_VERSION = 1;

export const REQUEST_WORKFLOWS = ["coassist", "iassist", "standard", "pap"] as const;
export type RequestWorkflow = (typeof REQUEST_WORKFLOWS)[number];

export const REQUEST_INTAKES = ["erx", "fax", "esign"] as const;
export type RequestIntake = (typeof REQUEST_INTAKES)[number];

const APPS: CatalogApp[] = ["crm", "patient", "provider", "field", "iassist", "rules", "web", "gateway"];
const LANES: CatalogLane[] = ["hcp", "patient", "agent", "system"];
const TRIGGERS: CatalogTrigger[] = ["click", "text", "automatic", "view"];

/** A block from the catalog, with the variant when it has one. Omit `variantId` for the `default` variant. */
export interface RequestBlockCard {
  kind: "block";
  moduleId: ModuleId;
  variantId?: string;
}

/**
 * Something new. The prompt builds it as a block. Required: what the audience sees, the app, and who triggers it.
 */
export interface RequestGhostCard {
  kind: "ghost";
  /** A short name. */
  name: string;
  /** What the audience sees. */
  sees: string;
  app: CatalogApp;
  /** Who triggers it. */
  lane: CatalogLane;
  trigger?: CatalogTrigger;
}

export type RequestCard = RequestBlockCard | RequestGhostCard;

/** One outcome. Each outcome is a demo: a fork pick per fork, like a `demos` entry in the brand file. */
export interface RequestDemo {
  id: string;
  label: string;
  description?: string;
  /** Fork id to exit id. */
  choices: Record<string, string>;
}

export interface RequestBrand {
  name: string;
  drug: string;
  sourceUrl?: string;
  documents: string[];
}

export interface DemoRequest {
  version: typeof REQUEST_VERSION;
  /** The client slug. It names the folder under `docs/demos/`. */
  client: string;
  /** The request slug. It names the files. */
  slug: string;
  title: string;
  workflow: RequestWorkflow;
  intake: RequestIntake;
  apps: CatalogApp[];
  /** The forks the scenario passes through. `bi` is always one. Each gives `fork:<id>` to the blocks after it. */
  forks: string[];
  /** In journey order. Blocks and ghost cards share one list so a ghost card has a place. */
  cards: RequestCard[];
  demos: RequestDemo[];
  brand: RequestBrand;
  winTheme: string;
  openQuestions: string[];
}

export type RequestResult = { ok: true; request: DemoRequest } | { ok: false; problems: string[] };

/** A folder or file name: lowercase words joined by hyphens. Nothing that could climb out of a folder. */
export const SAFE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const TOP_KEYS = ["version", "client", "slug", "title", "workflow", "intake", "apps", "forks", "cards", "demos", "brand", "winTheme", "openQuestions"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/** Every declared exit id per fork id, across workflows. A demo's pick must name one. */
const declaredExits = (): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  for (const f of ALL_FORKS) {
    const set = map.get(f.id) ?? new Set<string>();
    for (const e of f.exits) set.add(e.id);
    map.set(f.id, set);
  }
  return map;
};

export function validateDemoRequest(input: unknown): RequestResult {
  const problems: string[] = [];
  if (!isObject(input)) return { ok: false, problems: ["the request must be a JSON object"] };

  for (const key of Object.keys(input)) if (!TOP_KEYS.includes(key)) problems.push(`unknown field "${key}"`);
  if (input.version !== REQUEST_VERSION) problems.push(`version must be ${REQUEST_VERSION}`);
  for (const key of ["client", "slug"] as const) {
    if (typeof input[key] !== "string" || !SAFE_SLUG.test(input[key] as string)) problems.push(`${key} must be lowercase words joined by hyphens`);
  }
  if (!text(input.title)) problems.push("title is required");
  if (!(REQUEST_WORKFLOWS as readonly unknown[]).includes(input.workflow)) problems.push(`workflow must be one of ${REQUEST_WORKFLOWS.join(", ")}`);
  if (!(REQUEST_INTAKES as readonly unknown[]).includes(input.intake)) problems.push(`intake must be one of ${REQUEST_INTAKES.join(", ")}`);
  if (!text(input.winTheme)) problems.push("win theme is required");

  if (!Array.isArray(input.apps) || input.apps.length === 0) problems.push("apps needs at least one app");
  else for (const a of input.apps) if (!APPS.includes(a as CatalogApp)) problems.push(`unknown app "${String(a)}"`);

  const declared = declaredExits();
  const forkIds: string[] = [];
  // BI runs first in every request, except one that uses a variant declared `endsBeforeBi` (the HCP enrollment).
  const endsBeforeBi =
    Array.isArray(input.cards) &&
    input.cards.some((c) => {
      if (!isObject(c) || c.kind !== "block") return false;
      return !!CATALOG_BLOCKS[c.moduleId as ModuleId]?.variants?.find((v) => v.id === c.variantId)?.endsBeforeBi;
    });
  if (!Array.isArray(input.forks)) problems.push("forks must be a list");
  else {
    if (!input.forks.includes("bi") && !endsBeforeBi) problems.push('forks must include "bi": benefits investigation always runs first');
    for (const f of input.forks) {
      if (typeof f !== "string" || !declared.has(f)) problems.push(`fork "${String(f)}" is not declared by any workflow`);
      else forkIds.push(f);
    }
  }

  if (!Array.isArray(input.cards) || input.cards.length === 0) problems.push("cards needs at least one card");
  else input.cards.forEach((c, i) => problems.push(...cardProblems(c, i)));

  if (!Array.isArray(input.demos) || input.demos.length === 0) problems.push("demos needs at least one demo");
  else {
    const exits = declared;
    const ids = new Set<string>();
    input.demos.forEach((d, i) => {
      const at = `demos[${i}]`;
      if (!isObject(d)) return problems.push(`${at} must be an object`);
      if (typeof d.id !== "string" || !SAFE_SLUG.test(d.id)) problems.push(`${at}.id must be lowercase words joined by hyphens`);
      else if (ids.has(d.id)) problems.push(`${at}.id "${d.id}" is used twice`);
      else ids.add(d.id);
      if (!text(d.label)) problems.push(`${at}.label is required`);
      if (!isObject(d.choices)) return problems.push(`${at}.choices must be an object`);
      for (const [fork, exit] of Object.entries(d.choices)) {
        if (forkIds.length && exits.has(fork) && !forkIds.includes(fork)) problems.push(`${at} picks fork "${fork}", which the request does not pass through`);
        else if (!exits.has(fork)) problems.push(`${at} picks fork "${fork}", which no workflow declares`);
        else if (typeof exit !== "string" || !exits.get(fork)!.has(exit)) problems.push(`${at} picks exit "${String(exit)}", which fork "${fork}" does not declare`);
      }
    });
  }

  const b = input.brand;
  if (!isObject(b)) problems.push("brand is required");
  else {
    for (const key of ["name", "drug"]) if (!text(b[key])) problems.push(`brand.${key} is required`);
    if (b.sourceUrl !== undefined && !(typeof b.sourceUrl === "string" && /^https?:\/\//.test(b.sourceUrl))) problems.push("brand.sourceUrl must be an http or https URL");
    if (!Array.isArray(b.documents) || !b.documents.every((d) => typeof d === "string")) problems.push("brand.documents must be a list of text");
  }

  if (!Array.isArray(input.openQuestions) || !input.openQuestions.every(text)) problems.push("openQuestions must be a list of non-empty text");

  return problems.length ? { ok: false, problems } : { ok: true, request: input as unknown as DemoRequest };
}

function cardProblems(c: unknown, i: number): string[] {
  const at = `cards[${i}]`;
  if (!isObject(c)) return [`${at} must be an object`];
  if (c.kind === "block") {
    const block = CATALOG_BLOCKS[c.moduleId as ModuleId];
    if (!block) return [`${at} names module "${String(c.moduleId)}", which the catalog does not have`];
    const variant = c.variantId === undefined ? DEFAULT_VARIANT : c.variantId;
    if (!block.variants && variant === DEFAULT_VARIANT) return [];
    return block.variants?.some((v) => v.id === variant) ? [] : [`${at} names variant "${String(c.variantId)}", which "${block.id}" does not have`];
  }
  if (c.kind === "ghost") {
    const out: string[] = [];
    if (!text(c.name)) out.push(`${at} (ghost card) needs a name`);
    if (!text(c.sees)) out.push(`${at} (ghost card) needs what the audience sees`);
    if (!APPS.includes(c.app as CatalogApp)) out.push(`${at} (ghost card) needs an app`);
    if (!LANES.includes(c.lane as CatalogLane)) out.push(`${at} (ghost card) needs who triggers it (hcp, patient, agent, or system)`);
    if (c.trigger !== undefined && !TRIGGERS.includes(c.trigger as CatalogTrigger)) out.push(`${at} (ghost card) has an unknown trigger`);
    return out;
  }
  return [`${at}.kind must be "block" or "ghost"`];
}

/** The ghost cards of a request, which decide whether it needs a model. */
export const ghostCards = (r: DemoRequest): RequestGhostCard[] => r.cards.filter((c): c is RequestGhostCard => c.kind === "ghost");
