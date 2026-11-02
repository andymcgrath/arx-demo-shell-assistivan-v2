import { describe, expect, it } from "vitest";
import { jumpEvents, stageList } from "@/shell/stageJump";
import { progress, stageAt } from "@/shell/stageAt";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { SCENARIOS } from "./scenarios";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * Which stage of the jump list a case is on (shell/stageAt.ts). The patient view's rail and guided Next and Back depend
 * on it, so it is tested two ways. Replaying a stage's own ladder must land on a stage with the same progress (two stages
 * can share progress, for example when BI starts on its own at the referral, and the later one wins), and a golden path
 * must never move backwards and, when it delivers the Rx, must end on the last stage.
 */

/** Demo fork picks for the golden paths that send their outcome directly (the same as the Trigger panel test). */
const DEMO_CHOICES: Record<string, Record<string, string>> = {
  "coa-dtp-pa-denied-cash-offer": { pa: "denied" },
  "coa-coverage-2-medical-covered-provider-transfer": { bi: "medical_covered" },
  "coa-coverage-3-no-coverage-cash-pay": { bi: "no_coverage" },
};

describe("stageAt, ladder by ladder", () => {
  for (const def of ALL_SCENARIOS) {
    // A scenario with a `bi` fork has a different list on each branch, so check every branch.
    const bi = (def.flowType === "CoA_Coverage" || def.flowType === "CoA_PAP") ? ["pharmacy_covered", "pharmacy_transfer", "medical_covered", "medical_pa_required", "no_coverage", "no_coverage_pap"] : [undefined];
    for (const exit of bi) {
      it(`${def.flowType}${exit ? ` (bi: ${exit})` : ""}: replaying each stage's ladder lands on a stage with the same progress`, () => {
        withFrozenClock(() => {
          const choices = { ...def.choices, ...(exit ? { bi: exit } : {}) };
          const list = stageList(def.flowType, choices);
          for (const { stage } of list) {
            const actor = startFlow(def.flowType, { choices });
            runSteps(actor, jumpEvents(def.flowType, stage, choices) as any);
            const data = ctx(actor).workflowData;
            actor.stop();
            const at = stageAt(def.flowType, data.choices, data);
            const ladder = (n: number) => {
              const a = startFlow(def.flowType, { choices });
              runSteps(a, jumpEvents(def.flowType, n, choices) as any);
              const out = progress(ctx(a).workflowData);
              a.stop();
              return out;
            };
            expect({ flow: def.flowType, exit, stage, at, atLeast: at >= stage }).toMatchObject({ atLeast: true });
            expect({ flow: def.flowType, exit, stage, at, sameProgress: ladder(at).join() === ladder(stage).join() }).toMatchObject({ sameProgress: true });
          }
        });
      });
    }
  }
});

describe("stageAt, along every golden path", () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: never moves backwards, and a delivered Rx is the last stage`, () => {
      withFrozenClock(() => {
        const choices = { ...scenario.choices, ...DEMO_CHOICES[scenario.name] };
        const actor = startFlow(scenario.flowType, Object.keys(choices).length ? { choices } : {});
        const seen: number[] = [];
        const at = () => {
          const d = ctx(actor).workflowData;
          seen.push(stageAt(scenario.flowType, d.choices, d));
        };
        at();
        for (const { type, ...payload } of scenario.steps) {
          actor.send({ type, ...payload } as any);
          at();
        }
        const d = ctx(actor).workflowData;
        const last = stageList(scenario.flowType, d.choices).length;
        actor.stop();
        expect({ scenario: scenario.name, seen }).toEqual({ scenario: scenario.name, seen: [...seen].sort((a, b) => a - b) });
        if (scenario.endsAt === "delivered") {
          expect({ scenario: scenario.name, end: seen[seen.length - 1] }).toEqual({ scenario: scenario.name, end: last });
        }
      });
    });
  }
});
