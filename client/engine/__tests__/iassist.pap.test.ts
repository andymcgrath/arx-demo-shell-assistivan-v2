import { describe, it, expect } from "vitest";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock, type Step } from "./harness";

/**
 * Buy and Bill, free drug (PAP) ordering (CLAUDE.md rules 11 and 12). eMedBV finds no coverage, so BI returns no
 * coverage and no PA starts. The application update, the credit check and income, then approval, in that order.
 * Approval unlocks the site of care: triage, the appointment date, and fulfillment.
 */
const FLOW = "iAssist_Buy_And_Bill_PAP" as const;
const accepts = (actor: ReturnType<typeof startFlow>, step: Step) => actor.getSnapshot().can(step as any);
const start = () => {
  const clock = new SimulatedClock();
  const actor = startFlow(FLOW, { clock });
  return { actor, clock, data: () => ctx(actor).workflowData };
};
const IDENTITY: Step[] = [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];
const INCOME: Step = { type: "VERIFY_INCOME", householdSize: "2", householdIncome: "62000" };
const TO_BI: Step[] = [{ type: "RUN_MEDBV" }, { type: "REFERRAL_RECEIVED" }, ...IDENTITY];

describe("Buy and Bill free drug ordering", () => {
  it("needs no copay: the referral follows eMedBV, and copay events do nothing", () => {
    withFrozenClock(() => {
      const { actor } = start();
      runSteps(actor, [{ type: "RUN_MEDBV" }]);
      expect(accepts(actor, { type: "ENROLL_COPAY" })).toBe(false);
      expect(accepts(actor, { type: "REFERRAL_RECEIVED" })).toBe(true);
    });
  });

  it("returns no coverage and starts no PA", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [...TO_BI, { type: "COMPLETE_BI" }]);
      expect(data().biResult).toBe("no_coverage");
      expect(data().paRequired).toBe(false);
      expect(data().paStatus).toBe("none");
      expect(accepts(actor, { type: "APPROVE_PA" })).toBe(false);
    });
  });

  it("sends the application update on its own once BI returns no coverage", () => {
    withFrozenClock(() => {
      const { actor, clock, data } = start();
      runSteps(actor, [...TO_BI, { type: "COMPLETE_BI" }]);
      expect(data().papSmsSent).toBe(false);
      clock.increment(2000);
      expect(data().papSmsSent).toBe(true);
    });
  });

  it("holds each patient step until the one before it", () => {
    withFrozenClock(() => {
      const { actor } = start();
      runSteps(actor, TO_BI);
      expect(accepts(actor, { type: "SEND_PAP_SMS" })).toBe(false);
      runSteps(actor, [{ type: "COMPLETE_BI" }]);
      expect([{ type: "VERIFY_PAP_SMS" }, { type: "VERIFY_PAP_OTP" }, INCOME].filter((s) => accepts(actor, s as Step)).length).toBe(0);
      runSteps(actor, [{ type: "SEND_PAP_SMS" }]);
      expect(accepts(actor, { type: "VERIFY_PAP_OTP" })).toBe(false);
      runSteps(actor, [{ type: "VERIFY_PAP_SMS" }]);
      expect(accepts(actor, INCOME)).toBe(false);
      runSteps(actor, [{ type: "VERIFY_PAP_OTP" }]);
      expect(accepts(actor, INCOME)).toBe(true);
    });
  });

  it("receives the application with the credit check and the household answers, and waits for the agent", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [...TO_BI, { type: "COMPLETE_BI" }, { type: "SEND_PAP_SMS" }, { type: "VERIFY_PAP_SMS" }, { type: "VERIFY_PAP_OTP" }, INCOME]);
      expect(data().incomeStatus).toBe("verified");
      expect(data().papStatus).toBe("none");
      expect(data().creditCheckConsented).toBe(true);
      expect([data().householdSize, data().householdIncome]).toEqual(["2", "62000"]);
      expect(accepts(actor, INCOME)).toBe(false);
    });
  });

  it("approves only when the CRM agent says so, and only a received application", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [...TO_BI, { type: "COMPLETE_BI" }, { type: "SEND_PAP_SMS" }, { type: "VERIFY_PAP_SMS" }, { type: "VERIFY_PAP_OTP" }]);
      expect(accepts(actor, { type: "APPROVE_PAP" })).toBe(false);
      runSteps(actor, [INCOME]);
      expect(data().papStatus).toBe("none");
      expect(data().dispatchStatus).toBe("none");
      runSteps(actor, [{ type: "APPROVE_PAP" }]);
      expect(data().papStatus).toBe("active");
      expect(data().dispatchStatus).toBe("pending_selection");
      expect(accepts(actor, { type: "APPROVE_PAP" })).toBe(false);
    });
  });

  it("unlocks the site of care only after approval: the appointment date, then triage, then fulfillment", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      const pharmacy = { name: "Orlando Site of Care", address: "1414 Kuhl Ave", city: "Orlando", state: "FL", zip: "32806", phone: "(407) 555-3006" };
      const DATE = { type: "PATIENT_SELECTS_INFUSION_DATE", date: "2026-02-10T15:00:00.000Z" } as Step;
      runSteps(actor, [...TO_BI, { type: "COMPLETE_BI" }, { type: "SEND_PAP_SMS" }, { type: "VERIFY_PAP_SMS" }, { type: "VERIFY_PAP_OTP" }]);
      expect(accepts(actor, { type: "SELECT_PHARMACY", pharmacy } as Step)).toBe(false);
      expect(accepts(actor, DATE)).toBe(false);
      runSteps(actor, [INCOME]);
      expect(accepts(actor, { type: "SELECT_PHARMACY", pharmacy } as Step)).toBe(false);
      expect(accepts(actor, DATE)).toBe(false);
      runSteps(actor, [{ type: "APPROVE_PAP" }]);
      // The patient verifies the approval text and code before the date.
      expect(accepts(actor, DATE)).toBe(false);
      expect(accepts(actor, { type: "VERIFY_PA_APPROVED_OTP" })).toBe(false);
      runSteps(actor, [{ type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }]);
      // The agent triages after the patient confirms the date.
      expect(accepts(actor, { type: "SELECT_PHARMACY", pharmacy } as Step)).toBe(false);
      expect(accepts(actor, { type: "FILL_RX" })).toBe(false);
      runSteps(actor, [DATE]);
      expect(accepts(actor, { type: "SELECT_PHARMACY", pharmacy } as Step)).toBe(true);
      runSteps(actor, [{ type: "SELECT_PHARMACY", pharmacy } as Step, { type: "FILL_RX" }]);
      expect(data().pharmacyStatus).toBe("processing");
    });
  });

  it("ignores the PAP events in the Buy and Bill scenario with coverage", () => {
    withFrozenClock(() => {
      const actor = startFlow("iAssist_Buy_And_Bill");
      for (const step of [{ type: "SEND_PAP_SMS" }, { type: "VERIFY_PAP_SMS" }, { type: "VERIFY_PAP_OTP" }, INCOME, { type: "APPROVE_PAP" }, { type: "VERIFY_PA_APPROVED_SMS" }]) expect(accepts(actor, step as Step)).toBe(false);
    });
  });
});
