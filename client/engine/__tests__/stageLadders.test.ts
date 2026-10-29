import { describe, it, expect } from "vitest";
import { coassistStageEvents, HAND_BUILT_LADDER_EXITS } from "@/shell/coassistLadders";
import { iassistStageEvents } from "@/shell/iassistLadders";
import { faxStageEvents } from "@/shell/faxLadders";
import { recipeProblems } from "@/engine/workflow/recipe";
import { forksForScenario } from "@/engine/workflow/forks";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COASSIST_RECIPES } from "@/workflows/coassist/recipes";
import type { FlowType } from "@/engine/types";
import { isTransferScenario, TRANSFER_LADDER_EXITS } from "@/shell/transferLadders";
import { buyAndBillStageEvents, freeDrugStageEvents } from "@/shell/buyAndBillLadders";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { forkStageList } from "@/engine/workflow/forks";
import { biForkFor } from "@/workflows/coassist/forks";
import { ctx, expectMatchesFixture, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * The presenter's "jump to stage" menu (resetActorToStage in shell/DemoShell.tsx)
 * RESETs the actor and replays events up to a stage. The CoAssist event lists
 * live in shell/coassistLadders.ts, the same module DemoShell calls, so this
 * test exercises the real lists, not a copy.
 *
 * Each stage is replayed on a fresh actor. The fixture records which events
 * the machine ignored, so a stage that does not actually land shows up.
 */
const LADDERS = [
  { flowType: "CoA_DTP", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => coassistStageEvents("CoA_DTP", stage) },
  { flowType: "CoA_Copay", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => coassistStageEvents("CoA_Copay", stage) },
  { flowType: "CoA_Coverage", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => coassistStageEvents("CoA_Coverage", stage) },
  { flowType: "CoA_Medical_Transfer", stages: [2, 3, 4, 5], events: (stage: number) => coassistStageEvents("CoA_Medical_Transfer", stage) },
  { flowType: "iAssist_PA_Approved", stages: [2, 3, 4, 5, 6, 7], events: (stage: number) => iassistStageEvents("iAssist_PA_Approved", stage) },
  { flowType: "iAssist_PAP", stages: [2, 3, 4, 5, 6], events: (stage: number) => iassistStageEvents("iAssist_PAP", stage) },
  { flowType: "iAssist_Medical_Transfer", stages: [2, 3, 4, 5], events: (stage: number) => iassistStageEvents("iAssist_Medical_Transfer", stage) },
  { flowType: "iAssist_Buy_And_Bill", stages: [2, 3, 4, 5, 6], events: (stage: number) => buyAndBillStageEvents(stage) },
  { flowType: "iAssist_Buy_And_Bill_PAP", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => freeDrugStageEvents(stage) },
  { flowType: "Fax_QS_PA_Approved", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => faxStageEvents("standard", stage) },
  { flowType: "Fax_PAP_Audit", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => faxStageEvents("pap", stage) },
  { flowType: "PrES_PAP", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => faxStageEvents("pap", stage) },
] as const;

const BI_FORK = biForkFor("CoA_Coverage");

describe("Coverage stage jump follows the selected branch", () => {
  for (const exit of BI_FORK.exits) {
    it(`${exit.id}: every rung lands and the list matches the branch`, () => {
      withFrozenClock(() => {
        const choices = { bi: exit.id };
        const list = forkStageList(BI_FORK, { choices });
        // Rungs before the fork, then this branch's rungs.
        expect(list.map((s) => s.label)).toEqual([
          ...BI_FORK.stagesBefore!.map((s) => s.label),
          ...exit.stages!.map((s) => s.label),
        ]);
        for (const { stage } of list) {
          const actor = startFlow("CoA_Coverage", { choices });
          const records = runSteps(actor, coassistStageEvents("CoA_Coverage", stage, choices));
          expect(records.filter((r) => !r.accepted).map((r) => r.event)).toEqual([]);
          if (stage === list.length) {
            const { workflowData: d } = ctx(actor);
            expect(d.choices.bi).toBe(exit.id);
            expect(d.medicalBenefitStatus).toBe(exit.data.medicalBenefitStatus);
            expect(d.pharmacyBenefitStatus).toBe(exit.data.pharmacyBenefitStatus);
          }
          actor.stop();
        }
      });
    });
  }

  it("the branches have different lists", () => {
    const labels = BI_FORK.exits.map((e) => forkStageList(BI_FORK, { choices: { bi: e.id } }).map((s) => s.label).join("|"));
    expect(new Set(labels).size).toBe(BI_FORK.exits.length);
  });
});

/**
 * Every `bi` exit a recipe can pick needs stage-jump rungs, or the jump menu lands on the wrong branch. CoA_Coverage has
 * rungs per exit (BI_STAGES). DTP and Copay share a hand-built ladder that covers only HAND_BUILT_LADDER_EXITS.
 *
 * KNOWN_GAPS is the exits that are pickable but have no rungs. `no_coverage` on DTP and Copay has no patient screens
 * yet, so no demo uses it. The test pins the list: a new gap fails it (for example a recipe gains `provider_transfer`),
 * and so does closing one, so the list stays honest. Fix a gap by adding rungs to BI_STAGES, not by editing this list.
 */
const KNOWN_GAPS: Record<string, string[]> = {
  CoA_DTP: ["no_coverage"],
  CoA_Copay: ["no_coverage"],
  CoA_Coverage: [],
  // `pharmacy_covered` needs no module, so the recipe can pick it, but the scenario has no pricing screens for it.
  CoA_Medical_Transfer: ["pharmacy_covered"],
};

describe("stage ladder coverage of the bi fork", () => {
  for (const [flowType, recipe] of Object.entries(COASSIST_RECIPES)) {
    it(`${flowType}: every pickable exit has stage-jump rungs, apart from the known gaps`, () => {
      const forks = forksForScenario(COASSIST_FORKS, flowType as FlowType);
      const fork = biForkFor(flowType as FlowType);
      const pickable = fork.exits.filter((e) => recipeProblems({ ...recipe, choices: { ...recipe.choices, bi: e.id } }, forks).length === 0);
      const hasRungs = (id: string) =>
        flowType === "CoA_Coverage"
          ? !!fork.exits.find((e) => e.id === id)?.stages?.length
          : isTransferScenario(flowType)
          ? TRANSFER_LADDER_EXITS.includes(id)
          : HAND_BUILT_LADDER_EXITS.includes(id);
      expect(pickable.filter((e) => !hasRungs(e.id)).map((e) => e.id)).toEqual(KNOWN_GAPS[flowType]);
    });
  }
});

describe("stage ladders (jump to stage)", () => {
  for (const { flowType, stages: stageNumbers, events } of LADDERS) {
    it(flowType, () => {
      withFrozenClock(() => {
        const stages = stageNumbers.map((stage) => {
          const actor = startFlow(flowType);
          const records = runSteps(actor, events(stage));
          const { workflowData: d } = ctx(actor);
          const out = {
            stage,
            ignored: records.filter((r) => !r.accepted).map((r) => r.event),
            route: derivePatientRoute(ctx(actor)),
            biStatus: d.biStatus,
            paStatus: d.paStatus,
            pricingOption: d.pricingOption,
            dispatchStatus: d.dispatchStatus,
            pharmacyStatus: d.pharmacyStatus,
          };
          actor.stop();
          return out;
        });
        // A ladder must never send an event the machine ignores: that stage would not land.
        expect(stages.flatMap((s) => s.ignored)).toEqual([]);
        expectMatchesFixture(`ladders/${flowType}`, stages);
      });
    });
  }
});
