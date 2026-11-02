import type { WorkflowData } from "@/engine/types";
import { ruleAppliesTo } from "./scope";
import { stageSignalFor, type StageMap } from "./stages";
import type { Portal, Rule, ScenarioDefinition, WorkflowDefinition } from "./types";

/**
 * What the presenter can do now, read from the workflow definition. In the full view the CRM, the provider and
 * iAssist apps do these things. The patient view has none of those apps, so the Trigger panel offers them from here.
 * Nothing in this file is a list of events. The rules say what is allowed and who does it (CLAUDE.md rules 10 and 11).
 *
 * - `agent`: an automated step that waits for a person. Opening the stage sends VIEW_STAGE and the machine reveals
 *   the outcome after its own delay (BI result, PA decision, appeal decision).
 * - `manual`: an event another app sends (`emit.portal` is not `patient`) that the rules allow now and no
 *   automation sends. The provider's PA submission on a fax scenario is one.
 * - `system`: an event an automation sends on its own in this scenario. Listed so the presenter sees it, never fired.
 *   The same event can be `system` in one scenario and `manual` in another. The trigger belongs to the scenario.
 */

export type TriggerKind = "agent" | "manual" | "system";

export interface TriggerRow {
  kind: TriggerKind;
  /** The event to send. */
  event: string;
  /** Fields the event carries besides its type and portal. */
  payload: Record<string, unknown>;
  /** Plain words for the row. */
  label: string;
  /** The app that sends it in the full view. */
  portal: Portal;
  /** Stage name, for an `agent` row. */
  stage?: string;
  /** What an `agent` row makes happen, and after how long. A `system` row says when it runs on its own. */
  reveals?: { event: string; afterMs?: number };
  /** For a `manual` row: the events its rule sets running on their own. Pressing "Initiate appeal on denial" starts the appeal. */
  starts?: string[];
  /** For a `manual` row: the fields its rule sets now. Guided Next uses it to tell a step that moves the case on from a spare form. */
  patch?: Partial<WorkflowData>;
}

/** UI signals and machine controls: never rows of their own. */
const SIGNALS = new Set(["VIEW_STAGE", "LEAVE_STAGE", "UNDO", "RESET"]);

const toArray = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** A precondition that throws on a probe event with no payload counts as not holding. */
function holds(check: () => boolean): boolean {
  try {
    return check();
  } catch {
    return false;
  }
}

const ACRONYMS = new Set(["bi", "pa", "pap", "rx", "sms", "otp", "eRx", "psp", "medbv"]);

/** "COMPLETE_BI" becomes "Complete BI". */
const humanize = (event: string) =>
  event
    .toLowerCase()
    .split("_")
    .map((w, i) => (ACRONYMS.has(w) ? (w === "medbv" ? "MedBV" : w.toUpperCase()) : i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/** The app that sends an event in the full view: the rule's first log entry, or its `from`. Undefined: the rule says neither. */
export function sourcePortal(rule: Rule): Portal | undefined {
  return toArray(rule.emit)[0]?.portal ?? rule.from;
}

/** The rules that apply to this scenario, in definition order. */
export function rulesFor(def: WorkflowDefinition, scenario: ScenarioDefinition<any>): Rule[] {
  return def.rules.filter((rule) => ruleAppliesTo(rule, scenario, def.forks ?? []));
}

/** The first rule for the event whose precondition holds on this data. This is the rule the machine would run. */
function allowedRule(rules: Rule[], data: WorkflowData, event: { type: string; [k: string]: unknown }, scenario: ScenarioDefinition<any>) {
  return rules.find((r) => r.on === event.type && (!r.when || holds(() => r.when!(data, event, scenario))));
}

/** The events a system automation sends in this scenario, each with its delay in ms (undefined: the same step). */
function systemSent(
  rules: Rule[],
  data: WorkflowData,
  scenario: ScenarioDefinition<any>,
  probe: (event: string, data: WorkflowData) => Record<string, unknown>,
): Map<string, number | undefined> {
  const sent = new Map<string, number | undefined>();
  for (const rule of rules) {
    const event = { type: rule.on, ...probe(rule.on, data) };
    // An automation reads the data after its rule ran, so judge it on that.
    let after = data;
    try {
      after = { ...data, ...(rule.set ? rule.set(data, event, scenario) : {}) };
    } catch {
      // A rule that needs more of its event than the probe has cannot say what it sets. Judge on the current data.
    }
    for (const a of toArray(rule.then)) {
      if (a.trigger !== "system") continue;
      if (a.when && !holds(() => a.when!(after, event, scenario))) continue;
      try {
        sent.set(a.send(after, event, scenario).type, a.after);
      } catch {
        // An automation that needs the parent event's fields cannot say what it sends from here. It names nothing.
      }
    }
  }
  return sent;
}

/** The fields the rule would set on this data, or undefined when it cannot say (it needs more of its event). */
function patchOf(rule: Rule, data: WorkflowData, event: { type: string }, scenario: ScenarioDefinition<any>): Partial<WorkflowData> | undefined {
  if (!rule.set) return {};
  try {
    return rule.set(data, event, scenario);
  } catch {
    return undefined;
  }
}

/** True when running the rule would change nothing: every field it sets already holds that value. */
function changesNothing(patch: Partial<WorkflowData> | undefined, data: WorkflowData): boolean {
  if (!patch) return false;
  const keys = Object.keys(patch);
  return keys.length > 0 && keys.every((k) => JSON.stringify((patch as any)[k]) === JSON.stringify((data as any)[k]));
}

/**
 * Everything the presenter can do now. Empty when the data's scenario has no definition.
 * `probe` gives the payload a rule's precondition needs to be judged (for example `{ active: true }` for the appeal rule).
 */
export function triggerRows(
  def: WorkflowDefinition,
  data: WorkflowData,
  stages: StageMap,
  probe: (event: string, data: WorkflowData) => Record<string, unknown> = () => ({}),
): TriggerRow[] {
  const scenario = def.scenarios[data.flowType];
  if (!scenario) return [];
  const rules = rulesFor(def, scenario);
  const rows: TriggerRow[] = [];

  // Agent steps: one row per stage whose signal the rules would act on now.
  const seen = new Set<string>();
  for (const stage of stages.catalog) {
    const signal = stageSignalFor(stages, stage.id, data);
    if (!signal || seen.has(signal)) continue;
    const event = { type: "VIEW_STAGE", stage: signal };
    const rule = allowedRule(rules, data, event, scenario);
    const automation = toArray(rule?.then).find((a) => a.trigger === "agent" && (!a.when || holds(() => a.when!(data, event, scenario))));
    if (!rule || !automation) continue;
    seen.add(signal);
    const next = automation.send(data, event, scenario);
    rows.push({
      kind: "agent",
      event: "VIEW_STAGE",
      payload: { stage: signal },
      label: `Open ${signal}`,
      portal: "crm",
      stage: signal,
      reveals: { event: next.type, afterMs: automation.after },
    });
  }

  // Manual and system steps: one row per event the rules allow now and another app sends.
  const automated = systemSent(rules, data, scenario, probe);
  const types = [...new Set(rules.map((r) => r.on))].filter((t) => !SIGNALS.has(t));
  for (const type of types) {
    const event = { type, portal: "crm", ...probe(type, data) };
    const rule = allowedRule(rules, data, event, scenario);
    const portal = rule && sourcePortal(rule);
    const patch = rule ? patchOf(rule, data, event, scenario) : undefined;
    if (!rule || !portal || portal === "patient" || changesNothing(patch, data)) continue;
    const system = automated.has(type);
    // Only an automation sends this one. It can show as "runs on its own", never as a button.
    if (rule.autoOnly && !system) continue;
    const starts = system ? [] : [...systemSent([rule], data, scenario, probe).keys()];
    rows.push({
      kind: system ? "system" : "manual",
      event: type,
      payload: {},
      label: humanize(type),
      portal,
      ...(system ? { reveals: { event: type, afterMs: automated.get(type) } } : {}),
      ...(starts.length ? { starts } : {}),
      ...(patch && Object.keys(patch).length ? { patch } : {}),
    });
  }
  return rows;
}

/** The event to send for a row: its type, the app it comes from, and its payload. */
export function eventFor(row: TriggerRow): { type: string; portal: Portal; [k: string]: unknown } {
  const portal: Portal = row.portal === "provider" ? "provider" : "crm";
  return { type: row.event, portal, ...row.payload };
}

/** True when a row can be sent. System rows run on their own. */
export const isFireable = (row: TriggerRow): boolean => row.kind !== "system";
