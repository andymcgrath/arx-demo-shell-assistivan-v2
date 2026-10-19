import type { FlowType, WorkflowData } from "@/engine/types";
import { inScope } from "./scope";
import type { ForkDefinition, RuleScope, ScenarioDefinition } from "./types";

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
  /**
   * Show only when the scenario's recipe or forks match (see scope.ts). Needs `scenarioDefs` on the map.
   * Replaces a hand-written `scenarios` list.
   */
  scope?: RuleScope;
  /**
   * Leave this screen out of the menu while this is true. For a screen the current data skips: a pinned pick
   * the patient never makes. Only `menuFor` reads it, and only when it gets data. Routing is unaffected.
   */
  skipped?: (data: WorkflowData) => boolean;
  /**
   * The patient may sit here while the data has not caught up: a one-time
   * confirmation, or a screen reached by a tap before its event fires.
   * The portal does not navigate away on a state change. A reset still does.
   */
  sticky?: boolean;
}

/**
 * One route rule. Rules run in order and the first match wins.
 * A rule without `when` always matches.
 */
export interface ScreenRule {
  /**
   * A stable name, for example `scheduling.address`. Tests record each scenario's route order by id, so a
   * refactor cannot move or re-scope a route rule without a fixture diff. Unique within a screen map.
   */
  id?: string;
  path: string;
  scenarios?: FlowType[];
  /** Applies only when the scenario's recipe or forks match. Needs `scenarioDefs` and `forks` on the map. */
  scope?: RuleScope;
  /** Where the rule sits in the map's `slots`. Required when the map declares slots. */
  slot?: string;
  when?: (data: WorkflowData) => boolean;
}

export interface ScreenMap {
  /** Scenarios this map serves. */
  flows: FlowType[];
  /** Menu order. Screens reached only by a tap (no rule picks them) belong here too. */
  screens: Screen[];
  /**
   * Route rules. First match wins. With `slots`, the rules are tried slot by slot, and in array order inside a
   * slot. Without it, in array order.
   */
  rules: ScreenRule[];
  /**
   * The route spine: slot names in the order the patient meets them. Modules contribute rules to a slot. Only a
   * rule that can match together with another one needs a fixed order, and a slot gives it one.
   */
  slots?: readonly string[];
  /** Menu group order. Ungrouped entries come first. Omit to order groups by their first screen. */
  groups?: readonly string[];
  /** The scenarios and forks that `scope` reads. */
  scenarioDefs?: ScenarioDefinition<any>[];
  forks?: ForkDefinition[];
  /** Paths a rule may return that never show in the menu (for example the lock screen). */
  hidden: string[];
  /** Used when no rule matches. */
  fallback: string;
}

function appliesTo(
  map: ScreenMap,
  item: { scenarios?: FlowType[]; scope?: RuleScope },
  flowType: FlowType,
): boolean {
  if (item.scenarios && !item.scenarios.includes(flowType)) return false;
  if (!item.scope) return true;
  const scenario = map.scenarioDefs?.find((s) => s.flowType === flowType);
  return !!scenario && inScope(item.scope, scenario, map.forks ?? []);
}

/** The route rules that apply to a scenario, in the order they are tried. */
export function rulesFor(map: ScreenMap, flowType: FlowType): ScreenRule[] {
  const rules = map.rules.filter((rule) => appliesTo(map, rule, flowType));
  const slots = map.slots;
  if (!slots) return rules;
  const at = (rule: ScreenRule) => slots.indexOf(rule.slot ?? "");
  // Array.prototype.sort is stable, so rules in one slot keep their array order.
  return rules.sort((a, b) => at(a) - at(b));
}

/** Problems that make a screen map unsafe: a rule with no slot, an unknown slot, a repeated id or group. */
export function screenMapProblems(map: ScreenMap): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const rule of map.rules) {
    const name = rule.id ?? rule.path;
    if (rule.id) {
      if (ids.has(rule.id)) problems.push(`route rule id "${rule.id}" is used twice`);
      ids.add(rule.id);
    }
    if (map.slots && (!rule.slot || !map.slots.includes(rule.slot))) {
      problems.push(`route rule "${name}" has slot "${rule.slot ?? ""}", which the map does not declare`);
    }
    if (rule.scope && !map.scenarioDefs) problems.push(`route rule "${name}" has a scope but the map has no scenarioDefs`);
  }
  if (map.groups) {
    for (const screen of map.screens) {
      if (screen.group !== "" && !map.groups.includes(screen.group)) {
        problems.push(`screen "${screen.path}" is in group "${screen.group}", which the map does not list`);
      }
    }
  }
  return problems;
}

/** The route the patient portal should show for this data. */
export function routeFor(map: ScreenMap, data: WorkflowData): string {
  for (const rule of rulesFor(map, data.flowType)) {
    if (!rule.when || rule.when(data)) return rule.path;
  }
  return map.fallback;
}

export type MenuEntry =
  | { label: string; path: string }
  | { group: string; items: { label: string; path: string }[] };

/**
 * The hamburger menu for one scenario, in catalog order. Groups keep the order of their first screen.
 * With `data`, screens the data skips (`Screen.skipped`) are left out. Without it, the menu is the full catalog.
 */
export function menuFor(map: ScreenMap, flowType: FlowType, data?: WorkflowData): MenuEntry[] {
  const entries: MenuEntry[] = [];
  const groups = new Map<string, { label: string; path: string }[]>();
  for (const screen of map.screens) {
    if (!appliesTo(map, screen, flowType)) continue;
    if (data && screen.skipped?.(data)) continue;
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
  const order = map.groups;
  if (!order) return entries;
  // Modules contribute screens in module order, so group order comes from the map. Ungrouped entries lead.
  const rank = (e: MenuEntry) => ("group" in e ? order.indexOf(e.group) + 1 : 0);
  return entries.sort((a, b) => rank(a) - rank(b));
}

/** Every path in the menu for this scenario. */
export function menuPaths(map: ScreenMap, flowType: FlowType): string[] {
  return menuFor(map, flowType).flatMap((e) => ("path" in e ? [e.path] : e.items.map((i) => i.path)));
}

/** Every path the rules can return for this scenario. */
export function routedPaths(map: ScreenMap, flowType: FlowType): string[] {
  const paths = rulesFor(map, flowType).map((r) => r.path);
  return [...new Set([...paths, map.fallback])];
}

/** True when the patient portal should leave the patient on this screen for this scenario. */
export function isSticky(map: ScreenMap, flowType: FlowType, path: string): boolean {
  return map.screens.some((s) => s.path === path && s.sticky === true && appliesTo(map, s, flowType));
}
