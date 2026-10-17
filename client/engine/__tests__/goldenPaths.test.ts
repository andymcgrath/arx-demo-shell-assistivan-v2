import { describe, it, expect } from "vitest";
import { expectMatchesFixture, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * One test per scenario. Fails if:
 *  - a step the scenario expects is ignored by the machine (event list is stale), or
 *  - the recorded route, fields, or emitted events change from the committed fixture.
 *
 * Intentional behavior change? Run `RECORD=1 pnpm test`, then review the fixture diff.
 */
describe("golden paths", () => {
  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      withFrozenClock(() => {
        const actor = startFlow(scenario.flowType);
        const records = runSteps(actor, scenario.steps);

        const ignored = records.map((r, i) => (r.accepted ? -1 : i)).filter((i) => i >= 0);
        expect(ignored).toEqual(scenario.ignored ?? []);

        expectMatchesFixture(`golden/${scenario.name}`, {
          flowType: scenario.flowType,
          steps: records,
        });
        actor.stop();
      });
    });
  }
});
