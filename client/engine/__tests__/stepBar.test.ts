import { describe, it, expect } from "vitest";
import { stepBarModel } from "@/shell/stepBar";
import { ctx, expectMatchesFixture, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The shell step bar (shell/stepBar.ts) after every event of every golden path: the labels, which steps are done,
 * the current step, and the ring settings. Rule 7 cleanup step 53 moved the flow checks inside it onto
 * scenarioFacts. This fixture must not change when it does.
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */
describe("shell step bar along the golden paths", () => {
  const recorded: Record<string, unknown> = {};

  for (const scenario of SCENARIOS) {
    it(scenario.name, () => {
      withFrozenClock(() => {
        const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
        const labelSets: string[][] = [];
        const snapshot = (after: string) => {
          const m = stepBarModel(scenario.flowType, ctx(actor).workflowData);
          let set = labelSets.findIndex((l) => JSON.stringify(l) === JSON.stringify(m.labels));
          if (set < 0) set = labelSets.push(m.labels) - 1;
          return {
            after,
            labelSet: set,
            done: m.stepDone ? m.stepDone.map((d) => (d ? "x" : ".")).join("") : null,
            workflowStep: m.workflowStep,
            paRingApplies: m.paRingApplies,
            rxRingsOff: m.rxRingsOff,
            rxProcessingStepN: m.rxProcessingStepN,
            rxShippedStepN: m.rxShippedStepN,
          };
        };
        const steps = [snapshot("(start)")];
        for (const step of scenario.steps) {
          runSteps(actor, [step]);
          steps.push(snapshot(step.type));
        }
        actor.stop();
        recorded[scenario.name] = { flowType: scenario.flowType, labelSets, steps };
      });
    });
  }

  it("matches the recorded fixture", () => {
    expect(Object.keys(recorded).length).toBe(SCENARIOS.length);
    expectMatchesFixture("ui/stepBar", recorded);
  });

  it("every Rx ring sits on a step the bar has", () => {
    for (const scenario of SCENARIOS) {
      withFrozenClock(() => {
        const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
        for (const step of [{ type: "(start)" }, ...scenario.steps]) {
          if (step.type !== "(start)") runSteps(actor, [step]);
          const m = stepBarModel(scenario.flowType, ctx(actor).workflowData);
          for (const n of [m.rxProcessingStepN, m.rxShippedStepN]) {
            // 0 means the bar has no such step. The iAssist appeal bar keeps its ring on the last dot.
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(m.labels.length);
          }
        }
        actor.stop();
      });
    }
  });

  it("the patient support program bar rings its Delivery step while the Rx is in transit", () => {
    withFrozenClock(() => {
      const actor = startFlow("CoA_PAP");
      const m = stepBarModel("CoA_PAP", ctx(actor).workflowData);
      expect(m.labels).toHaveLength(6);
      expect(m.labels[m.rxProcessingStepN - 1]).toBe("Delivery");
      expect(m.labels[m.rxShippedStepN - 1]).toBe("Delivery");
      actor.stop();
    });
  });
});
