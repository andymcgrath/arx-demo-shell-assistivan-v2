import { describe, it, expect } from "vitest";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";
import { menuPaths, routedPaths } from "@/engine/workflow/screens";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { WEB_BI_MS, WEB_PA_MS } from "@/workflows/coassist/modules/web_handoff";

/**
 * CoA_Web_Copay: a client-managed web page starts the case, and there is no CRM. Every step that an agent clicks in
 * the other CoAssist scenarios is a `system` trigger here: ABV (BI) and APA (PA) come back on their own.
 * The patient taps Enroll on the client page and lands on the copay screen while the PA still runs.
 */
function start() {
  const clock = new SimulatedClock();
  const actor = startFlow("CoA_Web_Copay", { clock });
  const data = () => ctx(actor).workflowData;
  const route = () => derivePatientRoute(ctx(actor));
  const accepts = (type: string) => actor.getSnapshot().can({ type } as any);
  return { actor, clock, data, route, accepts };
}

describe("CoA_Web_Copay", () => {
  it("accepts only WEB_SUBMIT before the page submits, and only once", () => {
    withFrozenClock(() => {
      const { actor, data, accepts } = start();
      expect(["WEB_HANDOFF", "RUN_BI", "COMPLETE_BI", "SUBMIT_PA", "SELECT_SELF_PAY", "APPROVE_PA"].filter(accepts)).toEqual([]);
      expect(accepts("WEB_SUBMIT")).toBe(true);
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", smsVerified: true, otpVerified: true, consentStatus: "confirmed" });
      expect(accepts("WEB_SUBMIT")).toBe(false);
    });
  });

  it("returns BI, starts the PA, and decides it on its own with no agent stage opened", () => {
    withFrozenClock(() => {
      const { actor, clock, data } = start();
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(data().biStatus).toBe("running");
      clock.increment(WEB_BI_MS - 1);
      expect(data().biStatus).toBe("running");
      clock.increment(1);
      expect(data()).toMatchObject({ biStatus: "complete", paRequired: true, paStatus: "submitted" });
      clock.increment(WEB_PA_MS - 1);
      expect(data().paStatus).toBe("submitted");
      clock.increment(1);
      expect(data().paStatus).toBe("approved");
    });
  });

  it("rejects the handoff until BI is back, then accepts it once", () => {
    withFrozenClock(() => {
      const { actor, clock, data, accepts } = start();
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(accepts("WEB_HANDOFF")).toBe(false);
      clock.increment(WEB_BI_MS);
      expect(accepts("WEB_HANDOFF")).toBe(true);
      runSteps(actor, [{ type: "WEB_HANDOFF" }]);
      expect(data().webHandoff).toBe(true);
      expect(accepts("WEB_HANDOFF")).toBe(false);
    });
  });

  it("lands the patient on the copay screen, and enrolling does not wait for the PA", () => {
    withFrozenClock(() => {
      const { actor, clock, data, route, accepts } = start();
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      clock.increment(WEB_BI_MS);
      expect(accepts("SELECT_SELF_PAY")).toBe(false); // not before the handoff
      runSteps(actor, [{ type: "WEB_HANDOFF" }]);
      expect(data().paStatus).toBe("submitted");
      expect(route()).toBe("/copay-enroll");
      runSteps(actor, [{ type: "SELECT_SELF_PAY" }]);
      expect(data()).toMatchObject({ copayEnrolled: true, pricingOption: null });
      expect(route()).toBe("/enrollment-complete"); // waits for the PA
      clock.increment(WEB_PA_MS);
      expect(route()).toBe("/pa-approved-sms"); // the patient is verified before pricing
      runSteps(actor, [{ type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }]);
      expect(route()).toBe("/benefit-pricing");
    });
  });

  it("carries the prescriber NPI from the page into the case, for ABV and APA", () => {
    withFrozenClock(() => {
      const { actor, data } = start();
      expect(data().prescriberNpi).toBeNull();
      runSteps(actor, [{ type: "WEB_SUBMIT", prescriberNpi: "0987654321" }]);
      expect(data().prescriberNpi).toBe("0987654321");
    });
  });

  it("keeps the patient on the copay screen when the PA decides before they enroll", () => {
    withFrozenClock(() => {
      const { actor, clock, data, route } = start();
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      // Two steps: the PA timer is scheduled when BI lands, so one jump past both would not fire it.
      clock.increment(WEB_BI_MS);
      clock.increment(WEB_PA_MS);
      expect(data().paStatus).toBe("approved");
      runSteps(actor, [{ type: "WEB_HANDOFF" }]);
      expect(route()).toBe("/copay-enroll");
      runSteps(actor, [{ type: "SELECT_SELF_PAY" }]);
      expect(route()).toBe("/pa-approved-sms");
    });
  });

  it("does not let the copay shortcut apply to the other copay scenario", () => {
    withFrozenClock(() => {
      const actor = startFlow("CoA_Copay");
      runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }]);
      expect(actor.getSnapshot().can({ type: "SELECT_SELF_PAY" } as any)).toBe(false);
      expect(actor.getSnapshot().can({ type: "WEB_SUBMIT" } as any)).toBe(false);
    });
  });
  it("keeps the phone idle until the patient taps Enroll on the page", () => {
    withFrozenClock(() => {
      const { actor, clock, route } = start();
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(route()).toBe("/lock-screen");
      clock.increment(WEB_BI_MS);
      clock.increment(WEB_PA_MS);
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "WEB_HANDOFF" }]);
      expect(route()).toBe("/copay-enroll");
    });
  });

  it("undoes one step at a time, back to the idle phone, and never lands on a screen the scenario skips", () => {
    withFrozenClock(() => {
      const { actor, clock, route, data } = start();
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      clock.increment(WEB_BI_MS);
      runSteps(actor, [{ type: "WEB_HANDOFF" }, { type: "SELECT_SELF_PAY" }]);
      clock.increment(WEB_PA_MS);
      runSteps(actor, [{ type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }]);
      const menu = new Set([...menuPaths(COASSIST_SCREENS, "CoA_Web_Copay"), "/lock-screen"]);
      const seen: string[] = [];
      for (let i = 0; i < 20 && actor.getSnapshot().can({ type: "UNDO" } as any); i++) {
        actor.send({ type: "UNDO" } as any);
        seen.push(route());
      }
      expect(seen.every((p) => menu.has(p))).toBe(true);
      expect(route()).toBe("/lock-screen");
      expect(data().enrollmentStatus).toBe("none");
      expect(data().webHandoff).toBe(false);
    });
  });

  it("does not borrow the SMS, phone, code or consent screens from the other CoAssist scenarios", () => {
    const borrowed = ["/", "/sms-message", "/phone-verification", "/otp-verification", "/confirm-details"];
    expect(menuPaths(COASSIST_SCREENS, "CoA_Web_Copay").filter((p) => borrowed.includes(p))).toEqual([]);
    expect(routedPaths(COASSIST_SCREENS, "CoA_Web_Copay").filter((p) => borrowed.includes(p))).toEqual([]);
    expect(menuPaths(COASSIST_SCREENS, "CoA_Copay")).toEqual(expect.arrayContaining(borrowed));
  });
});
