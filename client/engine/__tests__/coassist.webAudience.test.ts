import { describe, it, expect } from "vitest";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { biForkFor } from "@/workflows/coassist/forks";
import { forkStageList } from "@/engine/workflow/forks";
import { coassistStageEvents } from "@/shell/coassistLadders";
import { REVEAL_MS } from "@/workflows/coassist/modules/shared";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * CoA_Web_Audience: one scenario, two audiences. The `audience` fork picks who starts the case on the client's web page.
 * Each audience reaches delivery in the golden paths (scenarios.ts). These tests cover what differs between them.
 */
function start(audience: "hcp" | "patient") {
  const clock = new SimulatedClock();
  const actor = startFlow("CoA_Web_Audience", { clock, choices: { audience, bi: "no_coverage_pap" } });
  return { actor, clock, data: () => ctx(actor).workflowData, route: () => derivePatientRoute(ctx(actor)), accepts: (type: string) => actor.getSnapshot().can({ type } as any) };
}

describe("CoA_Web_Audience", () => {
  it("is a web scenario with the CRM and an audience fork", () => {
    expect(scenarioFacts("CoA_Web_Audience")).toMatchObject({ isWebSource: true, hasWebCrm: true, hasAudienceFork: true, isHcpEnrollment: false });
    expect(scenarioFacts("CoA_Web_PAP").hasAudienceFork).toBe(false);
  });

  it("PrES: the HCP's submit texts the patient, who must verify and consent. BI starts at once", () => {
    withFrozenClock(() => {
      const { actor, data, route, accepts } = start("hcp");
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "AUDIENCE_SUBMIT", prescriberNpi: "1234567893" }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", enrollmentInviteSent: true, smsVerified: false, consentStatus: "pending", biStatus: "running", prescriberNpi: "1234567893" });
      expect(route()).toBe("/sms-message");
      expect(accepts("AUDIENCE_SUBMIT")).toBe(false);
      runSteps(actor, [{ type: "VERIFY_SMS" }]);
      expect(route()).toBe("/otp-verification");
      runSteps(actor, [{ type: "VERIFY_OTP" }]);
      expect(route()).toBe("/confirm-details");
      runSteps(actor, [{ type: "CONFIRM_CONSENT" }]);
      expect(data().consentStatus).toBe("confirmed");
    });
  });

  it("PES: the patient's submit holds their consent, so no text, code or consent screen shows", () => {
    withFrozenClock(() => {
      const { actor, data, route, accepts } = start("patient");
      runSteps(actor, [{ type: "AUDIENCE_SUBMIT", prescriberNpi: "1234567893" }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", smsVerified: true, otpVerified: true, consentStatus: "confirmed", biStatus: "running" });
      // Home while BI runs, as in the other free drug program scenarios. No SMS, code or consent screen.
      expect(route()).toBe("/");
      expect(accepts("VERIFY_SMS")).toBe(false);
      expect(accepts("CONFIRM_CONSENT")).toBe(false);
    });
  });

  for (const audience of ["hcp", "patient"] as const) {
    it(`${audience}: BI waits for the agent in the CRM, finds no coverage and refers the case with no PA`, () => {
      withFrozenClock(() => {
        const { actor, clock, data, route, accepts } = start(audience);
        runSteps(actor, [{ type: "AUDIENCE_SUBMIT" }, ...(audience === "hcp" ? [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }] : [])]);
        expect(accepts("VIEW_GATEWAY")).toBe(false);
        clock.increment(REVEAL_MS * 10);
        expect(data().biStatus).toBe("running");
        runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
        clock.increment(REVEAL_MS);
        expect(data()).toMatchObject({ biStatus: "complete", papTransferStatus: "referred", paStatus: "none" });
        expect(route()).toBe("/pap-transfer-sms");
      });
    });
  }

  for (const audience of ["hcp", "patient"] as const) {
    it(`${audience}: the stage-jump list follows the audience and every rung lands`, () => {
      withFrozenClock(() => {
        const choices = { audience, bi: "no_coverage_pap" };
        const list = forkStageList(biForkFor("CoA_Web_Audience", choices), { choices });
        expect(list.map((s) => s.label)).toContain(audience === "hcp" ? "Patient Verified and Consented" : "Patient Entered the Prescription (consented on the page)");
        for (const { stage } of list) {
          const actor = startFlow("CoA_Web_Audience", { choices });
          const records = runSteps(actor, coassistStageEvents("CoA_Web_Audience", stage, choices));
          expect(records.filter((r) => !r.accepted).map((r) => r.event)).toEqual([]);
          if (stage === list.length) expect(ctx(actor).workflowData.pharmacyStatus).toBe("delivered");
          actor.stop();
        }
      });
    });
  }
});
