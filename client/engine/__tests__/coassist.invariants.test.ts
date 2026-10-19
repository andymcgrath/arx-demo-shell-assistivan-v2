import { describe, it, expect } from "vitest";
import type { FlowType } from "@/engine/types";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import { ctx, runSteps, startFlow, withFrozenClock, type Step } from "./harness";

/**
 * Ordering rules for the CoAssist workflow (CLAUDE.md rules 11 and 12).
 * Golden paths only send valid events, so they cannot catch a weakened
 * precondition. These tests send events at the wrong time and expect them
 * to be ignored.
 */
const COA: FlowType[] = ["CoA_DTP", "CoA_Copay", "CoA_Coverage"];
const PHARMACY = { name: "Test Pharmacy" };
/** Patient finishes onboarding. Pricing options reach the patient only after this. */
const ENROLLED: Step[] = [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];

const BI_DTP: Step = { type: "COMPLETE_BI", result: "coverage_found" };
const bi = (flowType: FlowType, pharmacy: "covered" | "not_covered" = "covered", medical: "covered" | "not_covered" = "not_covered"): Step =>
  flowType === "CoA_Coverage"
    ? { type: "COMPLETE_BI", pharmacyBenefitStatus: pharmacy, medicalBenefitStatus: medical }
    : BI_DTP;

const everyEvent: Step[] = [
  { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" },
  { type: "RUN_BI" }, bi("CoA_DTP"), { type: "SUBMIT_PA" }, { type: "APPROVE_PA" }, { type: "DENY_PA" },
  { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" },
  { type: "SELECT_PRICING_OPTION", option: "retail" }, { type: "SELECT_SELF_PAY" }, { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
  { type: "SEND_CASH_OFFER" }, { type: "PATIENT_PAYS" }, { type: "VERIFY_PAYMENT" },
  { type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" },
  { type: "FILL_RX" }, { type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" },
  { type: "NOTIFY_PROVIDER_TRANSFER" }, { type: "VERIFY_DME_TRANSFER_SMS" }, { type: "VERIFY_CASH_OFFER_SMS" },
];

const accepts = (actor: ReturnType<typeof startFlow>, step: Step) => actor.getSnapshot().can(step as any);

describe("CoAssist ordering rules", () => {
  for (const flow of COA) {
    describe(flow, () => {
      it("accepts nothing before REFERRAL_RECEIVED except REFERRAL_RECEIVED", () => {
        withFrozenClock(() => {
          const actor = startFlow(flow);
          expect(everyEvent.filter((s) => accepts(actor, s)).map((s) => s.type)).toEqual([]);
          expect(accepts(actor, { type: "REFERRAL_RECEIVED" })).toBe(true);
        });
      });

      it("REFERRAL_RECEIVED only counts once", () => {
        withFrozenClock(() => {
          const actor = startFlow(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }]);
          expect(accepts(actor, { type: "REFERRAL_RECEIVED" })).toBe(false);
        });
      });

      it("starts BI when REFERRAL_RECEIVED lands, and blocks the PA until BI has completed", () => {
        withFrozenClock(() => {
          const actor = startFlow(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }]);
          expect(ctx(actor).workflowData.biStatus).toBe("running"); // BI starts on its own
          expect(accepts(actor, { type: "RUN_BI" })).toBe(false); // and only once
          expect(accepts(actor, { type: "SUBMIT_PA" })).toBe(false); // still running
          expect(ctx(actor).workflowData.paStatus).toBe("none");
          expect(accepts(actor, { type: "APPROVE_PA" })).toBe(false); // nothing to approve yet
        });
      });

      it("blocks approval, pricing, payment, and fulfillment before their prerequisites", () => {
        withFrozenClock(() => {
          const actor = startFlow(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, bi(flow)]);
          const blocked = ["VERIFY_PA_APPROVED_SMS", "SELECT_PRICING_OPTION", "PATIENT_PAYS", "VERIFY_PAYMENT", "PATIENT_SETS_ADDRESS", "FILL_RX", "READY_RX", "SHIP_RX", "DELIVER_RX"];
          expect(everyEvent.filter((s) => blocked.includes(s.type) && accepts(actor, s)).map((s) => s.type)).toEqual([]);
        });
      });

      it("blocks fulfillment steps out of order", () => {
        withFrozenClock(() => {
          const actor = startFlow(flow);
          const path: Step[] =
            flow === "CoA_Coverage"
              ? [{ type: "REFERRAL_RECEIVED" }, bi(flow), { type: "APPROVE_PA" }, ...ENROLLED, { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }, { type: "SELECT_PHARMACY", pharmacy: PHARMACY }]
              : [{ type: "REFERRAL_RECEIVED" }, bi(flow), { type: "APPROVE_PA" }, ...ENROLLED, { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }, { type: "SELECT_PRICING_OPTION", option: "retail" }];
          runSteps(actor, path);
          expect(accepts(actor, { type: "READY_RX" })).toBe(false);
          expect(accepts(actor, { type: "SHIP_RX" })).toBe(false);
          expect(accepts(actor, { type: "DELIVER_RX" })).toBe(false);
          expect(accepts(actor, { type: "FILL_RX" })).toBe(true);
          runSteps(actor, [{ type: "FILL_RX" }]);
          expect(accepts(actor, { type: "PATIENT_SETS_ADDRESS" })).toBe(false); // too late once the Rx is filling
          expect(accepts(actor, { type: "FILL_RX" })).toBe(false);
          expect(accepts(actor, { type: "SHIP_RX" })).toBe(false);
          runSteps(actor, [{ type: "READY_RX" }, { type: "SHIP_RX" }, { type: "DELIVER_RX" }]);
          expect(ctx(actor).workflowData.pharmacyStatus).toBe("delivered");
          expect(accepts(actor, { type: "DELIVER_RX" })).toBe(false);
        });
      });
    });
  }

  describe("scenario differences", () => {
    it("DTP and Copay can deny the PA. DME cannot.", () => {
      withFrozenClock(() => {
        for (const flow of COA) {
          const actor = startFlow(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, bi(flow)]);
          expect(accepts(actor, { type: "DENY_PA" })).toBe(flow !== "CoA_Coverage");
        }
      });
    });

    it("DME: a PA is needed only when the pharmacy benefit covers and the medical benefit does not", () => {
      withFrozenClock(() => {
        const cases: [string, "covered" | "not_covered", "covered" | "not_covered", boolean][] = [
          ["pharmacy only", "covered", "not_covered", true],
          ["both covered", "covered", "covered", false],
          ["medical only", "not_covered", "covered", false],
          ["neither", "not_covered", "not_covered", false],
        ];
        for (const [label, pharmacy, medical, paAllowed] of cases) {
          const actor = startFlow("CoA_Coverage");
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, bi("CoA_Coverage", pharmacy, medical)]);
          // SUBMIT_PA fires on its own after BI. It only lands for "pharmacy only".
          expect([label, ctx(actor).workflowData.paStatus === "submitted"]).toEqual([label, paAllowed]);
        }
      });
    });

    it("DME: provider transfer needs medical coverage. The cash-offer SMS needs neither covered.", () => {
      withFrozenClock(() => {
        const medical = startFlow("CoA_Coverage");
        runSteps(medical, [{ type: "REFERRAL_RECEIVED" }, bi("CoA_Coverage", "covered", "covered")]);
        expect(accepts(medical, { type: "NOTIFY_PROVIDER_TRANSFER" })).toBe(true);
        expect(accepts(medical, { type: "VERIFY_CASH_OFFER_SMS" })).toBe(false);

        const neither = startFlow("CoA_Coverage");
        runSteps(neither, [{ type: "REFERRAL_RECEIVED" }, bi("CoA_Coverage", "not_covered", "not_covered")]);
        expect(accepts(neither, { type: "NOTIFY_PROVIDER_TRANSFER" })).toBe(false);
        expect(accepts(neither, { type: "VERIFY_CASH_OFFER_SMS" })).toBe(true);
        expect(accepts(neither, { type: "SELECT_SELF_PAY" })).toBe(false); // SMS tap-through comes first
      });
    });

    it("Copay: enrolling in the copay program is one-time, and the patient still picks Retail or Mail Order", () => {
      withFrozenClock(() => {
        const actor = startFlow("CoA_Copay");
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, BI_DTP, { type: "APPROVE_PA" }, ...ENROLLED, { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }, { type: "SELECT_SELF_PAY" }]);
        expect(ctx(actor).workflowData.copayEnrolled).toBe(true);
        expect(ctx(actor).workflowData.pricingOption).toBeNull();
        expect(accepts(actor, { type: "SELECT_SELF_PAY" })).toBe(false);
        expect(accepts(actor, { type: "FILL_RX" })).toBe(false);
        expect(accepts(actor, { type: "SELECT_PRICING_OPTION", option: "mail_order" })).toBe(true);
      });
    });

    it("A PA approved before consent: nothing reaches the patient until they consent, then they go straight to pricing", () => {
      withFrozenClock(() => {
        for (const flow of COA) {
          const actor = startFlow(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, bi(flow), { type: "APPROVE_PA" }]);
          expect(ctx(actor).workflowData.paStatus).toBe("approved");
          // Still enrolling: the pricing SMS cannot go out.
          expect([flow, accepts(actor, { type: "VERIFY_PA_APPROVED_SMS" })]).toEqual([flow, false]);
          runSteps(actor, [{ type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }]);
          expect([flow, accepts(actor, { type: "VERIFY_PA_APPROVED_SMS" })]).toEqual([flow, false]); // consent still pending
          runSteps(actor, [{ type: "CONFIRM_CONSENT" }]);
          // In the app and already verified: no second SMS or one-time code.
          expect([flow, accepts(actor, { type: "VERIFY_PA_APPROVED_SMS" })]).toEqual([flow, false]);
          expect([flow, accepts(actor, { type: "VERIFY_PA_APPROVED_OTP" })]).toEqual([flow, false]);
          expect(ctx(actor).workflowData.paApprovedOtpVerified).toBe(true);
          if (flow !== "CoA_Coverage") expect(derivePatientRoute(ctx(actor))).toBe("/benefit-pricing");
        }
      });
    });

    it("A PA approved after consent still sends the SMS and one-time code (the patient is away)", () => {
      withFrozenClock(() => {
        for (const flow of COA) {
          const actor = startFlow(flow);
          runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, ...ENROLLED, bi(flow), { type: "APPROVE_PA" }]);
          expect([flow, accepts(actor, { type: "VERIFY_PA_APPROVED_SMS" })]).toEqual([flow, true]);
          if (flow !== "CoA_Coverage") expect(derivePatientRoute(ctx(actor))).toBe("/pa-approved-sms");
        }
      });
    });

    it("Payment can only be verified once", () => {
      withFrozenClock(() => {
        const actor = startFlow("CoA_DTP");
        runSteps(actor, [{ type: "REFERRAL_RECEIVED" }, BI_DTP, { type: "DENY_PA" }, { type: "SEND_CASH_OFFER" }, { type: "PATIENT_PAYS" }, { type: "VERIFY_PAYMENT" }]);
        expect(accepts(actor, { type: "VERIFY_PAYMENT" })).toBe(false);
        expect(accepts(actor, { type: "PATIENT_PAYS" })).toBe(false);
      });
    });
  });
});
