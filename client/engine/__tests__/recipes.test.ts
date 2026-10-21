import { describe, it, expect } from "vitest";
import { MODULE_CONTRACTS, type ModuleSpec, type ScenarioRecipe } from "@/engine/workflow/components";
import { recipeProblems } from "@/engine/workflow/recipe";
import { COASSIST_RECIPES } from "@/workflows/coassist/recipes";
import { IASSIST_RECIPES } from "@/workflows/iassist/recipes";
import { ALL_FORKS } from "@/workflows/forks";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { forksForScenario } from "@/engine/workflow/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import type { FlowType } from "@/engine/types";

/**
 * Recipes are data, so a headless test can check them. These tests cover the recipe validator and
 * the CoAssist recipes. They do not drive the machine. Step 2.4 makes the machine read the recipe.
 */

const recipe = (over: Partial<ScenarioRecipe>): ScenarioRecipe => ({
  source: "coassist",
  forks: ["bi"],
  choices: {},
  modules: [{ id: "enrollment" }, { id: "tracking" }],
  ...over,
});

const forksFor = (flowType: string) => forksForScenario(COASSIST_FORKS, flowType as FlowType);

describe("CoAssist recipes", () => {
  for (const [flowType, r] of Object.entries(COASSIST_RECIPES)) {
    it(`${flowType} is a valid recipe, and its choices name declared exits`, () => {
      expect(recipeProblems(r, forksFor(flowType))).toEqual([]);
    });

    it(`${flowType}: the recipe's choices match the scenario's defaults`, () => {
      const scenario = ALL_SCENARIOS.find((s) => s.flowType === flowType)!;
      expect(r.choices).toEqual(scenario.choices);
    });
  }

  it("every module a recipe names is in the catalog", () => {
    for (const r of Object.values(COASSIST_RECIPES)) {
      for (const m of r.modules) expect(MODULE_CONTRACTS[m.id]).toBeDefined();
    }
  });

  it("every recipe passes through the bi and pa forks", () => {
    for (const r of Object.values(COASSIST_RECIPES)) expect(r.forks).toEqual(expect.arrayContaining(["bi", "pa"]));
  });

  it("DTP and Copay pass through the patient's pricing pick, and Copay through the copay enrollment", () => {
    expect(COASSIST_RECIPES.CoA_DTP.forks).toContain("pricing");
    expect(COASSIST_RECIPES.CoA_Copay.forks).toEqual(expect.arrayContaining(["copay", "pricing"]));
    expect(COASSIST_RECIPES.CoA_Coverage.forks).not.toContain("pricing");
  });

  it("Coverage pins the PA to approved", () => {
    expect(COASSIST_RECIPES.CoA_Coverage.choices.pa).toBe("approved");
  });
});

describe("iAssist recipes", () => {
  for (const [flowType, r] of Object.entries(IASSIST_RECIPES)) {
    it(`${flowType} is a valid recipe, and its choices name declared exits`, () => {
      expect(recipeProblems(r, forksForScenario(ALL_FORKS, flowType as FlowType))).toEqual([]);
    });

    it(`${flowType}: the recipe's choices match the scenario's defaults`, () => {
      const scenario = ALL_SCENARIOS.find((s) => s.flowType === flowType)!;
      expect(r.choices).toEqual(scenario.choices);
    });
  }

  it("rejects the pick of a branch no module in the recipe handles", () => {
    const forks = forksForScenario(ALL_FORKS, "iAssist_PA_Approved");
    // Denied needs the appeal, approved needs the PA notification, and no coverage needs financial assistance.
    const denied = { ...IASSIST_RECIPES.iAssist_PA_Approved, choices: { bi: "pharmacy_covered", pa: "denied" } };
    expect(recipeProblems(denied, forks)).toContain('fork "pa" exit "denied" requires appeal in the recipe');
    const approvedOnAppeal = { ...IASSIST_RECIPES.iAssist_PAP, choices: { bi: "pharmacy_covered", pa: "approved" } };
    expect(recipeProblems(approvedOnAppeal, forksForScenario(ALL_FORKS, "iAssist_PAP"))).toContain(
      'fork "pa" exit "approved" requires pa_notification in the recipe',
    );
    const noCoverage = { ...IASSIST_RECIPES.iAssist_PA_Approved, choices: { bi: "no_coverage", pa: "approved" } };
    expect(recipeProblems(noCoverage, forks)).toContain('fork "bi" exit "no_coverage" requires financial_assistance in the recipe');
  });

  it("CoAssist's pa fork no longer applies to iAssist, and the reverse", () => {
    const ids = (flow: string) => forksForScenario(ALL_FORKS, flow as FlowType).filter((f) => f.id === "pa").map((f) => f.exits.find((e) => e.id === "denied")!.requires);
    expect(ids("CoA_DTP")).toEqual([["cash_offer"]]);
    expect(ids("iAssist_PAP")).toEqual([["appeal"]]);
  });

  it("the appeal scenario passes through the appeal module and not through pricing, scheduling a delivery, or payment", () => {
    const ids = IASSIST_RECIPES.iAssist_PAP.modules.map((m) => m.id);
    expect(ids).toContain("appeal");
    expect(ids).not.toContain("payment");
    expect(ids).not.toContain("pa_notification");
    expect(IASSIST_RECIPES.iAssist_PAP.modules.find((m) => m.id === "scheduling")?.props).toEqual({ variant: "infusion" });
  });

  it("the approved scenario has no appeal", () => {
    expect(IASSIST_RECIPES.iAssist_PA_Approved.modules.map((m) => m.id)).not.toContain("appeal");
  });

  it("rejects an appeal that runs before the patient has enrolled", () => {
    const problems = recipeProblems({ ...IASSIST_RECIPES.iAssist_PAP, modules: [{ id: "appeal" }, { id: "enrollment" }, { id: "tracking" }] });
    expect(problems).toContain('appeal needs "consentVerified", and nothing before it provides it');
  });
});

describe("exit requires with a variant", () => {
  const forks = forksForScenario(ALL_FORKS, "iAssist_Medical_Transfer");
  const base = IASSIST_RECIPES.iAssist_Medical_Transfer;
  const swap = (variant?: string) => ({
    ...base,
    modules: base.modules.map((m) => (m.id === "pharmacy_selection" ? { id: m.id, ...(variant ? { props: { variant } } : {}) } : m)),
  });

  it("accepts the variant the exit names", () => {
    expect(recipeProblems(base, forks)).toEqual([]);
  });

  it("rejects the module with another variant, or with none", () => {
    for (const variant of ["crm", undefined]) {
      expect(recipeProblems(swap(variant), forks)).toContain('fork "bi" exit "medical_pa_required" requires pharmacy_selection:assigned in the recipe');
    }
  });
});

describe("CRM panels", () => {
  it("only Coverage and the iAssist medical transfer show the benefits panel", () => {
    expect(COASSIST_RECIPES.CoA_Coverage.panels).toEqual(["benefits"]);
    expect(IASSIST_RECIPES.iAssist_Medical_Transfer.panels).toEqual(["benefits"]);
    expect(COASSIST_RECIPES.CoA_DTP.panels).toBeUndefined();
    expect(COASSIST_RECIPES.CoA_Copay.panels).toBeUndefined();
    expect(IASSIST_RECIPES.iAssist_PA_Approved.panels).toBeUndefined();
    expect(IASSIST_RECIPES.iAssist_PAP.panels).toBeUndefined();
  });
});

describe("recipeProblems and forks", () => {
  const dtpForks = forksFor("CoA_DTP");
  const passthrough = { forks: ["bi", "pa"], choices: { bi: "pharmacy_covered", pa: "approved" } };

  it("needs the pa fork for pa_notification", () => {
    const problems = recipeProblems(recipe({ forks: ["bi"], modules: [{ id: "enrollment" }, { id: "pa_notification" }, { id: "tracking" }] }));
    expect(problems).toContain('pa_notification needs "fork:pa", and nothing before it provides it');
  });

  it("rejects a pick of denied without a module that handles a denial", () => {
    const denied = { ...passthrough, choices: { bi: "pharmacy_covered", pa: "denied" } };
    const without = recipe({ ...denied, modules: [{ id: "enrollment" }, { id: "pa_notification" }, { id: "tracking" }] });
    expect(recipeProblems(without, dtpForks)).toContain('fork "pa" exit "denied" requires cash_offer in the recipe');

    const withCashOffer = recipe({ ...denied, modules: [{ id: "enrollment" }, { id: "pa_notification" }, { id: "cash_offer" }, { id: "tracking" }] });
    expect(recipeProblems(withCashOffer, dtpForks)).toEqual([]);
  });

  it("rejects a choice that names no declared fork or exit", () => {
    const badExit = recipe({ ...passthrough, choices: { pa: "maybe" } });
    expect(recipeProblems(badExit, dtpForks)).toContain('fork "pa" has no exit "maybe"');

    const badFork = recipe({ ...passthrough, choices: { nope: "x" } });
    expect(recipeProblems(badFork, dtpForks)).toContain('choice names fork "nope", which is not declared for this scenario');
  });

  it("rejects a fork the scenario does not declare", () => {
    const problems = recipeProblems(recipe({ forks: ["bi", "appeal"], modules: [{ id: "enrollment" }, { id: "tracking" }] }), dtpForks);
    expect(problems).toContain('fork "appeal" is not declared for this scenario');
  });

  it("shares one BI fork across CoAssist, and an exit requires the modules its branch needs", () => {
    const modules: ModuleSpec[] = [{ id: "enrollment" }, { id: "pa_notification" }, { id: "tracking" }];
    for (const bi of ["medical_covered", "pharmacy_transfer"]) {
      const picked = recipe({ ...passthrough, choices: { bi, pa: "approved" }, modules });
      expect(recipeProblems(picked, dtpForks)).toContain(`fork "bi" exit "${bi}" requires provider_transfer in the recipe`);
      const withTransfer = recipe({ ...passthrough, choices: { bi, pa: "approved" }, modules: [...modules.slice(0, -1), { id: "provider_transfer" }, { id: "tracking" }] });
      expect(recipeProblems(withTransfer, dtpForks)).toEqual([]);
    }
    const noCoverage = recipe({ ...passthrough, choices: { bi: "no_coverage", pa: "approved" }, modules });
    expect(recipeProblems(noCoverage, dtpForks)).toContain('fork "bi" exit "no_coverage" requires cash_offer in the recipe');
    // The old exit ids no longer exist on any CoAssist scenario.
    expect(recipeProblems(recipe({ ...passthrough, choices: { bi: "coverage_found" } }), forksFor("CoA_Coverage"))).toContain(
      'fork "bi" has no exit "coverage_found"',
    );
  });
});

describe("recipeProblems", () => {
  it("rejects a module that runs before what it needs", () => {
    const problems = recipeProblems(recipe({ modules: [{ id: "scheduling" }, { id: "enrollment" }, { id: "tracking" }] }));
    expect(problems).toContain('scheduling needs "consentVerified", and nothing before it provides it');
  });

  it("rejects a module whose fork the recipe does not pass through", () => {
    const problems = recipeProblems(recipe({ forks: [], modules: [{ id: "enrollment" }, { id: "cash_offer" }, { id: "tracking" }] }));
    expect(problems).toContain('cash_offer needs "fork:bi", and nothing before it provides it');
  });

  it("rejects a repeated module", () => {
    const problems = recipeProblems(recipe({ modules: [{ id: "enrollment" }, { id: "enrollment" }, { id: "tracking" }] }));
    expect(problems).toContain('module "enrollment" appears twice');
  });

  it("requires tracking to be last", () => {
    const problems = recipeProblems(recipe({ modules: [{ id: "tracking" }, { id: "enrollment" }] }));
    expect(problems).toContain("tracking must be last");
  });

  it("requires scheduling when payment is a mail order", () => {
    const withoutScheduling = recipe({ modules: [{ id: "enrollment" }, { id: "payment", props: { method: "mail_order" } }, { id: "tracking" }] });
    expect(recipeProblems(withoutScheduling)).toContain('payment with {"method":"mail_order"} requires scheduling in the recipe');

    const withScheduling = recipe({
      modules: [{ id: "enrollment" }, { id: "scheduling" }, { id: "payment", props: { method: "mail_order" } }, { id: "tracking" }],
    });
    expect(recipeProblems(withScheduling)).toEqual([]);
  });

  it("does not require scheduling for a retail payment", () => {
    const r = recipe({ modules: [{ id: "enrollment" }, { id: "payment", props: { method: "retail" } }, { id: "tracking" }] });
    expect(recipeProblems(r)).toEqual([]);
  });

  it("reports a source that is not defined yet", () => {
    expect(recipeProblems(recipe({ source: "pes" }))).toEqual(['source "pes" is not defined yet']);
  });
});

describe("Triage rules", () => {
  it("accepts commercial coverage with a pharmacy transfer and no scheduling or payment", () => {
    const r = recipe({
      triage: "commercial",
      modules: [{ id: "enrollment" }, { id: "pharmacy_selection" }, { id: "tracking" }],
    });
    expect(recipeProblems(r)).toEqual([]);
  });

  it("forbids scheduling and payment on a transfer", () => {
    const r = recipe({
      triage: "transfer",
      modules: [{ id: "enrollment" }, { id: "scheduling" }, { id: "payment" }, { id: "tracking" }],
    });
    expect(recipeProblems(r)).toEqual(['triage "transfer" forbids scheduling', 'triage "transfer" forbids payment']);
  });

  it("requires tracking on every exit", () => {
    for (const triage of ["commercial", "non_commercial", "transfer"] as const) {
      expect(recipeProblems(recipe({ triage, modules: [{ id: "enrollment" }] }))).toContain(`triage "${triage}" requires tracking`);
    }
  });

  it("lets the author skip every optional module", () => {
    const r = recipe({ triage: "non_commercial", modules: [{ id: "enrollment" }, { id: "tracking" }] });
    expect(recipeProblems(r)).toEqual([]);
  });
});

describe("iAssist Buy and Bill recipe", () => {
  const forks = forksForScenario(ALL_FORKS, "iAssist_Buy_And_Bill");
  const base = IASSIST_RECIPES.iAssist_Buy_And_Bill;
  const without = (id: string) => ({ ...base, modules: base.modules.filter((m) => m.id !== id) });

  it("is valid, and has no pharmacy, scheduling, payment, or tracking", () => {
    expect(recipeProblems(base, forks)).toEqual([]);
    const ids = base.modules.map((m) => m.id);
    for (const id of ["pharmacy_selection", "scheduling", "payment", "tracking"]) expect(ids).not.toContain(id);
  });

  it("shows the benefits panel, and picks the Buy and Bill BI exit with an approved PA", () => {
    expect(base.panels).toEqual(["benefits"]);
    expect(base.choices).toEqual({ bi: "medical_buy_and_bill", pa: "approved", consent: "patient_text" });
  });

  it("rejects a copay enrollment before the benefits are verified", () => {
    const swapped = { ...base, modules: [base.modules[1], base.modules[0], ...base.modules.slice(2)] };
    expect(recipeProblems(swapped, forks)).toContain('copay needs "benefitsVerified", and nothing before it provides it');
  });

  it("rejects a copay claim with no copay enrollment", () => {
    expect(recipeProblems(without("copay"), forks)).toContain('copay_claim needs "copayEnrolled", and nothing before it provides it');
  });

  it("rejects the Buy and Bill exit without eMedBV or copay in the recipe", () => {
    expect(recipeProblems(without("benefit_verification"), forks)).toContain(
      'fork "bi" exit "medical_buy_and_bill" requires benefit_verification in the recipe',
    );
    expect(recipeProblems(without("copay"), forks)).toContain('fork "bi" exit "medical_buy_and_bill" requires copay in the recipe');
  });
});

describe("iAssist Buy and Bill, free drug (PAP) recipe", () => {
  const forks = forksForScenario(ALL_FORKS, "iAssist_Buy_And_Bill_PAP");
  const base = IASSIST_RECIPES.iAssist_Buy_And_Bill_PAP;
  const without = (id: string) => ({ ...base, modules: base.modules.filter((m) => m.id !== id) });

  it("is valid, with no copay, PA, or payment", () => {
    expect(recipeProblems(base, forks)).toEqual([]);
    const ids = base.modules.map((m) => m.id);
    for (const id of ["copay", "copay_claim", "pa_notification", "payment"]) expect(ids).not.toContain(id);
  });

  it("picks the no coverage BI exit, and passes through the bi fork only", () => {
    expect(base.choices).toEqual({ bi: "no_coverage" });
    expect(forks.map((f) => f.id)).toEqual(["bi"]);
  });

  it("rejects the no coverage exit without financial assistance", () => {
    expect(recipeProblems(without("financial_assistance"), forks)).toContain('fork "bi" exit "no_coverage" requires financial_assistance in the recipe');
  });
});
