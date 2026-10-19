import { describe, it, expect } from "vitest";
import { coassistStageEvents } from "@/shell/coassistLadders";
import { iassistStageEvents } from "@/shell/iassistLadders";
import { faxStageEvents } from "@/shell/faxLadders";
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
  { flowType: "iAssist_PA_Approved", stages: [2, 3, 4, 5, 6, 7], events: (stage: number) => iassistStageEvents("iAssist_PA_Approved", stage) },
  { flowType: "iAssist_PAP", stages: [2, 3, 4, 5, 6], events: (stage: number) => iassistStageEvents("iAssist_PAP", stage) },
  { flowType: "Fax_QS_PA_Approved", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => faxStageEvents("standard", stage) },
  { flowType: "Fax_PAP_Audit", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => faxStageEvents("pap", stage) },
  { flowType: "PrES_PAP", stages: [2, 3, 4, 5, 6, 7, 8], events: (stage: number) => faxStageEvents("pap", stage) },
] as const;

const DME_BI_FORK = biForkFor("CoA_Coverage");

describe("DME stage jump follows the selected branch", () => {
  for (const exit of DME_BI_FORK.exits) {
    it(`${exit.id}: every rung lands and the list matches the branch`, () => {
      withFrozenClock(() => {
        const choices = { bi: exit.id };
        const list = forkStageList(DME_BI_FORK, { choices });
        // Rungs before the fork, then this branch's rungs.
        expect(list.map((s) => s.label)).toEqual([
          ...DME_BI_FORK.stagesBefore!.map((s) => s.label),
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
    const labels = DME_BI_FORK.exits.map((e) => forkStageList(DME_BI_FORK, { choices: { bi: e.id } }).map((s) => s.label).join("|"));
    expect(new Set(labels).size).toBe(DME_BI_FORK.exits.length);
  });
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
