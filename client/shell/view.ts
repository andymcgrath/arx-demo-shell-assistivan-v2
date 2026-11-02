/**
 * View rules. A view is how a demo is presented (`full` or `patient`). It is shell state, never workflow, scenario, or
 * brand, and it never enters the machine. These functions are pure: demoStore and the header call them with the brand's
 * values, and the brand test calls `viewProblems` on every brand file.
 */
import type { ViewId } from "@/brand/schema";

export const VIEW_IDS: readonly ViewId[] = ["full", "patient"];

export const isViewId = (value: unknown): value is ViewId => VIEW_IDS.includes(value as ViewId);

/** The views a brand allows. A brand without `enabledViews` gets `full` only. */
export function allowedViews(enabledViews: readonly ViewId[] | undefined): readonly ViewId[] {
  return enabledViews && enabledViews.length > 0 ? enabledViews : ["full"];
}

/** The Full / Patient toggle shows only when a brand lists more than one view. */
export function showViewToggle(enabledViews: readonly ViewId[] | undefined): boolean {
  return allowedViews(enabledViews).length > 1;
}

/** The view named by `?view=` in a query string, or undefined when it names none. */
export function viewFromSearch(search: string): ViewId | undefined {
  const value = new URLSearchParams(search).get("view");
  return isViewId(value) ? value : undefined;
}

interface ResolveInput {
  enabledViews: readonly ViewId[] | undefined;
  /** `?view=` from the URL. */
  param?: ViewId;
  /** The view saved in the session. */
  stored?: ViewId;
  /** The `view` the selected demo pins. */
  pinned?: ViewId;
}

/** Picks the view to start in: the URL, then the saved one, then the demo's pin, then the brand's first view. Only an enabled view wins. */
export function resolveView({ enabledViews, param, stored, pinned }: ResolveInput): ViewId {
  const allowed = allowedViews(enabledViews);
  for (const candidate of [param, stored, pinned]) {
    if (candidate && allowed.includes(candidate)) return candidate;
  }
  return allowed[0];
}

/** What is wrong with a brand's view settings. The brand test requires an empty list. */
export function viewProblems(brand: {
  enabledViews?: unknown;
  demos?: { id: string; view?: unknown }[];
}): string[] {
  const problems: string[] = [];
  const enabled = brand.enabledViews;
  if (enabled !== undefined) {
    if (!Array.isArray(enabled) || enabled.length === 0) {
      problems.push("enabledViews must be a non-empty list");
    } else {
      for (const view of enabled) if (!isViewId(view)) problems.push(`enabledViews names unknown view "${String(view)}"`);
      if (new Set(enabled).size !== enabled.length) problems.push("enabledViews repeats a view");
    }
  }
  const allowed = Array.isArray(enabled) ? enabled : ["full"];
  for (const demo of brand.demos ?? []) {
    if (demo.view === undefined) continue;
    if (!isViewId(demo.view)) problems.push(`demo ${demo.id} names unknown view "${String(demo.view)}"`);
    else if (!allowed.includes(demo.view)) problems.push(`demo ${demo.id} pins view "${demo.view}", which the brand does not enable`);
  }
  return problems;
}

// ── Shell policy ──────────────────────────────────────────────────────────────

/** What the shell shows in a view. `portalIds` null means every portal the flow offers. */
export interface ShellPolicy {
  portalIds: readonly string[] | null;
  /** True when the layout buttons are hidden and the shell stays in one panel. */
  singlePanel: boolean;
  /** True when the header shows the step bar. The patient view has the phase rail instead. */
  stepBar: boolean;
}

const SHELL_POLICY: Record<ViewId, ShellPolicy> = {
  full: { portalIds: null, singlePanel: false, stepBar: true },
  patient: { portalIds: ["patient"], singlePanel: true, stepBar: false },
};

export const shellPolicy = (view: ViewId): ShellPolicy => SHELL_POLICY[view];

/** Keeps the portals the policy allows. A policy with no `portalIds` keeps them all. */
export function filterPortals<T extends { id: string }>(portals: T[], policy: ShellPolicy): T[] {
  const ids = policy.portalIds;
  return ids ? portals.filter((p) => ids.includes(p.id)) : portals;
}

export interface ToggleOption {
  id: ViewId;
  label: string;
  active: boolean;
}

const VIEW_LABELS: Record<ViewId, string> = { full: "Full", patient: "Patient" };

/** The header toggle's buttons, or null when the brand does not offer a choice of views. */
export function toggleOptions(view: ViewId, enabledViews: readonly ViewId[] | undefined): ToggleOption[] | null {
  if (!showViewToggle(enabledViews)) return null;
  return allowedViews(enabledViews).map((id) => ({ id, label: VIEW_LABELS[id], active: id === view }));
}
