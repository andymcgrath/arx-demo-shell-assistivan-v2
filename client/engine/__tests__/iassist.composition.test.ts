import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import { menuPaths, routeFor, routedPaths } from "@/engine/workflow/screens";
import { ruleAppliesTo } from "@/engine/workflow/scope";
import { iassistMachine } from "@/workflows/iassist";
import { IASSIST_FORKS } from "@/workflows/iassist/forks";
import { IASSIST_RULES } from "@/workflows/iassist/rules";
import { IA_MEDICAL_TRANSFER } from "@/workflows/iassist/scenarios";
import { IASSIST_SCREENS } from "@/workflows/iassist/screens";

/**
 * The medical transfer scenario, proven from its recipe: an iAssist source, a medical benefit that covers it with a PA,
 * the Triage `transfer` exit (HCP administered, no payment, no scheduling), and an assigned pharmacy. The recipe is the
 * only thing that makes it. No rule, route, or screen is specific to it. The golden path records the full event list.
 *
 * Three things must hold:
 * 1. The recipe is valid, including the Triage `transfer` rules.
 * 2. The patient never sees a pricing, scheduling, or payment screen, in the menu or on the route.
 * 3. The machine rejects those events and the fulfillment events, and the patient ends on the transfer screen.
 */
const FLOW = "iAssist_Medical_Transfer" as const;
const RECIPE = IA_MEDICAL_TRANSFER.recipe!;
const SCENARIO = IA_MEDICAL_TRANSFER;
const screens = IASSIST_SCREENS;
const machine = iassistMachine;

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
  const actor = createActor(machine, { input: { flowType: FLOW } } as any);
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
    expect(recipeProblems(RECIPE, forksForScenario(IASSIST_FORKS, FLOW))).toEqual([]);
  });

  it("shows no pricing, scheduling, or payment screen in the menu or on any route", () => {
    expect(menuPaths(screens, FLOW).filter((p) => OFF_LIMITS.includes(p))).toEqual([]);
    expect(routedPaths(screens, FLOW).filter((p) => OFF_LIMITS.includes(p))).toEqual([]);
    expect(menuPaths(screens, FLOW)).toContain("/pharmacy-transfer");
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
});
