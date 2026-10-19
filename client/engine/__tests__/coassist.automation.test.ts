import { describe, it, expect } from "vitest";
import type { FlowType } from "@/engine/types";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * Automation in the CoAssist workflow (CLAUDE.md rules 10 and 11).
 *
 * System triggers fire on their own: BI starts at REFERRAL_RECEIVED, and the PA starts when
 * BI completes with a result that requires one. Agent triggers wait for the CRM
 * to report that the agent opened a stage (VIEW_STAGE). The machine then owns the
 * delay and the outcome. Leaving the stage, or a reset, cancels the pending step.
 */
const PA_FLOWS: FlowType[] = ["CoA_DTP", "CoA_Copay"];
const COVERAGE_PHARMACY_ONLY = { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" };

function start(flow: FlowType) {
  const clock = new SimulatedClock();
  const actor = startFlow(flow, { clock });
  return { actor, clock, data: () => ctx(actor).workflowData };
}

describe("CoAssist automation", () => {
  describe("system triggers", () => {
    for (const flow of PA_FLOWS) {
      it(`${flow}: REFERRAL_RECEIVED starts BI, and a BI that requires a PA submits it`, () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }]);
          expect(data().biStatus).toBe("running");
          expect(data().paStatus).toBe("none");
          runSteps(actor, [{ type: "COMPLETE_BI", result: "coverage_found" }]);
          expect(data().biStatus).toBe("complete");
          expect(data().paStatus).toBe("submitted");
        });
      });

      it(`${flow}: a BI that says no PA is required does not submit one`, () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" }]);
          expect(data().biStatus).toBe("complete");
          expect(data().biResult).toBe("no_coverage");
          expect(data().paStatus).toBe("none");
          expect(actor.getSnapshot().can({ type: "SUBMIT_PA" })).toBe(false);
        });
      });
    }

    it("CoA_Coverage: only pharmacy-covered BI submits a PA", () => {
      withFrozenClock(() => {
        const covered = start("CoA_Coverage");
        runSteps(covered.actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", ...COVERAGE_PHARMACY_ONLY }]);
        expect(covered.data().paStatus).toBe("submitted");

        const noCoverage = start("CoA_Coverage");
        runSteps(noCoverage.actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" }]);
        expect(noCoverage.data().paStatus).toBe("none");
      });
    });
  });

  describe("agent triggers", () => {
    for (const flow of PA_FLOWS) {
      it(`${flow}: opening BI reveals the result after 3 seconds, then the PA starts and opening PA approves it`, () => {
        withFrozenClock(() => {
          const { actor, clock, data } = start(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }]);
          clock.increment(2999);
          expect(data().biStatus).toBe("running");
          clock.increment(1);
          expect(data().biStatus).toBe("complete");
          expect(data().paStatus).toBe("submitted");

          runSteps(actor, [{ type: "VIEW_STAGE", stage: "PA" }]);
          clock.increment(2999);
          expect(data().paStatus).toBe("submitted");
          clock.increment(1);
          expect(data().paStatus).toBe("approved");
        });
      });
    }

    it("CoA_Coverage: the BI outcome comes from the stage view", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start("CoA_Coverage");
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI", pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered" }]);
        clock.increment(3000);
        expect(data().biResult).toBe("medical_covered");
        expect(data().paStatus).toBe("none"); // medical covered: no PA

        runSteps(actor, [{ type: "VIEW_STAGE", stage: "PROVIDER_TRANSFER" }]);
        clock.increment(3000);
        expect(data().providerTransferStatus).toBe("notified");
      });
    });

    it("leaving the stage cancels the pending reveal", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start("CoA_DTP");
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }]);
        clock.increment(1000);
        runSteps(actor, [{ type: "LEAVE_STAGE", stage: "BI" }]);
        clock.increment(10000);
        expect(data().biStatus).toBe("running");
      });
    });

    it("a reset cancels a pending reveal", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start("CoA_DTP");
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }]);
        clock.increment(1000);
        actor.send({ type: "RESET" } as any);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }]);
        clock.increment(10000);
        expect(data().biStatus).toBe("running"); // the stale reveal did not land
      });
    });

    it("a reveal that arrives after someone completed BI by hand does nothing", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start("CoA_DTP");
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
        const logged = ctx(actor).events.length;
        clock.increment(10000);
        expect(data().biStatus).toBe("complete");
        expect(ctx(actor).events.length).toBe(logged); // no second BI entry
      });
    });

    it("viewing a stage that has nothing to reveal does nothing", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start("CoA_DTP");
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "PA" }]); // PA not submitted yet
        clock.increment(10000);
        expect(data().paStatus).toBe("none");
        expect(data().biStatus).toBe("running");
      });
    });
  });
});
