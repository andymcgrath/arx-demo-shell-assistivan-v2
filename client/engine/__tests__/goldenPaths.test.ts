import { describe, it, expect } from "vitest";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { ctx, expectMatchesFixture, runSteps, startFlow, withFrozenClock } from "./harness";
import { END_STATES, SCENARIOS } from "./scenarios";

/**
 * One test per scenario. Fails if:
 *  - a step the scenario expects is ignored by the machine (event list is stale), or
 *  - the recorded route, fields, or emitted events change from the committed fixture.
 *
 * Intentional behavior change? Run `RECORD=1 pnpm test`, then review the fixture diff.
 */
describe("scenario coverage", () => {
  it("has a golden path for every scenario the workflows define", () => {
    const covered = new Set(SCENARIOS.map((s) => s.flowType));
    expect(ALL_SCENARIOS.map((s) => s.flowType).filter((f) => !covered.has(f))).toEqual([]);
  });

  it("names an end state that a failing path cannot satisfy by accident", () => {
    // A machine that never started reaches none of them. This guards a predicate that is always true.
    const start = startFlow("CoA_DTP");
    const data = ctx(start).workflowData;
    start.stop();
    for (const [name, reached] of Object.entries(END_STATES)) expect({ name, reached: reached(data) }).toEqual({ name, reached: false });
  });
});

describe("golden paths", () => {
  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      withFrozenClock(() => {
        const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
        const records = runSteps(actor, scenario.steps);

        const ignored = records.map((r, i) => (r.accepted ? -1 : i)).filter((i) => i >= 0);
        expect(ignored).toEqual(scenario.ignored ?? []);

        // The event list must reach the end state it names (CLAUDE.md rule 8).
        expect({ endsAt: scenario.endsAt, reached: END_STATES[scenario.endsAt](ctx(actor).workflowData) }).toEqual({
          endsAt: scenario.endsAt,
          reached: true,
        });

        expectMatchesFixture(`golden/${scenario.name}`, {
          flowType: scenario.flowType,
          steps: records,
        });
        actor.stop();
      });
    });
  }
});
