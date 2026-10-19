import type { FlowType, WorkflowData } from "@/engine/types";
import type { ForkDefinition, ForkExit, StageEvent } from "./types";

/** Pure helpers for forks. No React and no store, so rules, the factory, the UI, and tests share them. */

export const forkApplies = (fork: ForkDefinition, flowType: FlowType): boolean =>
  !fork.scenarios || fork.scenarios.includes(flowType);

/** The forks that apply to one scenario. */
export const forksForScenario = (forks: ForkDefinition[], flowType: FlowType): ForkDefinition[] =>
  forks.filter((f) => forkApplies(f, flowType));

/**
 * The branch the data has chosen at a fork. Falls back to the fork's first exit, so a snapshot
 * saved before the fork existed still resolves.
 */
export function exitFor(fork: ForkDefinition, data: Pick<WorkflowData, "choices">): ForkExit {
  const picked = data.choices?.[fork.id];
  return fork.exits.find((e) => e.id === picked) ?? fork.exits[0];
}

/**
 * The exit a patient has picked, read from the data through the fork's `picked`. Undefined before the pick,
 * or for a fork with no `picked`. Unlike `exitFor`, it never falls back to the first exit.
 */
export function pickedExit(fork: ForkDefinition, data: WorkflowData): ForkExit | undefined {
  const id = fork.picked?.(data);
  return id ? fork.exits.find((e) => e.id === id) : undefined;
}

export interface StageItem {
  /** 1-based. Stage 1 is the reset itself. */
  stage: number;
  label: string;
  events: StageEvent[];
}

/** The stage-jump list for a flow with a fork: the rungs before the fork, then the selected branch's rungs. */
export function forkStageList(fork: ForkDefinition, data: Pick<WorkflowData, "choices">): StageItem[] {
  const rungs = [...(fork.stagesBefore ?? []), ...(exitFor(fork, data).stages ?? [])];
  return rungs.map((rung, i) => ({ stage: i + 1, label: rung.label, events: rung.events }));
}

/** Every event to send, in order, to land a RESET machine on `stage`. Stage 1 sends nothing. */
export function forkStageEvents(fork: ForkDefinition, data: Pick<WorkflowData, "choices">, stage: number): StageEvent[] {
  return forkStageList(fork, data)
    .filter((s) => s.stage <= stage)
    .flatMap((s) => s.events);
}

/** The events that take a fresh run to the point where the fork is about to resolve. */
export const forkLeadIn = (fork: ForkDefinition): StageEvent[] => (fork.stagesBefore ?? []).flatMap((s) => s.events);

/** Problems with a set of choices for one scenario. Empty when every choice names a real fork and exit. */
export function choiceProblems(
  forks: ForkDefinition[],
  flowType: FlowType,
  choices: Record<string, string> | undefined,
): string[] {
  const problems: string[] = [];
  for (const [forkId, exitId] of Object.entries(choices ?? {})) {
    const fork = forksForScenario(forks, flowType).find((f) => f.id === forkId);
    if (!fork) problems.push(`${flowType} has no fork "${forkId}"`);
    else if (!fork.exits.some((e) => e.id === exitId)) {
      problems.push(`fork "${forkId}" has no exit "${exitId}" (exits: ${fork.exits.map((e) => e.id).join(", ")})`);
    }
  }
  return problems;
}
