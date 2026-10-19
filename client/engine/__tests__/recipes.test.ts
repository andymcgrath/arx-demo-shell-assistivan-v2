import { describe, it, expect } from "vitest";
import { MODULE_CONTRACTS, type ScenarioRecipe } from "@/engine/workflow/components";
import { recipeProblems } from "@/engine/workflow/recipe";
import { COASSIST_RECIPES } from "@/workflows/coassist/recipes";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";

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

describe("CoAssist recipes", () => {
  for (const [flowType, r] of Object.entries(COASSIST_RECIPES)) {
    it(`${flowType} is a valid recipe`, () => {
      expect(recipeProblems(r)).toEqual([]);
    });
  }

  it("every module a recipe names is in the catalog", () => {
    for (const r of Object.values(COASSIST_RECIPES)) {
      for (const m of r.modules) expect(MODULE_CONTRACTS[m.id]).toBeDefined();
    }
  });

  it("a recipe's starting choices name declared forks and exits", () => {
    const forks = new Map(COASSIST_FORKS.map((f) => [f.id, f]));
    for (const r of Object.values(COASSIST_RECIPES)) {
      for (const [forkId, exitId] of Object.entries(r.choices)) {
        const fork = forks.get(forkId);
        expect(fork, `fork ${forkId}`).toBeDefined();
        expect(fork!.exits.map((e) => e.id)).toContain(exitId);
      }
    }
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
