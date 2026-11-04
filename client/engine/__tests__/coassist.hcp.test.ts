import { describe, it, expect } from "vitest";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { ctx, runSteps, startFlow, withFrozenClock } from "./harness";

/**
 * CoA_HCP_Enroll: an HCP enrolls the patient on the client's web page, the patient is texted, and the patient runs the
 * enrollment recipe (SMS, one-time code, details and consent). The case ends on the enrollment confirmation. No BI, PA, or order.
 */
function start() {
  const actor = startFlow("CoA_HCP_Enroll");
  const data = () => ctx(actor).workflowData;
  const route = () => derivePatientRoute(ctx(actor));
  const accepts = (type: string) => actor.getSnapshot().can({ type } as any);
  return { actor, data, route, accepts };
}

describe("CoA_HCP_Enroll", () => {
  it("accepts only the HCP's submit before the page submits, and only once", () => {
    withFrozenClock(() => {
      const { actor, data, accepts } = start();
      // The patient cannot verify, consent, or reach BI before the HCP submits.
      expect(["VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT", "RUN_BI", "SUBMIT_PA", "WEB_SUBMIT"].filter(accepts)).toEqual([]);
      expect(accepts("HCP_ENROLL_SUBMIT")).toBe(true);
      runSteps(actor, [{ type: "HCP_ENROLL_SUBMIT", prescriberNpi: "1234567893" }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", enrollmentInviteSent: true, prescriberNpi: "1234567893", smsVerified: false });
      expect(accepts("HCP_ENROLL_SUBMIT")).toBe(false);
    });
  });

  it("starts nothing but the patient's text: no BI and no PA", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      runSteps(actor, [{ type: "HCP_ENROLL_SUBMIT" }]);
      expect(data()).toMatchObject({ biStatus: "none", paStatus: "none", pricingOption: null });
    });
  });

  it("walks the patient through the text, the code, and consent, then ends on the confirmation", () => {
    withFrozenClock(() => {
      const { actor, data, route } = start();
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "HCP_ENROLL_SUBMIT" }]);
      expect(route()).toBe("/sms-message");
      runSteps(actor, [{ type: "VERIFY_SMS" }]);
      expect(route()).toBe("/otp-verification");
      runSteps(actor, [{ type: "VERIFY_OTP" }]);
      expect(route()).toBe("/confirm-details");
      runSteps(actor, [{ type: "CONFIRM_CONSENT" }]);
      expect(data().consentStatus).toBe("confirmed");
      expect(route()).toBe("/enrollment-complete");
      // Nothing follows: BI never starts.
      expect(data().biStatus).toBe("none");
    });
  });
});
