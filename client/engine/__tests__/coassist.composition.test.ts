import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import { menuPaths, routeFor, routedPaths, type ScreenMap } from "@/engine/workflow/screens";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COA_COMMERCIAL_TRANSFER_RECIPE as RECIPE } from "@/workflows/coassist/recipes";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
import { COA_COPAY, COA_DME, COA_DTP } from "@/workflows/coassist/scenarios";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { expectMatchesFixture } from "./harness";

/**
 * Step 2.6, the composition proof: a path built only by choosing modules and fork picks.
 *
 * Commercial coverage, PA approved, a Retail pick, a pharmacy the patient selects, the Rx handed over, the order
 * tracker. No scheduling and no payment. The recipe is `COA_COMMERCIAL_TRANSFER_RECIPE`. No rule, route, or
 * screen was written for it. It runs on Copay's id because Copay declares the `pricing` fork with a Retail exit.
 *
 * Three things must hold:
 * 1. The recipe is valid.
 * 2. The patient never sees a scheduling or payment screen, in the menu or on the route.
 * 3. The machine rejects the scheduling and payment events, so a presenter cannot reach them by accident.
 */
const SCENARIO = { ...COA_COPAY, choices: RECIPE.choices, recipe: RECIPE };

const machine = createWorkflowMachine({
  id: "coassist-composition",
  defaultFlowType: "CoA_Copay",
  rules: COASSIST_RULES,
  forks: COASSIST_FORKS,
  // DTP and DME stay, so the build-time scope check still finds every module some recipe lists.
  scenarios: { CoA_DTP: COA_DTP, CoA_Copay: SCENARIO, CoA_DME: COA_DME },
});
const screens: ScreenMap = { ...COASSIST_SCREENS, scenarioDefs: [COA_DTP, SCENARIO, COA_DME] };

const PHARMACY = { name: "Test Pharmacy", address: "1 Main St", city: "Orlando", state: "FL", zip: "32801", phone: "(555) 555-0100" };
const SCHEDULING_AND_PAYMENT = ["/delivery-address", "/delivery-date", "/delivery-payment", "/delivery-confirmation"];

const STEPS: { type: string; [k: string]: unknown }[] = [
  { type: "REFERRAL_RECEIVED" },
  { type: "VERIFY_SMS" },
  { type: "VERIFY_OTP" },
  { type: "CONFIRM_CONSENT" },
  { type: "COMPLETE_BI", result: "coverage_found" },
  { type: "APPROVE_PA" },
  { type: "VERIFY_PA_APPROVED_SMS" },
  { type: "VERIFY_PA_APPROVED_OTP" },
  { type: "SELECT_PHARMACY", pharmacy: PHARMACY },
  // The recipe has no scheduling or payment, so the machine must reject these.
  { type: "PATIENT_SETS_ADDRESS" },
  { type: "PATIENT_SELECTS_SHIP_DATE" },
  { type: "PATIENT_PAYS" },
  { type: "VERIFY_PAYMENT" },
  { type: "FILL_RX" },
  { type: "READY_RX" },
  { type: "SHIP_RX" },
  { type: "DELIVER_RX" },
];

function walk() {
  const actor = createActor(machine, { input: { flowType: "CoA_Copay" } } as any);
  actor.start();
  const steps = STEPS.map((step) => {
    const accepted = actor.getSnapshot().can(step as any);
    actor.send(step as any);
    const d = (actor.getSnapshot().context as any).workflowData;
    return {
      event: step.type,
      accepted,
      route: routeFor(screens, d),
      pricingOption: d.pricingOption,
      pharmacy: d.selectedPharmacy?.name ?? null,
      dispatchStatus: d.dispatchStatus,
      pharmacyStatus: d.pharmacyStatus,
    };
  });
  actor.stop();
  return steps;
}

describe("CoAssist composition proof: commercial coverage, pharmacy pick, transfer, no scheduling or payment", () => {
  it("is a valid recipe", () => {
    expect(recipeProblems(RECIPE, forksForScenario(COASSIST_FORKS, "CoA_Copay"))).toEqual([]);
  });

  it("shows no scheduling or payment screen in the menu or on any route", () => {
    expect(menuPaths(screens, "CoA_Copay").filter((p) => SCHEDULING_AND_PAYMENT.includes(p))).toEqual([]);
    expect(routedPaths(screens, "CoA_Copay").filter((p) => SCHEDULING_AND_PAYMENT.includes(p))).toEqual([]);
    // The tracker and the patient's pharmacy pick stay.
    expect(menuPaths(screens, "CoA_Copay")).toContain("/order-tracker");
    expect(menuPaths(screens, "CoA_Copay")).toContain("/pharmacy-selection");
  });

  it("rejects the scheduling and payment events and reaches delivery", () => {
    const steps = walk();
    const rejected = steps.filter((s) => !s.accepted).map((s) => s.event);
    expect(rejected).toEqual(["PATIENT_SETS_ADDRESS", "PATIENT_SELECTS_SHIP_DATE", "PATIENT_PAYS", "VERIFY_PAYMENT"]);
    expect(steps.filter((s) => SCHEDULING_AND_PAYMENT.includes(s.route))).toEqual([]);
    const last = steps[steps.length - 1];
    expect(last.route).toBe("/order-tracker");
    expect(last.pharmacyStatus).toBe("delivered");
    expect(last.dispatchStatus === "none" || last.dispatchStatus === "dispatched").toBe(true);
  });

  it("matches the recorded path", () => {
    expectMatchesFixture("golden/coa-commercial-transfer-composition", { recipe: RECIPE, steps: walk() });
  });
});
