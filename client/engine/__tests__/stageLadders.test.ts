import { describe, it, expect } from "vitest";
import { coassistStageEvents } from "@/shell/coassistLadders";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
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
const FLOWS = ["CoA_DTP", "CoA_Copay", "CoA_DME"] as const;

describe("stage ladders (jump to stage)", () => {
  for (const flowType of FLOWS) {
    it(flowType, () => {
      withFrozenClock(() => {
        const stages = [2, 3, 4, 5, 6, 7, 8].map((stage) => {
          const actor = startFlow(flowType);
          const records = runSteps(actor, coassistStageEvents(flowType, stage));
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
