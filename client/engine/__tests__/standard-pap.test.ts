import { describe, it, expect } from "vitest";
import type { FlowType } from "@/engine/types";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock, type Step } from "./harness";

/**
 * Standard (fax) and PAP (Fax PAP, PrES) ordering and automation (CLAUDE.md rules 10 to 12).
 *
 * Fax and e-sign intake differ from erx in two ways. BI starts when the patient consents, not when
 * the referral lands. And nothing starts the PA: an email asks the provider and their submission does.
 */
const STANDARD: FlowType = "Fax_QS_PA_Approved";
const FAX_PAP: FlowType = "Fax_PAP_Audit";
const PRES: FlowType = "PrES_PAP";
const ALL: FlowType[] = [STANDARD, FAX_PAP, PRES];
const ONBOARDING: Step[] = [{ type: "REFERRAL_RECEIVED" }, { type: "INVITE" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }];
const PHARMACY = { name: "Test Pharmacy" };

const accepts = (actor: ReturnType<typeof startFlow>, step: Step) => actor.getSnapshot().can(step as any);

function start(flow: FlowType) {
  const clock = new SimulatedClock();
  const actor = startFlow(flow, { clock });
  return { actor, clock, data: () => ctx(actor).workflowData };
}

describe("fax and e-sign intake", () => {
  for (const flow of ALL) {
    describe(flow, () => {
      it("accepts only the referral first, then the invite, then the patient's steps in order", () => {
        withFrozenClock(() => {
          const actor = startFlow(flow);
          for (const type of ["INVITE", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "RUN_BI", "COMPLETE_BI"]) {
            expect([type, accepts(actor, { type })]).toEqual([type, false]);
          }
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }]);
          expect(accepts(actor, { type: "VERIFY_SMS" })).toBe(false); // the patient cannot verify before the invite
          runSteps(actor, [{ type: "INVITE" }]);
          expect(accepts(actor, { type: "INVITE" })).toBe(false); // once
          expect(accepts(actor, { type: "VERIFY_OTP" })).toBe(false); // SMS first
          expect(accepts(actor, { type: "CONFIRM_CONSENT" })).toBe(false); // code first
          runSteps(actor, [{ type: "VERIFY_SMS" }]);
          expect(accepts(actor, { type: "CONFIRM_CONSENT" })).toBe(false);
        });
      });

      it("starts BI when the patient consents, not before", () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, ONBOARDING);
          expect(data().biStatus).toBe("none"); // the referral and onboarding alone do not start BI
          runSteps(actor, [{ type: "CONFIRM_CONSENT" }]);
          expect(data().biStatus).toBe("running");
          expect(accepts(actor, { type: "RUN_BI" })).toBe(false); // once
        });
      });

      it("opening the BI stage reveals the result after 3 seconds. Leaving cancels it.", () => {
        withFrozenClock(() => {
          const shown = start(flow);
          runSteps(shown.actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }, { type: "VIEW_STAGE", stage: "BI" }]);
          shown.clock.increment(2999);
          expect(shown.data().biStatus).toBe("running");
          shown.clock.increment(1);
          expect(shown.data().biStatus).toBe("complete");
          expect(shown.data().biResult).toBe(flow === STANDARD ? "coverage_found" : "no_insurance");

          const left = start(flow);
          runSteps(left.actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }, { type: "VIEW_STAGE", stage: "BI" }]);
          left.clock.increment(1000);
          runSteps(left.actor, [{ type: "LEAVE_STAGE", stage: "BI" }]);
          left.clock.increment(10000);
          expect(left.data().biStatus).toBe("running");
        });
      });

      it("undoes one step at a time, with BI starting along with the consent that triggered it", () => {
        withFrozenClock(() => {
          const { actor, data } = start(flow);
          runSteps(actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }]);
          actor.send({ type: "UNDO" } as any);
          expect(data().consentStatus).toBe("pending");
          expect(data().biStatus).toBe("none");
        });
      });
    });
  }
});

describe("Standard: a manual PA", () => {
  it("does not start the PA when BI completes. The provider's submission does.", () => {
    withFrozenClock(() => {
      const { actor, data } = start(STANDARD);
      runSteps(actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
      expect(data().paStatus).toBe("none"); // nothing fired it
      expect(accepts(actor, { type: "SUBMIT_PA" })).toBe(true);
      runSteps(actor, [{ type: "SUBMIT_PA" }]);
      expect(data().paStatus).toBe("submitted");
    });
  });

  it("needs a BI result that requires a PA", () => {
    withFrozenClock(() => {
      const { actor } = start(STANDARD);
      runSteps(actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI", result: "no_coverage" }]);
      expect(accepts(actor, { type: "SUBMIT_PA" })).toBe(false);
    });
  });

  it("opening the PA stage approves it after 3 seconds, and the pharmacy and fulfillment steps go in order", () => {
    withFrozenClock(() => {
      const { actor, clock, data } = start(STANDARD);
      runSteps(actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI", result: "coverage_found" }, { type: "SUBMIT_PA" }]);
      expect(accepts(actor, { type: "SELECT_PHARMACY", pharmacy: PHARMACY })).toBe(false); // not approved
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "PA" }]);
      clock.increment(3000);
      expect(data().paStatus).toBe("approved");
      expect(derivePatientRoute(ctx(actor))).toBe("/pa-approved");
      expect(accepts(actor, { type: "FILL_RX" })).toBe(false); // no pharmacy yet
      runSteps(actor, [{ type: "SELECT_PHARMACY", pharmacy: PHARMACY }]);
      expect(accepts(actor, { type: "FILL_RX" })).toBe(true);
      runSteps(actor, [{ type: "FILL_RX" }]);
      expect(accepts(actor, { type: "SHIP_RX" })).toBe(false); // ready first
    });
  });
});

describe("PAP: no PA, an application update and income instead", () => {
  for (const flow of [FAX_PAP, PRES]) {
    it(`${flow}: never submits a PA. Income steps go in order.`, () => {
      withFrozenClock(() => {
        const { actor, data } = start(flow);
        runSteps(actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }]);
        expect(accepts(actor, { type: "SEND_PAP_SMS" })).toBe(false); // BI not back yet
        runSteps(actor, [{ type: "COMPLETE_BI", result: "no_insurance" }]);
        expect(data().paStatus).toBe("none");
        expect(accepts(actor, { type: "SUBMIT_PA" })).toBe(false);
        expect(accepts(actor, { type: "VERIFY_PAP_SMS" })).toBe(false); // nothing sent yet
        expect(accepts(actor, { type: "VERIFY_INCOME" })).toBe(false);
        runSteps(actor, [{ type: "SEND_PAP_SMS" }]);
        expect(accepts(actor, { type: "SEND_PAP_SMS" })).toBe(false); // once
        expect(accepts(actor, { type: "VERIFY_INCOME" })).toBe(false); // the patient has not tapped the text
        runSteps(actor, [{ type: "VERIFY_PAP_SMS" }]);
        expect(accepts(actor, { type: "PATIENT_SETS_ADDRESS" })).toBe(false); // income first
        runSteps(actor, [{ type: "VERIFY_INCOME" }]);
        expect(data().papStatus).toBe("active");
        expect(data().dispatchStatus).toBe("pending_selection");
        expect(accepts(actor, { type: "VERIFY_INCOME" })).toBe(false); // once
        expect(accepts(actor, { type: "FILL_RX" })).toBe(false); // no pharmacy yet
        runSteps(actor, [{ type: "SELECT_PHARMACY", pharmacy: PHARMACY }]);
        expect(accepts(actor, { type: "FILL_RX" })).toBe(true);
      });
    });
  }

  it("PrES is a legacy scenario on the shared PAP workflow", async () => {
    const { PAP_PRES, PAP_AUDIT } = await import("@/workflows/pap/scenarios");
    expect(PAP_PRES.legacy).toBe(true);
    expect(PAP_PRES.intake).toBe("esign");
    expect(PAP_AUDIT.legacy === undefined).toBe(true);
    expect(PAP_AUDIT.intake).toBe("fax");
  });
});

describe("intake channel", () => {
  it("erx scenarios start the PA on their own. fax and esign scenarios never do.", async () => {
    const { COA_DTP } = await import("@/workflows/coassist/scenarios");
    const { IA_PA_APPROVED } = await import("@/workflows/iassist/scenarios");
    const { STANDARD_PA_APPROVED } = await import("@/workflows/standard/scenarios");
    const { PAP_AUDIT, PAP_PRES } = await import("@/workflows/pap/scenarios");
    expect([COA_DTP.intake, IA_PA_APPROVED.intake]).toEqual(["erx", "erx"]);
    expect([STANDARD_PA_APPROVED.intake, PAP_AUDIT.intake, PAP_PRES.intake]).toEqual(["fax", "fax", "esign"]);

    withFrozenClock(() => {
      for (const flow of ["CoA_DTP", "iAssist_PA_Approved"] as FlowType[]) {
        const { actor, data } = start(flow);
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
        expect([flow, data().paStatus]).toEqual([flow, "submitted"]);
      }
      const { actor, data } = start(STANDARD);
      runSteps(actor, [...ONBOARDING, { type: "CONFIRM_CONSENT" }, { type: "COMPLETE_BI", result: "coverage_found" }]);
      expect(data().paStatus).toBe("none");
    });
  });
});
