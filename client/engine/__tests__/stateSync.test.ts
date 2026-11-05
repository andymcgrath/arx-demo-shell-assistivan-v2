import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { workflowRegistry } from "@/engine/WorkflowRegistry";
import { SCENARIOS } from "./scenarios";
import { SimulatedClock, ctx, startFlow, withFrozenClock } from "./harness";

/**
 * State must recover on its own. A reload, a switch to another scenario and back, or an UNDO can all land in the
 * middle of a delayed automation (BI result, PA decision). XState keeps those timers in memory, so a restored run
 * must re-arm them. Without that the run waits forever and only Reset All recovers it.
 */
const SETTLE_STEP_MS = 5000;
const SETTLE_STEPS = 24; // chained automations need several advances, one per link

const settle = (clock: SimulatedClock) => {
  for (let i = 0; i < SETTLE_STEPS; i++) clock.increment(SETTLE_STEP_MS);
};
const roundTrip = (snapshot: unknown) => JSON.parse(JSON.stringify(snapshot));

describe("a restored run finishes what the original run would have", () => {
  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      withFrozenClock(() => {
        const options = scenario.choices ? { choices: scenario.choices } : {};
        const machine = workflowRegistry.getWorkflow(scenario.flowType)!;
        for (let cut = 0; cut <= scenario.steps.length; cut++) {
          const clock = new SimulatedClock();
          const original = startFlow(scenario.flowType, { ...options, clock });
          for (const { type, ...payload } of scenario.steps.slice(0, cut)) original.send({ type, ...payload } as any);

          // The reload: JSON in sessionStorage, a new actor, and the re-arm that actorSingleton sends.
          const clock2 = new SimulatedClock();
          const restored = createActor(machine, { snapshot: roundTrip(original.getPersistedSnapshot()), clock: clock2 } as any);
          restored.start();
          restored.send({ type: "REARM_TIMERS" } as any);

          settle(clock);
          settle(clock2);
          expect({ cut, data: ctx(restored).workflowData }).toEqual({ cut, data: ctx(original).workflowData });
          original.stop();
          restored.stop();
        }
      });
    });
  }
});
