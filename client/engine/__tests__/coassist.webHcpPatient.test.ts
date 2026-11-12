import { describe, it, expect } from "vitest";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { REVEAL_MS } from "@/workflows/coassist/modules/shared";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * CoA_Web_HCP_Patient: the HCP enrolls the patient on the PrES site (Provider tab) and the submit starts BI. The agent opens the BI stage,
 * no coverage comes back, and the agent sends the application update from the Fulfillment Center. The patient taps the text and works the
 * PES site (Patient tab): income consent, income, program terms, address, date. The golden path is in scenarios.ts.
 */
function start() {
  const clock = new SimulatedClock();
  const actor = startFlow("CoA_Web_HCP_Patient", { clock });
  return { actor, clock, data: () => ctx(actor).workflowData, accepts: (type: string) => actor.getSnapshot().can({ type } as any) };
}
const NPI = "1234567893";

describe("CoA_Web_HCP_Patient", () => {
  it("is a web scenario with the CRM, the HCP-then-patient story and no tabs for Analytics or Rules", () => {
    expect(scenarioFacts("CoA_Web_HCP_Patient")).toMatchObject({ isWebSource: true, hasWebCrm: true, isHcpThenPatient: true, isHcpEnrollment: false });
    expect(scenarioFacts("CoA_Web_PAP").isHcpThenPatient).toBe(false);
  });

  it("starts BI from the HCP's submit, with no text to the patient", () => {
    withFrozenClock(() => {
      const { actor, data, accepts } = start();
      expect(accepts("HCP_REFERRAL_SUBMIT")).toBe(true);
      runSteps(actor, [{ type: "HCP_REFERRAL_SUBMIT", prescriberNpi: NPI }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", enrollmentInviteSent: false, prescriberNpi: NPI, biStatus: "running" });
      expect(accepts("HCP_REFERRAL_SUBMIT")).toBe(false);
    });
  });

  it("BI waits for the agent, finds no coverage, and refers the case with no text and no PA", () => {
    withFrozenClock(() => {
      const { actor, clock, data } = start();
      runSteps(actor, [{ type: "HCP_REFERRAL_SUBMIT" }]);
      clock.increment(REVEAL_MS * 10);
      expect(data().biStatus).toBe("running");
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      expect(data()).toMatchObject({ biStatus: "complete", papTransferStatus: "referred", papTransferSmsSent: false, papSmsSent: false, paStatus: "none" });
    });
  });

  it("sends nothing until the agent sends the application update, and the patient's tap needs it", () => {
    withFrozenClock(() => {
      const { actor, clock, data, accepts } = start();
      runSteps(actor, [{ type: "HCP_REFERRAL_SUBMIT" }]);
      // Before BI is back, neither the agent's send nor the patient's tap is allowed.
      expect(accepts("SEND_PAP_SMS")).toBe(false);
      expect(accepts("VERIFY_PAP_SMS")).toBe(false);
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      // BI is back. The agent sends it. Nothing fires on a timer.
      clock.increment(REVEAL_MS * 10);
      expect(data().papSmsSent).toBe(false);
      expect(accepts("VERIFY_PAP_SMS")).toBe(false);
      expect(accepts("VERIFY_PAP_TRANSFER_SMS")).toBe(false);
      runSteps(actor, [{ type: "SEND_PAP_SMS" }]);
      expect(data().papSmsSent).toBe(true);
      expect(accepts("START_INCOME_QUALIFICATION")).toBe(false);
      runSteps(actor, [{ type: "VERIFY_PAP_SMS" }]);
      expect(accepts("START_INCOME_QUALIFICATION")).toBe(true);
    });
  });

  it("keeps the address and date behind the income, and the dispatch behind the date", () => {
    withFrozenClock(() => {
      const { actor, clock, data, accepts } = start();
      runSteps(actor, [{ type: "HCP_REFERRAL_SUBMIT" }, { type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      runSteps(actor, [{ type: "SEND_PAP_SMS" }, { type: "VERIFY_PAP_SMS" }]);
      expect(accepts("PATIENT_SETS_ADDRESS")).toBe(false);
      runSteps(actor, [{ type: "START_INCOME_QUALIFICATION" }, { type: "VERIFY_INCOME" }]);
      expect(data().incomeStatus).toBe("verified");
      expect(accepts("FILL_RX")).toBe(false);
      runSteps(actor, [{ type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" }]);
      expect(accepts("FILL_RX")).toBe(true);
    });
  });
});
