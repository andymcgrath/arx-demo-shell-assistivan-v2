import { describe, it, expect } from "vitest";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { webIsDesktopSite } from "@/portals/web/hcp/desktop";
import { REVEAL_MS } from "@/workflows/coassist/modules/shared";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * CoA_Web_HCP_Patient: the HCP enrolls the patient on the client's web page (PrES), the patient verifies and consents, then completes
 * the authorization and the Rx on the same page (PES). BI starts from the patient's submit. The golden path is in scenarios.ts.
 */
function start() {
  const clock = new SimulatedClock();
  const actor = startFlow("CoA_Web_HCP_Patient", { clock });
  return { actor, clock, data: () => ctx(actor).workflowData, route: () => derivePatientRoute(ctx(actor)), accepts: (type: string) => actor.getSnapshot().can({ type } as any) };
}
const consent = [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];

describe("CoA_Web_HCP_Patient", () => {
  it("is a web scenario with the CRM, the HCP-then-patient story and no tabs for Analytics or Rules", () => {
    expect(scenarioFacts("CoA_Web_HCP_Patient")).toMatchObject({ isWebSource: true, hasWebCrm: true, isHcpThenPatient: true, isHcpEnrollment: false });
    expect(scenarioFacts("CoA_Web_PAP").isHcpThenPatient).toBe(false);
  });

  it("orders the two submits: the patient's needs their consent, the HCP's needs a new case", () => {
    withFrozenClock(() => {
      const { actor, data, route, accepts } = start();
      expect(accepts("PATIENT_RX_SUBMIT")).toBe(false);
      runSteps(actor, [{ type: "HCP_REFERRAL_SUBMIT" }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", enrollmentInviteSent: true, consentStatus: "pending", biStatus: "none" });
      expect(route()).toBe("/sms-message");
      expect(accepts("HCP_REFERRAL_SUBMIT")).toBe(false);
      expect(accepts("PATIENT_RX_SUBMIT")).toBe(false);
      runSteps(actor, consent);
      expect(accepts("PATIENT_RX_SUBMIT")).toBe(true);
    });
  });

  it("starts BI from the patient's submit, and the page is a desktop site until the patient consents", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      expect(webIsDesktopSite("CoA_Web_HCP_Patient", data())).toBe(true);
      runSteps(actor, [{ type: "HCP_REFERRAL_SUBMIT" }]);
      expect(webIsDesktopSite("CoA_Web_HCP_Patient", data())).toBe(true);
      runSteps(actor, consent);
      expect(webIsDesktopSite("CoA_Web_HCP_Patient", data())).toBe(false);
      runSteps(actor, [{ type: "PATIENT_RX_SUBMIT", prescriberNpi: "1234567893" }]);
      expect(data()).toMatchObject({ biStatus: "running", prescriberNpi: "1234567893" });
    });
  });

  it("BI waits for the agent in the CRM, finds no coverage and refers the case with no PA", () => {
    withFrozenClock(() => {
      const { actor, clock, data, route, accepts } = start();
      runSteps(actor, [{ type: "HCP_REFERRAL_SUBMIT" }, ...consent, { type: "PATIENT_RX_SUBMIT" }]);
      expect(accepts("VIEW_GATEWAY")).toBe(false);
      clock.increment(REVEAL_MS * 10);
      expect(data().biStatus).toBe("running");
      runSteps(actor, [{ type: "VIEW_STAGE", stage: "BI" }]);
      clock.increment(REVEAL_MS);
      expect(data()).toMatchObject({ biStatus: "complete", papTransferStatus: "referred", paStatus: "none" });
      expect(route()).toBe("/pap-transfer-sms");
    });
  });
});
