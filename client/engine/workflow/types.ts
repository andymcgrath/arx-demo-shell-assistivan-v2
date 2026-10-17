import type { FlowType, WorkflowData } from "@/engine/types";

export type Portal = "crm" | "patient" | "provider" | "analytics" | "field";

/** A scenario is data: starting values plus content (pharmacies, prices, labels). */
export interface ScenarioDefinition<Content = unknown> {
  flowType: FlowType;
  /** Starting values that differ from the shared defaults. */
  initialData?: Partial<WorkflowData>;
  /** Scenario-specific content that rules read. */
  content: Content;
}

/** One entry appended to the event log when a rule fires. */
export interface Emit<E = any, C = any> {
  /** Defaults to the event's own type. */
  type?: string;
  portal: Portal;
  step: number;
  /** Evaluated against the data AFTER `set` ran. Omit to always emit. */
  when?: (data: WorkflowData, event: E, scenario: ScenarioDefinition<C>) => boolean;
}

/**
 * One transition rule. A workflow is an ordered list of these.
 *
 * The factory groups rules by `on` and keeps their order, so for one event
 * the first rule whose preconditions pass wins. Where they fail the event is
 * ignored: no data change and no log entry.
 */
export interface Rule<E = any, C = any> {
  on: string;
  /** Apply only to these scenarios. Omit to apply to every scenario of the workflow. */
  scenarios?: FlowType[];
  /** Precondition on the data. Omit for "always allowed". */
  when?: (data: WorkflowData, event: E, scenario: ScenarioDefinition<C>) => boolean;
  /** Fields to change. */
  set?: (data: WorkflowData, event: E, scenario: ScenarioDefinition<C>) => Partial<WorkflowData>;
  /** Event-log entries to append, in order. */
  emit?: Emit<E, C> | Emit<E, C>[];
}

export interface WorkflowDefinition<C = any> {
  /** XState machine id. */
  id: string;
  rules: Rule<any, C>[];
  scenarios: Partial<Record<FlowType, ScenarioDefinition<C>>>;
  /** Scenario used when the machine starts without an input. */
  defaultFlowType: FlowType;
}
