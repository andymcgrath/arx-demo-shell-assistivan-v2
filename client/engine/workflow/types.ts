import type { FlowType, WorkflowData } from "@/engine/types";

export type Portal = "crm" | "patient" | "provider" | "analytics" | "field";

/**
 * The patient a scenario starts with. Drug name and dosage form are not here: they come from the brand.
 * Every flow shares one patient today. A scenario overrides single fields through `patient`.
 */
export interface PatientPersona {
  patientName: string;
  patientDob: string;
  rxNumber: string;
  phone: string;
  email: string;
  payer: string;
  caseNumber: string;
  npi: string;
  deliveryAddress: string;
  preferredMethodOfContact: string;
  gender: string;
  phoneType: string;
  preferredLanguage: string;
  householdSize: string;
  householdIncome: string;
  memberId: string;
  rxBin: string;
  rxPcn: string;
  rxGroup: string;
  currentMedications: string;
  healthConditions: string;
}

/** An event the presenter's stage jump replays. */
export interface StageEvent {
  type: string;
  portal: string;
  [field: string]: unknown;
}

/** One rung of the stage-jump list: a label and the events that land the machine on it from the rung before. */
export interface ForkStage {
  label: string;
  events: StageEvent[];
}

/** One branch of a fork. */
export interface ForkExit {
  id: string;
  /** Presenter-facing name, for the CRM buttons and the demo list. */
  label: string;
  description?: string;
  /** Fields this branch sets on `WorkflowData` when the fork resolves. */
  data: Partial<WorkflowData>;
  /**
   * The story after the fork resolves on this branch, one rung per stage. The stage-jump list for a
   * flow with a fork is the fork's `stagesBefore` followed by the selected branch's `stages`. Each
   * branch sends its own events, so the list changes when the presenter or the demo changes branch.
   */
  stages?: ForkStage[];
}

/**
 * A point where a scenario has a default branch and named alternatives. A workflow declares its
 * forks. The pick lives in `workflowData.choices[id]`, so it survives reset, undo, and reload.
 */
export interface ForkDefinition {
  id: string;
  label: string;
  /** Who picks. `story`: the scenario fixes it. `presenter`: picked live. `patient`: picked in the app. */
  chooser: "story" | "presenter" | "patient";
  /** Apply to these scenarios only. Omit for every scenario of the workflow. */
  scenarios?: FlowType[];
  exits: ForkExit[];
  /**
   * The rungs of the stage-jump list before the fork resolves, the same for every branch. Their events,
   * in order, take a fresh run to the point where the fork is about to resolve. "Switch branch" resets,
   * applies the choice, then sends them.
   */
  stagesBefore?: ForkStage[];
  /** True once the fork has resolved. A choice can change only before that. After it, reset and replay. */
  resolved: (data: WorkflowData) => boolean;
}

/** A scenario is data: starting values plus content (pharmacies, prices, labels). */
export interface ScenarioDefinition<Content = unknown> {
  flowType: FlowType;
  /** The story's default branch at each fork, keyed by fork id. Every id and exit must be declared. */
  choices?: Record<string, string>;
  /**
   * How the referral reaches the platform. `erx` holds everything the PA needs, so a PA starts on its own once
   * BI says one is required. `fax` needs a manual PA: an email asks the provider and their submission starts it.
   * `esign` is the provider e-signature intake.
   */
  intake: "erx" | "fax" | "esign";
  /** Keep working and tested. Add no new features. */
  legacy?: boolean;
  /** Starting values that differ from the shared defaults. */
  initialData?: Partial<WorkflowData>;
  /** Patient fields that differ from the shared persona. */
  patient?: Partial<PatientPersona>;
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
  /** Set false for UI signals (such as VIEW_STAGE) that should not become an UNDO step. Default true. */
  snapshot?: boolean;
}

export interface WorkflowDefinition<C = any> {
  /** XState machine id. */
  id: string;
  rules: Rule<any, C>[];
  /** The forks this workflow declares. */
  forks?: ForkDefinition[];
  scenarios: Partial<Record<FlowType, ScenarioDefinition<C>>>;
  /** Scenario used when the machine starts without an input. */
  defaultFlowType: FlowType;
}
