import { describe, it, expect } from "vitest";
import { buildCrmStages } from "@/portals/crm/stages/buildStages";
import { ctx, expectMatchesFixture, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The CRM stage list (portals/crm/stages/buildStages.ts), which feeds the Stage Quick View and the stage tabs, after
 * every event of every golden path. Rule 7 cleanup step 56 moved it out of the page, then moved its flow checks onto
 * scenarioFacts. This fixture must not change when it does.
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */
describe("CRM stage list along the golden paths", () => {
  const recorded: Record<string, unknown> = {};

  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      withFrozenClock(() => {
        const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
        // The first entry holds the whole list. Later entries hold the stage order and only the stages that changed.
        let last: Record<string, string> = {};
        const snapshot = (after: string) => {
          const w = ctx(actor).workflowData;
          const stages = buildCrmStages(w);
          const changed = stages.filter((st) => last[st.id] !== JSON.stringify(st));
          last = Object.fromEntries(stages.map((st) => [st.id, JSON.stringify(st)]));
          return { after, order: stages.map((st) => st.id), changed };
        };
        const steps = [snapshot("(start)")];
        for (const step of scenario.steps) {
          runSteps(actor, [step]);
          steps.push(snapshot(step.type));
        }
        actor.stop();
        recorded[scenario.name] = { flowType: scenario.flowType, steps };
      });
    });
  }

  it("matches the recorded fixture", () => {
    expect(Object.keys(recorded).length).toBe(SCENARIOS.length);
    expectMatchesFixture("ui/crmStages", recorded);
  });
});
