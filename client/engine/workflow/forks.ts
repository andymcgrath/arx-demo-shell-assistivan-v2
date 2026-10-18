import type { FlowType, WorkflowData } from "@/engine/types";
import type { ForkDefinition, ForkExit } from "./types";

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
