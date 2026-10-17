import { describe, it, expect } from "vitest";
import type { FlowType } from "@/engine/types";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock, type Step } from "./harness";

/**
 * iAssist ordering and automation (CLAUDE.md rules 10, 11 and 12).
 *
 * iAssist is an `erx` workflow. BI starts with the referral and the PA starts
 * when BI returns with a result that requires one. The patient's onboarding is
 * an independent timeline.
 */
const APPROVED: FlowType = "iAssist_PA_Approved";
const APPEAL: FlowType = "iAssist_PAP";
const ENROLLED: Step[] = [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];
const PHARMACY = { name: "Test Pharmacy" };

const accepts = (actor: ReturnType<typeof startFlow>, step: Step) => actor.getSnapshot().can(step as any);

function start(flow: FlowType) {
  const clock = new SimulatedClock();
  const actor = startFlow(flow, { clock });
  return { actor, clock, data: () => ctx(actor).workflowData };
}

const everyEvent: Step[] = [
  { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" },
  { type: "RUN_BI" }, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "SUBMIT_PA" }, { type: "APPROVE_PA" }, { type: "DENY_PA" },
  { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" },
  { type: "SELECT_PRICING_OPTION", option: "retail" }, { type: "SELECT_SELF_PAY" }, { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
  { type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" }, { type: "PATIENT_PAYS" }, { type: "VERIFY_PAYMENT" },
  { type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" },
  { type: "INITIATE_APPEAL" }, { type: "APPROVE_APPEAL" }, { type: "PATIENT_SELECTS_INFUSION_DATE" },
];

describe("iAssist ordering rules", () => {
  for (const flow of [APPROVED, APPEAL]) {
    describe(flow, () => {
      it("accepts nothing before the referral except the referral", () => {
        withFrozenClock(() => {
          const actor = startFlow(flow);
          expect(everyEvent.filter((s) => accepts(actor, s)).map((s) => s.type)).toEqual([]);
          expect(accepts(actor, { type: "REFERRAL_RECEIVED" })).toBe(true);
        });
      });

      it("starts BI with the referral, before the patient does anything", () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }]);
          expect(data().biStatus).toBe("running");
          expect(data().smsVerified).toBe(false);
          expect(data().paStatus).toBe("none"); // the PA waits for BI
          expect(accepts(actor, { type: "SUBMIT_PA" })).toBe(false);
          expect(accepts(actor, { type: "RUN_BI" })).toBe(false); // only once
        });
      });

      it("submits the PA when BI returns with a result that requires one", () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
          expect(data().paStatus).toBe("submitted");
        });
      });

      it("does not submit a PA when BI says none is required", () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "no_coverage" }]);
          expect(data().paStatus).toBe("none");
          expect(accepts(actor, { type: "SUBMIT_PA" })).toBe(false);
        });
      });

      it("lets BI and the PA finish before the patient has enrolled", () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }, { type: flow === APPROVED ? "APPROVE_PA" : "DENY_PA" }]);
          expect(data().consentStatus).toBe("pending");
          expect(data().paStatus).toBe(flow === APPROVED ? "approved" : "denied");
        });
      });
    });
  }

  describe(APPROVED, () => {
    it("blocks pricing, payment and fulfillment before their prerequisites", () => {
      withFrozenClock(() => {
        const actor = startFlow(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
        const blocked = ["APPROVE_PA_SMS", "VERIFY_PA_APPROVED_SMS", "SELECT_PRICING_OPTION", "PATIENT_PAYS", "VERIFY_PAYMENT", "PATIENT_SETS_ADDRESS", "FILL_RX", "READY_RX", "SHIP_RX", "DELIVER_RX", "INITIATE_APPEAL"];
        expect(everyEvent.filter((s) => blocked.includes(s.type) && accepts(actor, s)).map((s) => s.type)).toEqual([]);
      });
    });

    it("a PA approved before consent: nothing reaches the patient until they consent, then they go straight to pricing", () => {
      withFrozenClock(() => {
        const actor = startFlow(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "APPROVE_PA" }]);
        expect(accepts(actor, { type: "VERIFY_PA_APPROVED_SMS" })).toBe(false); // still enrolling
        runSteps(actor, ENROLLED);
        expect(accepts(actor, { type: "VERIFY_PA_APPROVED_SMS" })).toBe(false); // no second text
        expect(accepts(actor, { type: "VERIFY_PA_APPROVED_OTP" })).toBe(false); // and no second code
        expect(derivePatientRoute(ctx(actor))).toBe("/benefit-pricing");
      });
    });

    it("a PA approved after consent still sends the SMS and one-time code (the patient is away)", () => {
      withFrozenClock(() => {
        const actor = startFlow(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, ...ENROLLED, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "APPROVE_PA" }]);
        expect(accepts(actor, { type: "VERIFY_PA_APPROVED_SMS" })).toBe(true);
        expect(derivePatientRoute(ctx(actor))).toBe("/pa-approved-sms");
      });
    });

    it("self-pay owes a payment before fulfillment. Retail does not.", () => {
      withFrozenClock(() => {
        const selfPay = startFlow(APPROVED);
        runSteps(selfPay, [{ type: "REFERRAL_RECEIVED" }, ...ENROLLED, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "APPROVE_PA" }, { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }, { type: "SELECT_SELF_PAY" }, { type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" }]);
        expect(accepts(selfPay, { type: "FILL_RX" })).toBe(false);
        runSteps(selfPay, [{ type: "PATIENT_PAYS" }, { type: "VERIFY_PAYMENT" }]);
        expect(accepts(selfPay, { type: "FILL_RX" })).toBe(true);
        expect(accepts(selfPay, { type: "VERIFY_PAYMENT" })).toBe(false); // once

        const retail = startFlow(APPROVED);
        runSteps(retail, [{ type: "REFERRAL_RECEIVED" }, ...ENROLLED, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "APPROVE_PA" }, { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }, { type: "SELECT_PRICING_OPTION", option: "retail" }, { type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" }]);
        expect(accepts(retail, { type: "FILL_RX" })).toBe(true);
        expect(accepts(retail, { type: "PATIENT_PAYS" })).toBe(false);
      });
    });

    it("never approves its own appeal: the approved scenario has no appeal", () => {
      withFrozenClock(() => {
        const actor = startFlow(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "DENY_PA" }]);
        expect(accepts(actor, { type: "INITIATE_APPEAL" })).toBe(false);
      });
    });
  });

  describe(APPEAL, () => {
    it("never approves the PA. The appeal is what unlocks it.", () => {
      withFrozenClock(() => {
        const actor = startFlow(APPEAL);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
        expect(accepts(actor, { type: "APPROVE_PA" })).toBe(false);
        expect(accepts(actor, { type: "FILL_RX" })).toBe(false);
      });
    });

    it("an appeal needs a denied PA, and the steps after it go in order", () => {
      withFrozenClock(() => {
        const actor = startFlow(APPEAL);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
        expect(accepts(actor, { type: "INITIATE_APPEAL" })).toBe(false); // PA not denied yet
        runSteps(actor, [{ type: "DENY_PA" }]);
        expect(accepts(actor, { type: "APPROVE_APPEAL" })).toBe(false); // not filed yet
        expect(accepts(actor, { type: "SELECT_PHARMACY", pharmacy: PHARMACY })).toBe(false);
        runSteps(actor, [{ type: "INITIATE_APPEAL" }]);
        expect(accepts(actor, { type: "INITIATE_APPEAL" })).toBe(false); // once
        expect(accepts(actor, { type: "PATIENT_SELECTS_INFUSION_DATE" })).toBe(false); // not approved yet
        expect(accepts(actor, { type: "FILL_RX" })).toBe(false); // no site of care yet
        runSteps(actor, [{ type: "SELECT_PHARMACY", pharmacy: PHARMACY }]);
        expect(accepts(actor, { type: "FILL_RX" })).toBe(true);
      });
    });

    it("skips onboarding for a patient who opens the portal after the appeal was filed", () => {
      withFrozenClock(() => {
        const actor = startFlow(APPEAL);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "DENY_PA" }, { type: "INITIATE_APPEAL" }]);
        expect(ctx(actor).workflowData.consentStatus).toBe("pending");
        expect(derivePatientRoute(ctx(actor))).toBe("/pa-denied");
      });
    });
  });
});

describe("iAssist automation", () => {
  it("opening BI reveals the result after 3 seconds and the PA starts. Opening the PA decides it per scenario.", () => {
    withFrozenClock(() => {
      for (const [flow, outcome] of [[APPROVED, "approved"], [APPEAL, "denied"]] as const) {
        const { actor, clock, data } = start(flow);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }]);
        clock.increment(2999);
        expect(data().biStatus).toBe("running");
        clock.increment(1);
        expect(data().biStatus).toBe("complete");
        expect(data().paStatus).toBe("submitted");

        runSteps(actor, [{ type: "VIEW_STAGE", stage: "PA" }]);
        clock.increment(3000);
        expect([flow, data().paStatus]).toEqual([flow, outcome]);
      }
    });
  });

  it("leaving a stage cancels its pending reveal, and a reset does too", () => {
    withFrozenClock(() => {
      const left = start(APPROVED);
      runSteps(left.actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }]);
      left.clock.increment(1000);
      runSteps(left.actor, [{ type: "LEAVE_STAGE", stage: "BI" }]);
      left.clock.increment(10000);
      expect(left.data().biStatus).toBe("running");

      const reset = start(APPROVED);
      runSteps(reset.actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }]);
      reset.clock.increment(1000);
      reset.actor.send({ type: "RESET" } as any);
      runSteps(reset.actor, [{ type: "REFERRAL_RECEIVED" }]);
      reset.clock.increment(10000);
      expect(reset.data().biStatus).toBe("running");
    });
  });

  describe("appeal rule from the Rules portal", () => {
    const denied: Step[] = [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "DENY_PA" }];

    it("a denied PA stays denied while the rule is off", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start(APPEAL);
        runSteps(actor, denied);
        clock.increment(10000);
        expect(data().appealStatus).toBe("none");
      });
    });

    it("activating the rule files the appeal for a case already denied, after 2.5 seconds", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start(APPEAL);
        runSteps(actor, [...denied, { type: "SET_APPEAL_RULE", active: true }]);
        clock.increment(2499);
        expect(data().appealStatus).toBe("none");
        clock.increment(1);
        expect(data().appealStatus).toBe("initiated");
      });
    });

    it("with the rule already active, a new denial files the appeal", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start(APPEAL);
        runSteps(actor, [{ type: "SET_APPEAL_RULE", active: true }, ...denied]);
        clock.increment(2500);
        expect(data().appealStatus).toBe("initiated");
      });
    });

    it("turning the rule off before it fires cancels the appeal", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start(APPEAL);
        runSteps(actor, [...denied, { type: "SET_APPEAL_RULE", active: true }]);
        clock.increment(1000);
        runSteps(actor, [{ type: "SET_APPEAL_RULE", active: false }]);
        clock.increment(10000);
        expect(data().appealStatus).toBe("none");
      });
    });

    it("opening the Appeals stage approves the appeal after 2.5 seconds", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start(APPEAL);
        runSteps(actor, [...denied, { type: "INITIATE_APPEAL" }, { type: "VIEW_STAGE", stage: "APPEAL" }]);
        clock.increment(2500);
        expect(data().appealStatus).toBe("approved");
      });
    });

    it("the rule does not exist in the approved scenario", () => {
      withFrozenClock(() => {
        const { actor } = start(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }]);
        expect(accepts(actor, { type: "SET_APPEAL_RULE", active: true })).toBe(false);
      });
    });
  });

  describe("undo", () => {
    it("undoes one step at a time, and a same-step automation rides along with the step that fired it", () => {
      withFrozenClock(() => {
        const { actor, data } = start(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
        expect(data().paStatus).toBe("submitted"); // COMPLETE_BI fired SUBMIT_PA
        actor.send({ type: "UNDO" } as any);
        expect(data().biStatus).toBe("running"); // both undone together
        expect(data().paStatus).toBe("none");
        actor.send({ type: "UNDO" } as any);
        expect(data().enrollmentStatus).toBe("none"); // the referral and the BI it started
        expect(data().biStatus).toBe("none");
        expect(actor.getSnapshot().can({ type: "UNDO" } as any)).toBe(false);
      });
    });

    it("UI signals are not undo steps", () => {
      withFrozenClock(() => {
        const { actor, data } = start(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }, { type: "LEAVE_STAGE", stage: "BI" }]);
        actor.send({ type: "UNDO" } as any);
        expect(data().enrollmentStatus).toBe("none");
      });
    });

    it("a revealed result is its own undo step, and undoing cancels a pending reveal", () => {
      withFrozenClock(() => {
        const { actor, clock, data } = start(APPROVED);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VIEW_STAGE", stage: "BI" }]);
        clock.increment(3000);
        expect(data().biStatus).toBe("complete");
        actor.send({ type: "UNDO" } as any); // takes back the reveal only
        expect(data().biStatus).toBe("running");
        expect(data().enrollmentStatus).toBe("enrolled");

        runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
        clock.increment(1000);
        actor.send({ type: "UNDO" } as any);
        clock.increment(10000);
        expect(data().biStatus).not.toBe("complete");
      });
    });
  });
});
