import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { workflowRegistry } from "@/engine/WorkflowRegistry";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { menuPaths, routedPaths } from "@/engine/workflow/screens";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { SimulatedClock, ctx, runSteps, startFlow, withFrozenClock } from "./harness";
import { WEB_BI_MS, WEB_PA_MS } from "@/workflows/coassist/modules/web_handoff";

/**
 * CoA_Web_Copay: a client-managed web page starts the case, and there is no CRM. BI starts at the page's submit and stays
 * in flight until the presenter opens the Gateway tab (VIEW_GATEWAY). BI then returns, the PA starts, and it decides, all
 * on their own. The patient sees a coverage summary, taps Check Pricing (no PA text), and the case runs like Copay.
 */
function start() {
  const clock = new SimulatedClock();
  const actor = startFlow("CoA_Web_Copay", { clock });
  const data = () => ctx(actor).workflowData;
  const route = () => derivePatientRoute(ctx(actor));
  const accepts = (type: string) => actor.getSnapshot().can({ type } as any);
  return { actor, clock, data, route, accepts };
}

/** The page submits and the presenter opens the Gateway. BI and the PA then run to a decision. */
function throughApproval({ actor, clock }: ReturnType<typeof start>) {
  runSteps(actor, [{ type: "WEB_SUBMIT" }, { type: "VIEW_GATEWAY" }]);
  clock.increment(WEB_BI_MS);
  clock.increment(WEB_PA_MS);
}

describe("CoA_Web_Copay", () => {
  it("accepts only WEB_SUBMIT before the page submits, and only once", () => {
    withFrozenClock(() => {
      const { actor, data, accepts } = start();
      expect(["VIEW_GATEWAY", "CHECK_PRICING", "RUN_BI", "COMPLETE_BI", "SUBMIT_PA", "SELECT_SELF_PAY", "APPROVE_PA"].filter(accepts)).toEqual([]);
      expect(accepts("WEB_SUBMIT")).toBe(true);
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(data()).toMatchObject({ enrollmentStatus: "enrolled", smsVerified: true, otpVerified: true, consentStatus: "confirmed" });
      expect(accepts("WEB_SUBMIT")).toBe(false);
    });
  });

  it("holds BI in flight until the Gateway is opened, then returns it and decides the PA on its own", () => {
    withFrozenClock(() => {
      const t = start();
      const { actor, clock, data } = t;
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      clock.increment(WEB_BI_MS * 10);
      expect(data()).toMatchObject({ biStatus: "running", paStatus: "none" }); // nothing moves on its own
      runSteps(actor, [{ type: "VIEW_GATEWAY" }]);
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

  it("ignores the Gateway before the page submits and a second look after", () => {
    withFrozenClock(() => {
      const { actor, accepts } = start();
      expect(accepts("VIEW_GATEWAY")).toBe(false);
      runSteps(actor, [{ type: "WEB_SUBMIT" }, { type: "VIEW_GATEWAY" }]);
      expect(accepts("VIEW_GATEWAY")).toBe(false);
    });
  });

  it("keeps the phone idle until the PA decides, then shows the coverage summary with no PA text", () => {
    withFrozenClock(() => {
      const t = start();
      const { actor, clock, route } = t;
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "WEB_SUBMIT" }]);
      expect(route()).toBe("/lock-screen");
      runSteps(actor, [{ type: "VIEW_GATEWAY" }]);
      clock.increment(WEB_BI_MS);
      expect(route()).toBe("/lock-screen"); // BI is back, the PA is still deciding
      clock.increment(WEB_PA_MS);
      expect(route()).toBe("/coverage-summary");
    });
  });

  it("runs like Copay after Check Pricing: pricing, enroll, pricing again, pharmacy, order", () => {
    withFrozenClock(() => {
      const t = start();
      const { actor, route, data, accepts } = t;
      throughApproval(t);
      expect(accepts("SELECT_SELF_PAY")).toBe(false); // not before the patient checks pricing
      runSteps(actor, [{ type: "CHECK_PRICING" }]);
      expect(data()).toMatchObject({ pricingChecked: true, paApprovedSmsVerified: true, paApprovedOtpVerified: true });
      expect(route()).toBe("/benefit-pricing"); // no PA-approved text or code
      runSteps(actor, [{ type: "SELECT_SELF_PAY" }]);
      expect(data()).toMatchObject({ copayEnrolled: true, pricingOption: null });
      expect(route()).toBe("/benefit-pricing"); // the same screen at the reduced amount
      runSteps(actor, [{ type: "SELECT_PRICING_OPTION", option: "retail" }]);
      expect(data().pricingOption).toBe("retail");
    });
  });

  it("accepts Check Pricing only once, and only after the PA approves", () => {
    withFrozenClock(() => {
      const t = start();
      const { actor, clock, accepts } = t;
      runSteps(actor, [{ type: "WEB_SUBMIT" }, { type: "VIEW_GATEWAY" }]);
      clock.increment(WEB_BI_MS);
      expect(accepts("CHECK_PRICING")).toBe(false); // the PA has not decided
      clock.increment(WEB_PA_MS);
      expect(accepts("CHECK_PRICING")).toBe(true);
      runSteps(actor, [{ type: "CHECK_PRICING" }]);
      expect(accepts("CHECK_PRICING")).toBe(false);
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

  it("does not let the web events apply to the other copay scenario", () => {
    withFrozenClock(() => {
      const actor = startFlow("CoA_Copay");
      runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }]);
      for (const type of ["WEB_SUBMIT", "VIEW_GATEWAY", "CHECK_PRICING"]) expect(actor.getSnapshot().can({ type } as any)).toBe(false);
    });
  });

  it("undoes one step at a time, back to the idle phone, and never lands on a screen the scenario skips", () => {
    withFrozenClock(() => {
      const t = start();
      const { actor, route, data } = t;
      throughApproval(t);
      runSteps(actor, [{ type: "CHECK_PRICING" }, { type: "SELECT_SELF_PAY" }]);
      const menu = new Set([...menuPaths(COASSIST_SCREENS, "CoA_Web_Copay"), "/lock-screen"]);
      const seen: string[] = [];
      for (let i = 0; i < 20 && actor.getSnapshot().can({ type: "UNDO" } as any); i++) {
        actor.send({ type: "UNDO" } as any);
        seen.push(route());
      }
      expect(seen.every((p) => menu.has(p))).toBe(true);
      expect(route()).toBe("/lock-screen");
      expect(data().enrollmentStatus).toBe("none");
    });
  });

  it("does not borrow the SMS, phone, code, consent or PA text screens from the other CoAssist scenarios", () => {
    const borrowed = ["/", "/sms-message", "/phone-verification", "/otp-verification", "/confirm-details"];
    const texted = ["/pa-approved-sms", "/pa-approved-otp"];
    expect(menuPaths(COASSIST_SCREENS, "CoA_Web_Copay").filter((p) => [...borrowed, ...texted].includes(p))).toEqual([]);
    expect(routedPaths(COASSIST_SCREENS, "CoA_Web_Copay").filter((p) => borrowed.includes(p))).toEqual([]);
    expect(menuPaths(COASSIST_SCREENS, "CoA_Copay")).toEqual(expect.arrayContaining([...borrowed, ...texted]));
    expect(menuPaths(COASSIST_SCREENS, "CoA_Web_Copay")).toContain("/coverage-summary");
    expect(menuPaths(COASSIST_SCREENS, "CoA_Copay")).not.toContain("/coverage-summary");
  });

  describe("recovers its timers", () => {
    const restore = (actor: ReturnType<typeof start>["actor"]) => {
      // What sessionStorage holds: JSON. The timers did not survive it.
      const saved = JSON.parse(JSON.stringify(actor.getPersistedSnapshot()));
      const clock = new SimulatedClock();
      const restored = createActor(workflowRegistry.getWorkflow("CoA_Web_Copay")!, { snapshot: saved, clock } as any);
      restored.start();
      restored.send({ type: "REARM_TIMERS" } as any);
      return { restored, clock, data: () => ctx(restored).workflowData };
    };

    it("finishes BI after a reload while it is released and in flight", () => {
      withFrozenClock(() => {
        const { actor } = start();
        runSteps(actor, [{ type: "WEB_SUBMIT" }, { type: "VIEW_GATEWAY" }]);
        const { clock, data } = restore(actor);
        expect(data().biStatus).toBe("running");
        clock.increment(WEB_BI_MS);
        expect(data()).toMatchObject({ biStatus: "complete", paStatus: "submitted" });
        clock.increment(WEB_PA_MS);
        expect(data().paStatus).toBe("approved");
      });
    });

    it("still holds BI after a reload before the Gateway is opened", () => {
      withFrozenClock(() => {
        const { actor } = start();
        runSteps(actor, [{ type: "WEB_SUBMIT" }]);
        const { clock, data } = restore(actor);
        clock.increment(WEB_BI_MS * 10);
        expect(data().biStatus).toBe("running");
      });
    });

    it("finishes the PA after a reload while it is in flight", () => {
      withFrozenClock(() => {
        const t = start();
        runSteps(t.actor, [{ type: "WEB_SUBMIT" }, { type: "VIEW_GATEWAY" }]);
        t.clock.increment(WEB_BI_MS);
        const { clock, data } = restore(t.actor);
        expect(data().paStatus).toBe("submitted");
        clock.increment(WEB_PA_MS);
        expect(data().paStatus).toBe("approved");
      });
    });

    it("leaves no timer behind once they have fired", () => {
      withFrozenClock(() => {
        const t = start();
        throughApproval(t);
        expect(ctx(t.actor)._timers).toEqual([]);
      });
    });

    it("keeps waiting after an undo to a step that was waiting on a timer", () => {
      withFrozenClock(() => {
        const t = start();
        throughApproval(t);
        expect(t.data().paStatus).toBe("approved");
        t.actor.send({ type: "UNDO" } as any); // back to: PA submitted, decision pending
        expect(t.data().paStatus).toBe("submitted");
        t.clock.increment(WEB_PA_MS);
        expect(t.data().paStatus).toBe("approved");
      });
    });
  });
});
