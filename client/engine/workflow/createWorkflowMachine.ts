/**
 * createWorkflowMachine: turns a WorkflowDefinition (a rules table plus
 * scenarios) into an XState machine.
 *
 * Why one state, not a state graph: for these workflows every "state" was a
 * function of WorkflowData (paStatus, biStatus, pricingOption, and so on),
 * and nothing in the UI reads the machine's state value. Preconditions on
 * WorkflowData say the same thing with no duplicated handlers.
 *
 * The scenario arrives as XState `input` ({ flowType }) and lives on in
 * workflowData.flowType, so persisted snapshots restore with it.
 */
import { assign, enqueueActions, setup } from "xstate";
import type { DemoEvent, FlowType, MachineContext } from "@/engine/types";
import { createInitialWorkflowData } from "./baseData";
import { choiceProblems, forkApplies } from "./forks";
import type { Portal, Rule, ScenarioDefinition, WorkflowDefinition } from "./types";

function createEvent(context: MachineContext, eventType: string, portal: Portal, step: number): DemoEvent {
  return {
    id: crypto.randomUUID(),
    eventType,
    portal,
    flowType: context.workflowData.flowType,
    workflowStep: step,
    metadata: null,
    createdAt: new Date().toISOString(),
  };
}

const MAX_SNAPSHOTS = 20;

/** Stores a copy of the context for UNDO. `_snapshots` is stripped so snapshots do not nest and bloat storage. */
function pushSnapshot(snapshots: MachineContext[], context: MachineContext): MachineContext[] {
  const updated = [...snapshots, { ...context, _snapshots: [] }];
  return updated.length > MAX_SNAPSHOTS ? updated.slice(-MAX_SNAPSHOTS) : updated;
}

const toArray = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function createWorkflowMachine<C>(def: WorkflowDefinition<C>) {
  const scenarioFor = (flowType: FlowType | undefined): ScenarioDefinition<C> => {
    const scenario = (flowType && def.scenarios[flowType]) || def.scenarios[def.defaultFlowType];
    if (!scenario) throw new Error(`Workflow "${def.id}" has no scenario for ${flowType ?? def.defaultFlowType}`);
    return scenario;
  };

  const forks = def.forks ?? [];
  for (const fork of forks) {
    if (forks.filter((f) => f.id === fork.id && (!f.scenarios || !fork.scenarios || f.scenarios.some((s) => fork.scenarios!.includes(s)))).length > 1) {
      throw new Error(`Workflow "${def.id}": fork "${fork.id}" is declared twice for the same scenario`);
    }
    if (fork.exits.length < 2) throw new Error(`Workflow "${def.id}": fork "${fork.id}" needs at least two exits`);
    if (new Set(fork.exits.map((e) => e.id)).size !== fork.exits.length) {
      throw new Error(`Workflow "${def.id}": fork "${fork.id}" has two exits with the same id`);
    }
  }
  for (const scenario of Object.values(def.scenarios)) {
    if (!scenario) continue;
    const problems = choiceProblems(forks, scenario.flowType, scenario.choices);
    if (problems.length) throw new Error(`Workflow "${def.id}", scenario ${scenario.flowType}: ${problems.join("; ")}`);
  }

  /** Drops choices that name no real fork or exit, so a stale event cannot corrupt the data. */
  const validChoices = (flowType: FlowType, choices: Record<string, string> | undefined) =>
    Object.fromEntries(
      Object.entries(choices ?? {}).filter(([forkId, exitId]) => choiceProblems(forks, flowType, { [forkId]: exitId }).length === 0),
    );

  const startingData = (flowType: FlowType | undefined, choices?: Record<string, string>) => {
    const scenario = scenarioFor(flowType);
    return createInitialWorkflowData(scenario.flowType, {
      ...scenario.initialData,
      // The story's defaults, then whatever the caller picked.
      choices: { ...scenario.choices, ...validChoices(scenario.flowType, choices) },
    });
  };

  // Group rules by event, keeping declaration order (first match wins).
  const byEvent = new Map<string, Rule<any, C>[]>();
  for (const rule of def.rules) byEvent.set(rule.on, [...(byEvent.get(rule.on) ?? []), rule]);

  // Every id a delayed automation uses, so RESET can cancel them all.
  const automationIds = new Set<string>();
  for (const rule of def.rules) {
    for (const a of toArray(rule.then)) {
      if (a.after && !a.id) throw new Error(`Workflow "${def.id}": a delayed automation on ${rule.on} needs an id`);
      if (a.id) automationIds.add(a.id);
    }
    for (const id of rule.cancel ?? []) automationIds.add(id);
  }

  const appliesTo = (rule: Rule<any, C>, flowType: FlowType) => !rule.scenarios || rule.scenarios.includes(flowType);

  const on: Record<string, any[]> = {};
  for (const [eventType, rules] of byEvent) {
    on[eventType] = rules.map((rule) => ({
      guard: ({ context, event }: any) => {
        const data = context.workflowData;
        return appliesTo(rule, data.flowType) && (rule.when ? rule.when(data, event, scenarioFor(data.flowType)) : true);
      },
      actions: [
        assign(({ context, event }: any) => {
          const scenario = scenarioFor(context.workflowData.flowType);
          const data = { ...context.workflowData, ...(rule.set ? rule.set(context.workflowData, event, scenario) : {}) };
          const emitted = toArray(rule.emit)
            .filter((e) => (e.when ? e.when(data, event, scenario) : true))
            .map((e) => createEvent(context, e.type ?? event.type, e.portal, e.step));
          // One UNDO step per thing a person did. A same-step automation (`_auto`) rides along with the
          // step that fired it. UI signals (`snapshot: false`) are not steps.
          const takeSnapshot = rule.snapshot !== false && !event._auto;
          return {
            workflowData: data,
            events: [...context.events, ...emitted],
            _snapshots: takeSnapshot ? pushSnapshot(context._snapshots, context) : context._snapshots,
          };
        }),
        // Runs after the assign above, so `context` already holds the new data.
        ...(rule.then || rule.cancel
          ? [
              enqueueActions(({ context, event, enqueue }: any) => {
                for (const id of rule.cancel ?? []) enqueue.cancel(id);
                const data = context.workflowData;
                const scenario = scenarioFor(data.flowType);
                for (const a of toArray(rule.then)) {
                  if (a.when && !a.when(data, event, scenario)) continue;
                  const next = a.send(data, event, scenario);
                  // A delayed automation is a visible step (the reveal), so it can be undone. A same-step one is not.
                  if (a.after) enqueue.raise(next, { delay: a.after, id: a.id });
                  else enqueue.raise({ ...next, _auto: true });
                }
              }),
            ]
          : []),
      ],
    }));
  }

  return setup({
    types: {
      context: {} as MachineContext,
      input: {} as { flowType?: FlowType; choices?: Record<string, string> } | undefined,
      events: {} as { type: string; [key: string]: unknown },
    },
  }).createMachine({
    id: def.id,
    context: ({ input }) => ({
      workflowData: startingData(input?.flowType, input?.choices),
      events: [],
      _snapshots: [],
    }),
    initial: "active",
    states: {
      active: {
        on: {
          ...on,
          // CHOOSE { fork, exit }: the presenter picks a branch before the fork resolves. Not an UNDO step and
          // not an event-log entry. After the fork resolves, the caller resets (RESET carries `choices`) and replays.
          ...(forks.length
            ? {
                CHOOSE: {
                  guard: ({ context, event }: any) => {
                    const data = context.workflowData;
                    const fork = forks.find((f) => f.id === event.fork && forkApplies(f, data.flowType));
                    return !!fork && fork.exits.some((e) => e.id === event.exit) && !fork.resolved(data);
                  },
                  actions: assign(({ context, event }: any) => ({
                    workflowData: {
                      ...context.workflowData,
                      choices: { ...(context.workflowData.choices ?? {}), [event.fork]: event.exit },
                    },
                  })),
                },
              }
            : {}),
          // UNDO restores the context from before the last step and drops any pending delayed automation.
          UNDO: {
            guard: ({ context }: any) => context._snapshots.length > 0,
            actions: [
              enqueueActions(({ enqueue }: any) => {
                for (const id of automationIds) enqueue.cancel(id);
              }),
              assign(({ context }: any) => {
                const last = context._snapshots[context._snapshots.length - 1];
                return { ...last, _snapshots: context._snapshots.slice(0, -1) };
              }),
            ],
          },
          // RESET keeps the running scenario and its fork choices. `choices` on the event changes some of them.
          RESET: {
            actions: [
              // A reset must not let a pending delayed automation fire into the fresh run.
              enqueueActions(({ enqueue }: any) => {
                for (const id of automationIds) enqueue.cancel(id);
              }),
              assign(({ context, event }: any) => ({
                workflowData: startingData(context.workflowData.flowType, {
                  ...(context.workflowData.choices ?? {}),
                  ...(event.choices ?? {}),
                }),
                events: [],
                _snapshots: [],
              })),
            ],
          },
        },
      },
    },
  });
}
