import { describe, it, expect } from "vitest";
import { stageMapProblems, stageVariantsFor, stagesFor } from "@/engine/workflow/stages";
import { STAGE_MAPS, stageMapFor } from "@/workflows/stageMaps";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { STAGE_BUILDERS } from "@/portals/crm/stages/builders";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The CRM stage maps (workflows/<name>/stages.ts) are sound, serve every flow once, and name builders that exist.
 * What each scenario shows, along its golden path, is recorded in crm.stages.test.ts.
 */
describe("CRM stage maps", () => {
  for (const [i, map] of STAGE_MAPS.entries()) {
    it(`map ${i + 1} has no problems`, () => {
      expect(stageMapProblems(map)).toEqual([]);
    });
  }

  it("every scenario is served by exactly one map", () => {
    for (const scenario of ALL_SCENARIOS) {
      expect(STAGE_MAPS.filter((m) => m.flows.includes(scenario.flowType)).length, scenario.flowType).toBe(1);
    }
  });

  it("every variant a scenario can use has a builder", () => {
    const missing: string[] = [];
    for (const scenario of ALL_SCENARIOS) {
      for (const { stage, variant } of stageVariantsFor(stageMapFor(scenario.flowType), scenario.flowType)) {
        if (!STAGE_BUILDERS[stage]?.[variant]) missing.push(`${scenario.flowType}: ${stage}.${variant}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every builder is used by some scenario, so the table only shrinks", () => {
    const used = new Set<string>();
    for (const scenario of ALL_SCENARIOS) {
      for (const { stage, variant } of stageVariantsFor(stageMapFor(scenario.flowType), scenario.flowType)) used.add(`${stage}.${variant}`);
    }
    const unused = Object.entries(STAGE_BUILDERS).flatMap(([stage, variants]) =>
      Object.keys(variants).filter((v) => !used.has(`${stage}.${v}`)).map((v) => `${stage}.${v}`),
    );
    expect(unused).toEqual([]);
  });

  it("a builder draws the stage it is registered for", () => {
    withFrozenClock(() => {
      const wrong: string[] = [];
      for (const scenario of ALL_SCENARIOS) {
        const actor = startFlow(scenario.flowType);
        const d = ctx(actor).workflowData;
        actor.stop();
        for (const { stage, variant } of stageVariantsFor(stageMapFor(scenario.flowType), scenario.flowType)) {
          const drawn = STAGE_BUILDERS[stage][variant](d);
          if (drawn.id !== stage) wrong.push(`${stage}.${variant} drew ${drawn.id}`);
        }
      }
      expect(wrong).toEqual([]);
    });
  });

  it("shows each stage at most once, in catalog order, at every step of every golden path", () => {
    withFrozenClock(() => {
      for (const scenario of SCENARIOS) {
        const map = stageMapFor(scenario.flowType);
        const order = map.catalog.map((s) => s.id);
        const actor = startFlow(scenario.flowType, scenario.choices ? { choices: scenario.choices } : {});
        const check = () => {
          const ids = stagesFor(map, ctx(actor).workflowData).map((p) => p.stage);
          expect(new Set(ids).size, scenario.name).toBe(ids.length);
          expect(ids, scenario.name).toEqual(order.filter((id) => ids.includes(id)));
        };
        check();
        for (const step of scenario.steps) {
          runSteps(actor, [step]);
          check();
        }
        actor.stop();
      }
    });
  });
});
