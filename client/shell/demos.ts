/**
 * Starting and restarting a demo. A demo is a flow plus the branch to take at each fork
 * (client/brand/schema.ts, BrandDemo). This is the one place that applies those choices to the machine.
 */
import { getWorkflowActor, switchWorkflow } from "@/engine/actorSingleton";
import { useDemoStore } from "@/store/demoStore";
import type { BrandDemo } from "@/brand/schema";
import type { ForkDefinition } from "@/engine/workflow/types";
import { forkLeadIn } from "@/engine/workflow/forks";

/** True when the running machine already has every choice the demo asks for. */
function hasChoices(demo: BrandDemo): boolean {
  const current = (getWorkflowActor().getSnapshot().context as any).workflowData?.choices ?? {};
  return Object.entries(demo.choices ?? {}).every(([fork, exit]) => current[fork] === exit);
}

/**
 * Makes the running machine take the demo's branches. If the machine already has them, progress is kept.
 * If not, it restarts from the top with them. Reset keeps the current choices, so a demo with no `choices`
 * never needs a restart.
 */
export function applyDemoChoices(demo: BrandDemo): void {
  if (!demo.choices || hasChoices(demo)) return;
  useDemoStore.getState().resetDemo();
  getWorkflowActor().send({ type: "RESET", choices: demo.choices } as any);
}

/**
 * "Switch branch": resets the run, takes the chosen exit at the fork, and replays the story up to the fork.
 * The machine then waits at the fork with the choice made, so the next resolve takes that branch.
 * It replaced the DME-only resetDmeToBiRunning (resetToStage.ts, now removed).
 */
export function restartAtFork(fork: ForkDefinition, exitId: string): void {
  useDemoStore.getState().resetDemo();
  const actor = getWorkflowActor();
  actor.send({ type: "RESET", choices: { [fork.id]: exitId } } as any);
  for (const event of forkLeadIn(fork)) actor.send(event as any);
}

/** Selects a demo: remembers it, switches to its flow, and applies its choices. */
export function startDemo(demo: BrandDemo): void {
  useDemoStore.getState().selectDemo(demo);
  switchWorkflow(demo.flow);
  applyDemoChoices(demo);
}
