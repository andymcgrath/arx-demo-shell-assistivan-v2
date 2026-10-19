import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { forksForScenario } from "@/engine/workflow/forks";
import type { ScenarioRecipe } from "@/engine/workflow/components";
import { recipeProblems } from "@/engine/workflow/recipe";
import { ruleAppliesTo } from "@/engine/workflow/scope";
import { menuPaths, routeFor, routedPaths, type ScreenMap } from "@/engine/workflow/screens";
import { IASSIST_FORKS } from "@/workflows/iassist/forks";
import { IASSIST_RULES } from "@/workflows/iassist/rules";
import { IA_PA_APPROVED, IA_PA_DENIED_APPEAL } from "@/workflows/iassist/scenarios";
import { IASSIST_SCREENS } from "@/workflows/iassist/screens";
import { expectMatchesFixture } from "./harness";

/**
 * The medical transfer composition: an iAssist source, a medical benefit that covers it with a PA, the Triage
 * `transfer` exit (HCP administered, no payment, no scheduling), and an assigned pharmacy. The recipe is the only
 * thing that makes it. No rule, route, or screen is specific to it. It runs on the approved scenario's id until it has its own.
 *
 * Three things must hold:
 * 1. The recipe is valid, including the Triage `transfer` rules.
 * 2. The patient never sees a pricing, scheduling, or payment screen, in the menu or on the route.
 * 3. The machine rejects those events and the fulfillment events, and the patient ends on the transfer screen.
 */
const RECIPE: ScenarioRecipe = {
  source: "iassist",
  forks: ["bi", "pa"],
  choices: { bi: "medical_pa_required", pa: "approved" },
  triage: "transfer",
  modules: [{ id: "enrollment" }, { id: "pa_notification" }, { id: "pharmacy_selection", props: { variant: "assigned" } }, { id: "tracking" }],
};
const SCENARIO = { ...IA_PA_APPROVED, choices: RECIPE.choices, recipe: RECIPE };

// The build-time scope check wants every module a rule names to appear in some scenario. iAssist has two flow types, so
// the table keeps the rules that apply to this recipe or to the appeal scenario. The next test names the ones it drops.
const rulesFor = (rule: (typeof IASSIST_RULES)[number]) =>
  ruleAppliesTo(rule, SCENARIO, IASSIST_FORKS) || ruleAppliesTo(rule, IA_PA_DENIED_APPEAL, IASSIST_FORKS);

const machine = createWorkflowMachine({
  id: "iassist-composition",
  defaultFlowType: "iAssist_PA_Approved",
  rules: IASSIST_RULES.filter(rulesFor),
  forks: IASSIST_FORKS,
  scenarios: { iAssist_PA_Approved: SCENARIO, iAssist_PAP: IA_PA_DENIED_APPEAL },
});
const screens: ScreenMap = { ...IASSIST_SCREENS, scenarioDefs: [SCENARIO, IA_PA_DENIED_APPEAL] };

const OFF_LIMITS = ["/benefit-pricing", "/delivery-address", "/delivery-date", "/delivery-payment", "/delivery-confirmation"];

const STEPS: { type: string; [k: string]: unknown }[] = [
  { type: "REFERRAL_RECEIVED" },
  { type: "VERIFY_SMS" },
  { type: "VERIFY_OTP" },
  { type: "CONFIRM_CONSENT" },
  { type: "COMPLETE_BI" },
  { type: "APPROVE_PA" },
  { type: "VERIFY_PA_APPROVED_SMS" },
  { type: "VERIFY_PA_APPROVED_OTP" },
  // The recipe has no payment, scheduling, or fulfillment, so the machine must reject these.
  { type: "SELECT_PRICING_OPTION", option: "retail" },
  { type: "PATIENT_SETS_ADDRESS" },
  { type: "PATIENT_SELECTS_SHIP_DATE" },
  { type: "PATIENT_PAYS" },
  { type: "FILL_RX" },
];

function walk() {
  const actor = createActor(machine, { input: { flowType: "iAssist_PA_Approved" } } as any);
  actor.start();
  const steps = STEPS.map((step) => {
    const accepted = actor.getSnapshot().can(step as any);
    actor.send(step as any);
    const d = (actor.getSnapshot().context as any).workflowData;
    return {
      event: step.type,
      accepted,
      route: routeFor(screens, d),
      paRequired: d.paRequired,
      medicalBenefitStatus: d.medicalBenefitStatus,
      pharmacyAssigned: d.pharmacyAssigned,
      pharmacy: d.selectedPharmacy?.name ?? null,
      pharmacyStatus: d.pharmacyStatus,
    };
  });
  actor.stop();
  return steps;
}

describe("iAssist composition proof: medical benefit with a PA, Triage transfer, assigned pharmacy", () => {
  it("is a valid recipe", () => {
    expect(recipeProblems(RECIPE, forksForScenario(IASSIST_FORKS, "iAssist_PA_Approved"))).toEqual([]);
  });

  it("shows no pricing, scheduling, or payment screen in the menu or on any route", () => {
    expect(menuPaths(screens, "iAssist_PA_Approved").filter((p) => OFF_LIMITS.includes(p))).toEqual([]);
    expect(routedPaths(screens, "iAssist_PA_Approved").filter((p) => OFF_LIMITS.includes(p))).toEqual([]);
    expect(menuPaths(screens, "iAssist_PA_Approved")).toContain("/pharmacy-transfer");
  });

  it("applies no pricing, payment, delivery scheduling, or fulfillment rule to the recipe", () => {
    const applies = (id: string) => ruleAppliesTo(IASSIST_RULES.find((r) => r.id === id)!, SCENARIO, IASSIST_FORKS);
    for (const id of [
      "payment.select_pricing_option",
      "payment.patient_pays",
      "scheduling.patient_sets_address",
      "scheduling.patient_selects_ship_date",
      "tracking.fill_rx.delivery",
      "pharmacy_selection.select_pharmacy.crm",
    ]) {
      expect(applies(id), id).toBe(false);
    }
    expect(applies("pa_notification.verify_otp")).toBe(true);
  });

  it("requires a PA, assigns the pharmacy, rejects the off-limits events, and ends on the transfer screen", () => {
    const steps = walk();
    expect(steps.filter((s) => !s.accepted).map((s) => s.event)).toEqual([
      "SELECT_PRICING_OPTION",
      "PATIENT_SETS_ADDRESS",
      "PATIENT_SELECTS_SHIP_DATE",
      "PATIENT_PAYS",
      "FILL_RX",
    ]);
    const last = steps[steps.length - 1];
    expect(last).toMatchObject({ route: "/pharmacy-transfer", paRequired: true, medicalBenefitStatus: "covered", pharmacyAssigned: true, pharmacyStatus: "none" });
    expect(last.pharmacy).toBeTruthy();
    expect(steps.filter((s) => OFF_LIMITS.includes(s.route))).toEqual([]);
  });

  it("matches the recorded path", () => {
    expectMatchesFixture("golden/iassist-medical-transfer-composition", { recipe: RECIPE, steps: walk() });
  });
});
