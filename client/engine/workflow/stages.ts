import type { FlowType, WorkflowData } from "@/engine/types";
import { appliesToFlow } from "./scope";
import type { ForkDefinition, ScenarioDefinition, Scope } from "./types";

/**
 * The stages the CRM shows for a scenario (CLAUDE.md rule 13, for the CRM app). Same two lists as the screen map:
 * a catalog of stages in CRM order, and ordered rules that pick how each stage is drawn. Types and pure functions
 * only. The CRM keeps one builder per `stage.variant` (portals/crm/stages), so a workflow names a variant and never
 * imports UI code.
 */

/** A stage the CRM can show, by the id the agent reads, for example "BI-14273". */
export interface StageDef {
  id: string;
  /**
   * The agent opening this stage's tab is a signal to the machine (VIEW_STAGE with this name). The machine owns the
   * delay and the outcome. Leaving the tab sends LEAVE_STAGE, which cancels a pending reveal.
   */
  signal?: string;
  /** The signal is sent only while this holds, so a stage that has nothing to reveal sends nothing. */
  signalWhen?: (data: WorkflowData) => boolean;
}

/** One stage rule. For each stage, the first rule that applies and whose `when` holds picks the variant. */
export interface StageRule {
  /** A stable name, for example `triage.site_of_care`. Unique within a map. */
  id?: string;
  stage: string;
  /** Names the CRM builder for this stage, for example `site_of_care` for `TP-14277`. */
  variant: string;
  scenarios?: FlowType[];
  /** Applies only when the scenario's recipe or forks match. Needs `scenarioDefs` and `forks` on the map. */
  scope?: Scope;
  when?: (data: WorkflowData) => boolean;
}

export interface StageMap {
  /** Scenarios this map serves. */
  flows: FlowType[];
  /** Stages in CRM order. A scenario may skip one by having no rule for it. */
  catalog: StageDef[];
  rules: StageRule[];
  /** The scenarios and forks that `scope` reads. */
  scenarioDefs?: ScenarioDefinition<any>[];
  forks?: ForkDefinition[];
}

/** A stage the CRM shows now, and the builder that draws it. */
export interface StagePick {
  stage: string;
  variant: string;
}

/** The stage rules that apply to a scenario, in array order. */
export function stageRulesFor(map: StageMap, flowType: FlowType): StageRule[] {
  return map.rules.filter((rule) => appliesToFlow(rule, flowType, map.scenarioDefs, map.forks));
}

/** The stages to show for this data, in catalog order, each with the variant that draws it. */
export function stagesFor(map: StageMap, data: WorkflowData): StagePick[] {
  const rules = stageRulesFor(map, data.flowType);
  const picks: StagePick[] = [];
  for (const def of map.catalog) {
    const rule = rules.find((r) => r.stage === def.id && (!r.when || r.when(data)));
    if (rule) picks.push({ stage: def.id, variant: rule.variant });
  }
  return picks;
}

/** The signal to send while the agent has this stage open, or null when there is none to send. */
export function stageSignalFor(map: StageMap, stageId: string, data: WorkflowData): string | null {
  const def = map.catalog.find((d) => d.id === stageId);
  if (!def?.signal) return null;
  return !def.signalWhen || def.signalWhen(data) ? def.signal : null;
}

/** Every variant a scenario can use for a stage, whatever the data. For tests and the builder registry check. */
export function stageVariantsFor(map: StageMap, flowType: FlowType): StagePick[] {
  return stageRulesFor(map, flowType).map((r) => ({ stage: r.stage, variant: r.variant }));
}

/** Problems that make a stage map unsafe: a rule for an unknown stage, a repeated id, a scope without definitions. */
export function stageMapProblems(map: StageMap): string[] {
  const problems: string[] = [];
  const stageIds = new Set<string>();
  const signals = new Set<string>();
  for (const def of map.catalog) {
    if (stageIds.has(def.id)) problems.push(`stage "${def.id}" is in the catalog twice`);
    stageIds.add(def.id);
    if (def.signalWhen && !def.signal) problems.push(`stage "${def.id}" has signalWhen but no signal`);
    if (def.signal) {
      if (signals.has(def.signal)) problems.push(`signal "${def.signal}" is used by two stages`);
      signals.add(def.signal);
    }
  }
  const ruleIds = new Set<string>();
  for (const rule of map.rules) {
    const name = rule.id ?? `${rule.stage}.${rule.variant}`;
    if (!stageIds.has(rule.stage)) problems.push(`stage rule "${name}" names stage "${rule.stage}", which the catalog does not list`);
    if (rule.id) {
      if (ruleIds.has(rule.id)) problems.push(`stage rule id "${rule.id}" is used twice`);
      ruleIds.add(rule.id);
    }
    if (rule.scope && !map.scenarioDefs) problems.push(`stage rule "${name}" has a scope but the map has no scenarioDefs`);
  }
  return problems;
}
