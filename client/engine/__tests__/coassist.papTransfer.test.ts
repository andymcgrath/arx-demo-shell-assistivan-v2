import { describe, it, expect } from "vitest";
import { createActor } from "xstate";
import { createWorkflowMachine } from "@/engine/workflow/createWorkflowMachine";
import { forksForScenario } from "@/engine/workflow/forks";
import { recipeProblems } from "@/engine/workflow/recipe";
import { menuPaths, type ScreenMap } from "@/engine/workflow/screens";
import type { ScenarioRecipe } from "@/engine/workflow/components";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
import { PAP_TRANSFER_RULES } from "@/workflows/coassist/modules/pap_transfer";
import { PAP_TRANSFER_ROUTES, PAP_TRANSFER_SCREENS } from "@/workflows/coassist/modules/screens/pap_transfer";
import { COA_COPAY, COA_COVERAGE, COA_DTP, COA_MEDICAL_TRANSFER } from "@/workflows/coassist/scenarios";
import { COASSIST_SCREENS } from "@/workflows/coassist/screens";

/**
 * The `pap_transfer` module (docs/plans/PLAN_COA_PAP.md, step 3), tested on its own. No shipped scenario lists it yet
 * (step 5 adds `CoA_PAP`), and the build-time scope check rejects a module no recipe lists. So the module is not in
 * `COASSIST_RULES` or `COASSIST_SCREENS` yet. This test borrows the Medical Transfer slot for a recipe that has it.
 * Routes are not asserted here. The `assigned` variant's waiting route still claims `/` for a PA-less case (step 4).
 */
const RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi"],
  choices: { bi: "no_coverage_pap" },
  panels: ["benefits"],
  modules: [
    { id: "enrollment" },
    { id: "pap_transfer" },
    { id: "income_qualification" },
    { id: "pharmacy_selection", props: { variant: "assigned" } },
    { id: "tracking" },
  ],
};
const SCENARIO = { ...COA_MEDICAL_TRANSFER, choices: RECIPE.choices, recipe: RECIPE };

const machine = createWorkflowMachine({
  id: "coassist-pap-transfer",
  defaultFlowType: "CoA_DTP",
  rules: [...COASSIST_RULES, ...PAP_TRANSFER_RULES],
  forks: COASSIST_FORKS,
  // The other scenarios stay, so the build-time scope check still finds every module some recipe lists.
  scenarios: { CoA_DTP: COA_DTP, CoA_Copay: COA_COPAY, CoA_Coverage: COA_COVERAGE, CoA_Medical_Transfer: SCENARIO },
});
const screens: ScreenMap = {
  ...COASSIST_SCREENS,
  scenarioDefs: [COA_DTP, COA_COPAY, COA_COVERAGE, SCENARIO],
  screens: [...COASSIST_SCREENS.screens, ...PAP_TRANSFER_SCREENS],
  rules: [...COASSIST_SCREENS.rules, ...PAP_TRANSFER_ROUTES],
};

const IDENTITY = [{ type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" }];

function start(choices?: Record<string, string>) {
  const actor = createActor(machine, { input: { flowType: "CoA_Medical_Transfer", ...(choices ? { choices } : {}) } } as any);
  actor.start();
  const can = (type: string) => actor.getSnapshot().can({ type } as any);
  const send = (type: string) => actor.send({ type } as any);
  const data = () => (actor.getSnapshot().context as any).workflowData;
  return { actor, can, send, data };
}

describe("pap_transfer module", () => {
  it("is a valid recipe, and the exit's requirements are met", () => {
    expect(recipeProblems(RECIPE, forksForScenario(COASSIST_FORKS, "CoA_Medical_Transfer"))).toEqual([]);
  });

  it("rejects the referral until BI completes", () => {
    const t = start();
    expect(t.can("REFER_TO_PSP")).toBe(false);
    for (const step of IDENTITY) t.actor.send(step as any);
    expect(t.can("REFER_TO_PSP")).toBe(false);
    expect(t.can("VERIFY_PAP_TRANSFER_SMS")).toBe(false);
    t.actor.stop();
  });

  it("refers the case once BI completes on the free drug program exit, and texts the patient once", () => {
    const t = start();
    for (const step of IDENTITY) t.actor.send(step as any);
    t.send("COMPLETE_BI");
    expect(t.can("REFER_TO_PSP")).toBe(true);
    t.send("REFER_TO_PSP");
    expect(t.data()).toMatchObject({ papTransferStatus: "referred", papTransferSmsSent: true, papTransferSmsVerified: false, paStatus: "none", cashOfferSmsSent: false });
    expect(t.can("REFER_TO_PSP")).toBe(false);
    t.send("VERIFY_PAP_TRANSFER_SMS");
    expect(t.data().papTransferSmsVerified).toBe(true);
    expect(t.can("VERIFY_PAP_TRANSFER_SMS")).toBe(false);
    t.actor.stop();
  });

  it("rejects the referral when the story picked another exit", () => {
    for (const bi of ["no_coverage", "pharmacy_covered", "medical_pa_required"]) {
      const t = start({ bi });
      for (const step of IDENTITY) t.actor.send(step as any);
      t.send("COMPLETE_BI");
      expect(t.can("REFER_TO_PSP"), bi).toBe(false);
      t.actor.stop();
    }
  });

  it("puts the transfer text in the menu of a recipe that lists the module, and of no other", () => {
    expect(menuPaths(screens, "CoA_Medical_Transfer")).toContain("/pap-transfer-sms");
    for (const flow of ["CoA_DTP", "CoA_Copay", "CoA_Coverage"] as const) expect(menuPaths(screens, flow)).not.toContain("/pap-transfer-sms");
  });
});
