import { describe, it, expect } from "vitest";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS as GOLDEN_PATHS } from "./scenarios";
import { scenarioFacts } from "@/workflows/scenarioFacts";

/** A web-source scenario has no CRM, and its BI and PA land on system timers (see coassist.web.test.ts), so no agent opens a stage. */
const SCENARIOS = GOLDEN_PATHS.filter((s) => !scenarioFacts(s.flowType).isWebSource);

/**
 * The CRM's visible 3 second wait. The agent opens the BI stage and sees "Running" for 3 seconds, then the result. Same
 * for the PA stage. The CRM only reports VIEW_STAGE and LEAVE_STAGE. The machine owns the delay (rule 10), so this runs
 * headless: for every scenario, at the first moment BI is running (or the PA is submitted), the reveal lands at exactly
 * 3000 ms after the stage opens, and leaving the stage cancels it.
 */
const REVEAL_MS = 3000;

type Scenario = (typeof SCENARIOS)[number];

/** A fresh actor replayed to the first point (start, or after step k) where `at` holds, or null if it never does. */
function replayUntil(scenario: Scenario, at: (d: ReturnType<typeof ctx>["workflowData"]) => boolean) {
  for (let k = -1; k < scenario.steps.length; k++) {
    const clock = new SimulatedClock();
    const actor = startFlow(scenario.flowType, { clock, ...(scenario.choices ? { choices: scenario.choices } : {}) });
    runSteps(actor, scenario.steps.slice(0, k + 1));
    if (at(ctx(actor).workflowData)) return { actor, clock };
    actor.stop();
  }
  return null;
}

describe("CRM reveal delay, per scenario", () => {
  let biSeen = 0;
  let paSeen = 0;

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: opening BI reveals the result after 3 seconds, and leaving cancels it`, () => {
      withFrozenClock(() => {
        const shown = replayUntil(scenario, (d) => d.biStatus === "running");
        if (!shown) return;
        biSeen++;
        runSteps(shown.actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
        shown.clock.increment(REVEAL_MS - 1);
        expect(ctx(shown.actor).workflowData.biStatus).toBe("running");
        shown.clock.increment(1);
        expect(ctx(shown.actor).workflowData.biStatus).toBe("complete");
        shown.actor.stop();

        const left = replayUntil(scenario, (d) => d.biStatus === "running")!;
        runSteps(left.actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
        left.clock.increment(1000);
        runSteps(left.actor, [{ type: "LEAVE_STAGE", stage: "BI" }]);
        left.clock.increment(10 * REVEAL_MS);
        expect(ctx(left.actor).workflowData.biStatus).toBe("running");
        left.actor.stop();
      });
    });

    it(`${scenario.name}: opening PA decides it after 3 seconds, and leaving cancels it`, () => {
      withFrozenClock(() => {
        const shown = replayUntil(scenario, (d) => d.paStatus === "submitted");
        if (!shown) return;
        paSeen++;
        runSteps(shown.actor, [{ type: "VIEW_STAGE", stage: "PA" }]);
        shown.clock.increment(REVEAL_MS - 1);
        expect(ctx(shown.actor).workflowData.paStatus).toBe("submitted");
        shown.clock.increment(1);
        expect(["approved", "denied"]).toContain(ctx(shown.actor).workflowData.paStatus);
        shown.actor.stop();

        const left = replayUntil(scenario, (d) => d.paStatus === "submitted")!;
        runSteps(left.actor, [{ type: "VIEW_STAGE", stage: "PA" }]);
        left.clock.increment(1000);
        runSteps(left.actor, [{ type: "LEAVE_STAGE", stage: "PA" }]);
        left.clock.increment(10 * REVEAL_MS);
        expect(ctx(left.actor).workflowData.paStatus).toBe("submitted");
        left.actor.stop();
      });
    });
  }

  it("the check ran on real scenarios", () => {
    expect(biSeen).toBe(SCENARIOS.length); // every scenario has a BI stage
    expect(paSeen).toBeGreaterThan(5);
  });
});
