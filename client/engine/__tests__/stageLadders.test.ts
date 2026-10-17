import { describe, it } from "vitest";
import type { FlowType } from "@/engine/types";
import { ctx, expectMatchesFixture, runSteps, startFlow, withFrozenClock, type Step } from "./harness";
import { derivePatientRoute } from "@/engine/WorkflowEngine";

/**
 * The presenter's "jump to stage" menu (resetActorToStage in shell/DemoShell.tsx)
 * RESETs the actor and replays events up to a stage. These lists mirror the
 * CoAssist branches of that function. Keep them in sync until the replay
 * moves out of the React component.
 *
 * Each stage is replayed cumulatively on a fresh actor. The fixture records
 * which events were ignored, so a stage that does not actually land shows up.
 */
const PHARMACY = { name: "CVS Pharmacy #3795", address: "210 N Orange Ave", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-0142" };

const identity: Step[] = [{ type: "ENROLL" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];

const DTP_COPAY_LADDER: Step[][] = [
  identity, // stage 2
  [{ type: "RUN_BI" }], // 3
  [{ type: "COMPLETE_BI", result: "coverage_found" }, { type: "SUBMIT_PA" }, { type: "APPROVE_PA" }, { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }], // 4
  [{ type: "SELECT_PRICING_OPTION", option: "retail" }, { type: "PATIENT_SETS_ADDRESS" }, { type: "PATIENT_SELECTS_SHIP_DATE" }], // 5
  [{ type: "FILL_RX" }], // 6
  [{ type: "READY_RX" }, { type: "SHIP_RX" }], // 7
  [{ type: "DELIVER_RX" }], // 8
];

const DME_LADDER: Step[][] = [
  identity, // 2
  [{ type: "RUN_BI" }], // 3
  [...identity, { type: "RUN_BI" }, { type: "COMPLETE_BI", pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" }], // 4 (replayDmeToBiComplete)
  [{ type: "SUBMIT_PA" }, { type: "APPROVE_PA" }, { type: "VERIFY_PA_APPROVED_SMS" }, { type: "VERIFY_PA_APPROVED_OTP" }, { type: "SELECT_PHARMACY", pharmacy: PHARMACY }], // 5
  [{ type: "FILL_RX" }], // 6
  [{ type: "SHIP_RX" }], // 7
  [{ type: "DELIVER_RX" }], // 8
];

const LADDERS: [FlowType, Step[][]][] = [
  ["CoA_DTP", DTP_COPAY_LADDER],
  ["CoA_Copay", DTP_COPAY_LADDER],
  ["CoA_DME", DME_LADDER],
];

describe("stage ladders (jump to stage)", () => {
  for (const [flowType, ladder] of LADDERS) {
    it(flowType, () => {
      withFrozenClock(() => {
        const stages = ladder.map((_, i) => {
          const actor = startFlow(flowType);
          const records = runSteps(actor, ladder.slice(0, i + 1).flat());
          const { workflowData: d } = ctx(actor);
          const out = {
            stage: i + 2,
            ignored: records.filter((r) => !r.accepted).map((r) => r.event),
            route: derivePatientRoute(ctx(actor)),
            biStatus: d.biStatus,
            paStatus: d.paStatus,
            pricingOption: d.pricingOption,
            dispatchStatus: d.dispatchStatus,
            pharmacyStatus: d.pharmacyStatus,
          };
          actor.stop();
          return out;
        });
        expectMatchesFixture(`ladders/${flowType}`, stages);
      });
    });
  }
});
