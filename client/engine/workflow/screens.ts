import type { FlowType, WorkflowData } from "@/engine/types";

/**
 * A screen the patient can see. The catalog lists screens in menu order.
 * The hamburger menu is built from it, so a screen that is not here is not
 * in the menu.
 */
export interface Screen {
  path: string;
  label: string;
  /** Menu group. Use "" for a top-level entry. "{program}" becomes the program name. */
  group: string;
  /** Show only for these scenarios. Omit for every scenario of the workflow. */
  scenarios?: FlowType[];
}

/**
 * One route rule. Rules run in order and the first match wins.
 * A rule without `when` always matches.
 */
export interface ScreenRule {
  path: string;
  scenarios?: FlowType[];
  when?: (data: WorkflowData) => boolean;
}

export interface ScreenMap {
  /** Menu order. Screens reached only by a tap (no rule picks them) belong here too. */
  screens: Screen[];
  /** Route order. First match wins. */
  rules: ScreenRule[];
  /** Paths a rule may return that never show in the menu (for example the lock screen). */
  hidden: string[];
  /** Used when no rule matches. */
  fallback: string;
}

function appliesTo(scenarios: FlowType[] | undefined, flowType: FlowType): boolean {
  return !scenarios || scenarios.includes(flowType);
}

/** The route the patient portal should show for this data. */
export function routeFor(map: ScreenMap, data: WorkflowData): string {
  for (const rule of map.rules) {
    if (!appliesTo(rule.scenarios, data.flowType)) continue;
    if (!rule.when || rule.when(data)) return rule.path;
  }
  return map.fallback;
}

export type MenuEntry =
  | { label: string; path: string }
  | { group: string; items: { label: string; path: string }[] };

/** The hamburger menu for one scenario, in catalog order. Groups keep the order of their first screen. */
export function menuFor(map: ScreenMap, flowType: FlowType): MenuEntry[] {
  const entries: MenuEntry[] = [];
  const groups = new Map<string, { label: string; path: string }[]>();
  for (const screen of map.screens) {
    if (!appliesTo(screen.scenarios, flowType)) continue;
    if (screen.group === "") {
      entries.push({ label: screen.label, path: screen.path });
      continue;
    }
    let items = groups.get(screen.group);
    if (!items) {
      items = [];
      groups.set(screen.group, items);
      entries.push({ group: screen.group, items });
    }
    items.push({ label: screen.label, path: screen.path });
  }
  return entries;
}

/** Every path in the menu for this scenario. */
export function menuPaths(map: ScreenMap, flowType: FlowType): string[] {
  return menuFor(map, flowType).flatMap((e) => ("path" in e ? [e.path] : e.items.map((i) => i.path)));
}

/** Every path the rules can return for this scenario. */
export function routedPaths(map: ScreenMap, flowType: FlowType): string[] {
  const paths = map.rules.filter((r) => appliesTo(r.scenarios, flowType)).map((r) => r.path);
  return [...new Set([...paths, map.fallback])];
}
