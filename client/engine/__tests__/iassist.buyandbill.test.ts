import { describe, it, expect } from "vitest";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock, type Step } from "./harness";

/**
 * Buy and Bill ordering (CLAUDE.md rules 11 and 12). The HCP runs eMedBV and enrolls the patient in copay, then
 * submits. The CRM runs BI, then the PA, on its own. A copay claim needs an enrolled patient and an approved PA.
 */
const FLOW = "iAssist_Buy_And_Bill" as const;
const accepts = (actor: ReturnType<typeof startFlow>, step: Step) => actor.getSnapshot().can(step as any);
const start = () => {
  const clock = new SimulatedClock();
  const actor = startFlow(FLOW, { clock });
  return { actor, clock, data: () => ctx(actor).workflowData };
};
const PREPARED: Step[] = [{ type: "RUN_MEDBV" }, { type: "ENROLL_COPAY" }];
const CLAIM: Step = { type: "SUBMIT_COPAY_CLAIM", dateOfService: "2026-01-20" };

describe("Buy and Bill ordering", () => {
  it("accepts only eMedBV at the start", () => {
    withFrozenClock(() => {
      const { actor } = start();
      const others: Step[] = [{ type: "ENROLL_COPAY" }, { type: "REFERRAL_RECEIVED" }, CLAIM, { type: "COMPLETE_BI" }, { type: "APPROVE_PA" }];
      expect(others.filter((s) => accepts(actor, s)).map((s) => s.type)).toEqual([]);
      expect(accepts(actor, { type: "RUN_MEDBV" })).toBe(true);
    });
  });

  it("runs eMedBV once", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [{ type: "RUN_MEDBV" }]);
      expect(data().medbvStatus).toBe("complete");
      expect(accepts(actor, { type: "RUN_MEDBV" })).toBe(false);
    });
  });

  it("enrolls in copay once, and only after eMedBV", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [{ type: "RUN_MEDBV" }]);
      expect(data().copayEnrolled).toBe(false);
      runSteps(actor, [{ type: "ENROLL_COPAY" }]);
      expect(data().copayEnrolled).toBe(true);
      expect(accepts(actor, { type: "ENROLL_COPAY" })).toBe(false);
    });
  });

  it("holds the referral until eMedBV is done and copay is enrolled", () => {
    withFrozenClock(() => {
      const { actor } = start();
      runSteps(actor, [{ type: "RUN_MEDBV" }]);
      expect(accepts(actor, { type: "REFERRAL_RECEIVED" })).toBe(false);
      runSteps(actor, [{ type: "ENROLL_COPAY" }]);
      expect(accepts(actor, { type: "REFERRAL_RECEIVED" })).toBe(true);
    });
  });

  it("starts BI with the referral, then the PA when BI says one is required, with no pharmacy assigned", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [...PREPARED, { type: "REFERRAL_RECEIVED" }]);
      expect(data().biStatus).toBe("running");
      runSteps(actor, [{ type: "COMPLETE_BI" }]);
      expect(data().paRequired).toBe(true);
      expect(data().paStatus).toBe("submitted");
      expect(data().medicalBenefitStatus).toBe("covered");
      expect(data().pharmacyAssigned).toBe(false);
    });
  });

  it("reveals BI, then the PA decision, when the agent opens each CRM stage", () => {
    withFrozenClock(() => {
      const { actor, clock, data } = start();
      runSteps(actor, [...PREPARED, { type: "REFERRAL_RECEIVED" }]);
      actor.send({ type: "VIEW_STAGE", stage: "BI" } as any);
      clock.increment(3000);
      expect(data().biStatus).toBe("complete");
      expect(data().paStatus).toBe("submitted");
      actor.send({ type: "VIEW_STAGE", stage: "PA" } as any);
      clock.increment(3000);
      expect(data().paStatus).toBe("approved");
    });
  });

  it("accepts a copay claim only after the PA is approved, and files it in review", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [...PREPARED, { type: "REFERRAL_RECEIVED" }, { type: "COMPLETE_BI" }]);
      expect(accepts(actor, CLAIM)).toBe(false);
      runSteps(actor, [{ type: "APPROVE_PA" }, CLAIM, { ...CLAIM, dateOfService: "2026-02-20" }]);
      const claims = data().copayClaims ?? [];
      expect(claims.map((c) => [c.id, c.status, c.dateOfService])).toEqual([
        ["CLM-1001", "in_review", "2026-01-20"],
        ["CLM-1002", "in_review", "2026-02-20"],
      ]);
    });
  });

  it("ignores the Buy and Bill events in the other iAssist scenarios", () => {
    withFrozenClock(() => {
      for (const flow of ["iAssist_PA_Approved", "iAssist_PAP", "iAssist_Medical_Transfer"] as const) {
        const actor = startFlow(flow);
        for (const step of [{ type: "RUN_MEDBV" }, { type: "ENROLL_COPAY" }, CLAIM]) expect(accepts(actor, step)).toBe(false);
        expect(accepts(actor, { type: "REFERRAL_RECEIVED" })).toBe(true);
      }
    });
  });

  describe("consent fork", () => {
    const IDENTITY: Step[] = [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];
    const INCOME: Step = { type: "CONFIRM_INCOME", householdSize: "2", householdIncome: "62000" };
    const startWith = (consent?: string) => {
      const clock = new SimulatedClock();
      const actor = startFlow(FLOW, { clock, ...(consent ? { choices: { consent } } : {}) });
      return { actor, data: () => ctx(actor).workflowData };
    };

    it("defaults to the patient consenting by text", () => {
      withFrozenClock(() => {
        const { data } = startWith();
        expect(data().choices.consent).toBe("patient_text");
      });
    });

    it("patient_text: a commercially covered patient confirms no income. The recipe leaves `income: \"confirm\"` out", () => {
      withFrozenClock(() => {
        const { actor, data } = startWith("patient_text");
        runSteps(actor, [...PREPARED, { type: "REFERRAL_RECEIVED" }]);
        expect(data().consentStatus).toBe("pending");
        runSteps(actor, IDENTITY);
        expect(data().consentStatus).toBe("confirmed");
        expect(data().householdRequested).toBeUndefined();
        expect(accepts(actor, INCOME)).toBe(false);
      });
    });

    it("hcp_signs: the HCP captured consent and income, so the patient confirms neither", () => {
      withFrozenClock(() => {
        const { actor, data } = startWith("hcp_signs");
        runSteps(actor, [...PREPARED, { type: "REFERRAL_RECEIVED" }]);
        expect(data().consentStatus).toBe("confirmed");
        expect(data().incomeStatus).toBe("verified");
        expect(accepts(actor, INCOME)).toBe(false);
        expect(accepts(actor, { type: "CONFIRM_CONSENT" })).toBe(false);
      });
    });
  });
});
