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
 * Fires another event after a rule runs. This is how ordering lives in the
 * workflow definition and not in a UI effect (CLAUDE.md rules 10 and 11).
 *
 * The event it sends must pass its own precondition, or it is ignored. So a
 * trigger never needs to repeat the condition: SUBMIT_PA after COMPLETE_BI is
 * ignored when the BI result says no PA is required.
 */
export interface Automation<E = any, C = any> {
  /** Who starts this step. `system` fires on its own. `agent` waits for a person (for example, opening a tab). */
  trigger: "system" | "agent";
  /** The event to send. Evaluated against the data AFTER `set` ran. */
  send: (data: WorkflowData, event: E, scenario: ScenarioDefinition<C>) => { type: string; [field: string]: unknown };
  /** Delay in ms. Omit to fire in the same step. A delayed automation needs an `id` so it can be cancelled. */
  after?: number;
  id?: string;
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
  /** Events to fire after this rule runs, now or after a delay. */
  then?: Automation<E, C> | Automation<E, C>[];
  /** Ids of delayed automations to cancel when this rule runs. */
  cancel?: string[];
}

export interface WorkflowDefinition<C = any> {
  /** XState machine id. */
  id: string;
  rules: Rule<any, C>[];
  scenarios: Partial<Record<FlowType, ScenarioDefinition<C>>>;
  /** Scenario used when the machine starts without an input. */
  defaultFlowType: FlowType;
}
