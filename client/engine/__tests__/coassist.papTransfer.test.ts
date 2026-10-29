import { describe, it, expect } from "vitest";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import { menuPaths, routeFor, routedPaths } from "@/engine/workflow/screens";
import type { ScenarioRecipe } from "@/engine/workflow/components";
import type { FlowType } from "@/engine/types";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COA_PAP_RECIPE } from "@/workflows/coassist/recipes";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";
import { ctx, startFlow } from "./harness";

/**
 * The `pap_transfer` module on `CoA_PAP` (docs/plans/PLAN_COA_PAP.md, steps 3 to 5): the referral, the transfer text, the
 * assigned pharmacy's PA routes staying out of the way, and the module order.
 */
const IDENTITY = ["REFERRAL_RECEIVED", "VERIFY_SMS", "VERIFY_OTP", "CONFIRM_CONSENT"];
const PAP_FORKS = forksForScenario(COASSIST_FORKS, "CoA_PAP");

function start(flow: FlowType = "CoA_PAP", choices?: Record<string, string>) {
  const actor = startFlow(flow, choices ? { choices } : {});
  const can = (type: string) => actor.getSnapshot().can({ type } as any);
  const send = (type: string) => actor.send({ type } as any);
  const data = () => ctx(actor).workflowData as any;
  for (const step of IDENTITY) send(step);
  return { actor, can, send, data, route: () => routeFor(COASSIST_SCREENS, data()) };
}

describe("pap_transfer module", () => {
  it("is a valid recipe, and the exit's requirements are met", () => {
    expect(recipeProblems(COA_PAP_RECIPE, PAP_FORKS)).toEqual([]);
  });

  it("fails when the pharmacy is ordered before the referral or the income form", () => {
    const [enrollment, transfer, income, pharmacy, scheduling, tracking] = COA_PAP_RECIPE.modules;
    const reorder = (modules: ScenarioRecipe["modules"]) => recipeProblems({ ...COA_PAP_RECIPE, modules }, PAP_FORKS);
    expect(reorder([enrollment, pharmacy, transfer, income, scheduling, tracking])).toContain("pharmacy_selection must come after pap_transfer");
    expect(reorder([enrollment, transfer, pharmacy, income, scheduling, tracking])).toContain("pharmacy_selection must come after income_qualification");
    expect(reorder([enrollment, income, transfer, pharmacy, scheduling, tracking])).toContain("income_qualification must come after pap_transfer");
  });

  it("rejects the referral and the text until BI completes", () => {
    const t = start();
    expect(t.can("REFER_TO_PSP")).toBe(false);
    expect(t.can("VERIFY_PAP_TRANSFER_SMS")).toBe(false);
    expect(t.route()).toBe("/");
    t.actor.stop();
  });

  it("refers the case when BI completes, texts the patient once, and sends no PA or cash offer", () => {
    const t = start();
    t.send("COMPLETE_BI");
    // The referral is a system step: it fires with BI, so the text is waiting.
    expect(t.data()).toMatchObject({ papTransferStatus: "referred", papTransferSmsSent: true, papTransferSmsVerified: false, paStatus: "none", cashOfferSmsSent: false });
    expect(t.route()).toBe("/pap-transfer-sms");
    expect(t.can("REFER_TO_PSP")).toBe(false);
    t.send("VERIFY_PAP_TRANSFER_SMS");
    expect(t.data().papTransferSmsVerified).toBe(true);
    expect(t.can("VERIFY_PAP_TRANSFER_SMS")).toBe(false);
    // The tap starts the application update text, with no agent.
    expect(t.data().papSmsSent).toBe(true);
    expect(t.route()).toBe("/pap-update-sms");
    t.actor.stop();
  });

  it("cannot be pinned to another exit: the recipe lacks the modules those exits need", () => {
    // The machine would fall back to the scenario's one reachable exit, so a pin like this must fail before a demo runs.
    // `pharmacy_covered` and `medical_pa_required` need no module this recipe lacks. The brand test closes that gap (step 6).
    for (const [bi, needs] of [["no_coverage", "cash_offer"], ["medical_covered", "provider_transfer"]] as const) {
      const problems = recipeProblems({ ...COA_PAP_RECIPE, choices: { bi } }, PAP_FORKS);
      expect(problems.some((p) => p.includes(`exit "${bi}" requires`) && p.includes(needs)), bi).toBe(true);
    }
  });

  it("keeps the assigned variant's PA routes for a case that runs a PA", () => {
    const t = start("CoA_Medical_Transfer");
    expect(t.route()).toBe("/");
    t.send("COMPLETE_BI");
    expect(t.route()).toBe("/");
    t.send("APPROVE_PA");
    expect(t.route()).toBe("/pa-approved-sms");
    t.actor.stop();
  });

  it("never shows a pricing, payment, PA, or cash offer screen", () => {
    const banned = ["/benefit-pricing", "/copay-enroll", "/pa-status", "/pa-approved", "/pa-approved-sms", "/pa-approved-otp", "/pa-denied", "/cash-offer-sms", "/delivery-payment", "/delivery-confirmation", "/pharmacy-transfer", "/provider-transfer"];
    expect(menuPaths(COASSIST_SCREENS, "CoA_PAP").filter((p) => banned.includes(p))).toEqual([]);
    expect(routedPaths(COASSIST_SCREENS, "CoA_PAP").filter((p) => banned.includes(p))).toEqual([]);
  });

  it("puts the transfer text in the menu of this scenario only", () => {
    expect(menuPaths(COASSIST_SCREENS, "CoA_PAP")).toContain("/pap-transfer-sms");
    for (const flow of ["CoA_DTP", "CoA_Copay", "CoA_Coverage", "CoA_Medical_Transfer"] as const) expect(menuPaths(COASSIST_SCREENS, flow)).not.toContain("/pap-transfer-sms");
  });

  it("hands the Rx to the assigned pharmacy and dispatches only after income verifies", () => {
    const t = start();
    t.send("COMPLETE_BI");
    for (const type of ["VERIFY_PAP_TRANSFER_SMS", "VERIFY_PAP_SMS", "VERIFY_PAP_OTP"]) t.send(type);
    expect(t.route()).toBe("/");
    expect(t.data().selectedPharmacy?.name).toBeTruthy();
    expect(t.can("PATIENT_SETS_ADDRESS")).toBe(false);
    t.send("START_INCOME_QUALIFICATION");
    expect(t.route()).toBe("/income-qualification");
    t.send("VERIFY_INCOME");
    expect(t.data()).toMatchObject({ incomeStatus: "verified", papStatus: "active", dispatchStatus: "pending_selection" });
    expect(t.route()).toBe("/delivery-address");
    t.send("PATIENT_SETS_ADDRESS");
    expect(t.route()).toBe("/delivery-date");
    t.send("PATIENT_SELECTS_SHIP_DATE");
    expect(t.route()).toBe("/pap-enrollment-complete");
    for (const type of ["FILL_RX", "READY_RX", "SHIP_RX", "DELIVER_RX"]) t.send(type);
    expect(t.route()).toBe("/medication-delivered");
    t.actor.stop();
  });
});
