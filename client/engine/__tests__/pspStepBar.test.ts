import { describe, it, expect } from "vitest";
import { pspStepBar } from "@/shell/pspStepBar";
import { coassistStageEvents } from "@/shell/coassistLadders";
import { forkStageList } from "@/engine/workflow/forks";
import { biForkFor } from "@/workflows/coassist/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { pspStages } from "@/portals/crm/pspStages";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";
import { SCENARIOS } from "./scenarios";

/**
 * The CoA_PAP shell step bar (shell/pspStepBar.ts) against the stage-jump list the presenter sees
 * (workflows/coassist/forks.ts, BI_STAGES) and the golden path. A bar step names the first rung where it is done.
 */
const CHOICES = { bi: "no_coverage_pap" };
const bar = pspStepBar("CoA_PAP")!;
const rungs = forkStageList(biForkFor("CoA_PAP"), { choices: CHOICES });

describe("pspStepBar", () => {
  it("applies to the scenarios whose recipe has pap_transfer, and no others", () => {
    const withBar = ALL_SCENARIOS.filter((s) => pspStepBar(s.flowType) !== null).map((s) => s.flowType);
    expect(withBar).toEqual(ALL_SCENARIOS.filter((s) => s.recipe?.modules.some((m) => m.id === "pap_transfer")).map((s) => s.flowType));
    expect(withBar).toEqual(["CoA_PAP"]);
  });

  it("has the journey labels", () => {
    expect(bar.map((s) => s.label)).toEqual(["Referral", "Enrolled", "BI", "Transfer to PSP", "Income verified", "Delivery"]);
  });

  it("names a rung from the stage-jump list for every step, in order", () => {
    const index = bar.map((s) => rungs.findIndex((r) => r.label === s.rung));
    expect(index.every((i) => i >= 0)).toBe(true);
    expect([...index].sort((a, b) => a - b)).toEqual(index);
  });

  it("is done at each rung exactly for the steps that name it or an earlier rung", () => {
    withFrozenClock(() => {
      for (const { stage, label } of rungs) {
        const actor = startFlow("CoA_PAP", { choices: CHOICES });
        runSteps(actor, coassistStageEvents("CoA_PAP", stage, CHOICES));
        const done = bar.map((s) => s.done(ctx(actor).workflowData));
        const expected = bar.map((s) => rungs.findIndex((r) => r.label === s.rung) + 1 <= stage);
        expect({ label, done }).toEqual({ label, done: expected });
        actor.stop();
      }
    });
  });

  it("advances in order along the golden path and ends with every step done", () => {
    const golden = SCENARIOS.find((s) => s.flowType === "CoA_PAP")!;
    withFrozenClock(() => {
      const actor = startFlow("CoA_PAP", { choices: CHOICES });
      let doneCount = 0;
      for (const step of golden.steps) {
        runSteps(actor, [step]);
        const done = bar.map((s) => s.done(ctx(actor).workflowData));
        const count = done.filter(Boolean).length;
        expect({ step: step.type, prefix: done.slice(0, count).every(Boolean) }).toEqual({ step: step.type, prefix: true });
        expect(count).toBeGreaterThanOrEqual(doneCount);
        doneCount = count;
      }
      expect(doneCount).toBe(bar.length);
      actor.stop();
    });
  });
});

describe("pspStages (CRM)", () => {
  it("shows BI, the PSP referral, and the income check, and reads the bi choice", () => {
    withFrozenClock(() => {
      const actor = startFlow("CoA_PAP", { choices: CHOICES });
      runSteps(actor, coassistStageEvents("CoA_PAP", 4, CHOICES));
      const stages = pspStages(ctx(actor).workflowData, "Program");
      expect(stages.map((s) => s.name)).toEqual(["Benefits Investigation", "Patient Support Program Referral", "Income Verification"]);
      expect(stages[0].statusDetail).toContain("Patient Support Program");
      expect(stages[1].statusLabel).toBe("Referred");
      actor.stop();
    });
  });
});
