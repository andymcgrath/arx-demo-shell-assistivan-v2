import { describe, it, expect, afterEach } from "vitest";
import { draftFromScenario, moveCard, removeCard } from "@/workflows/catalog/editor";
import { planApply } from "@/workflows/catalog/apply";
import { composeRecipe, setRecipeOverride, recipeOverrideFor } from "@/engine/workflow/recipeOverride";
import { recipeProblems } from "@/engine/workflow/recipe";
import { forksForScenario } from "@/engine/workflow/forks";
import { forksForFlow } from "@/workflows/forks";
import { scenarioFor } from "@/workflows/scenarios";
import { END_STATES, SCENARIOS } from "./scenarios";
import { ctx, runSteps, startFlow } from "./harness";
import type { DemoRequest } from "@/workflows/catalog/request";

/**
 * A demo can run its own blocks on an existing scenario (BrandDemo.recipe). The scenario supplies content and forks.
 * The Copay scenario without its cash offer is the case that started this: the story walks an approved PA, so a
 * cash offer after a denial has no place in it.
 */

const filled = (d: DemoRequest): DemoRequest => ({
  ...d,
  client: "acme",
  slug: "acme-demo",
  brand: { name: "Acme", drug: "Acmedrug", documents: [] },
  winTheme: "One eRx starts everything",
  demos: d.demos.map((x, i) => ({ ...x, id: `demo-${i + 1}`, label: x.label || `Demo ${i + 1}` })),
});

const copay = () => filled(draftFromScenario("CoA_Copay", { title: "Acme" })!);
const withoutCashOffer = () => {
  const d = copay();
  return removeCard(d, d.cards.findIndex((c) => c.kind === "block" && c.moduleId === "cash_offer"));
};

afterEach(() => setRecipeOverride("CoA_Copay", undefined));

describe("planApply with blocks no recipe has", () => {
  it("runs them on the closest scenario and writes the blocks into the demo", () => {
    const plan = planApply(withoutCashOffer(), undefined, "parent-brand");
    expect(plan.ok, plan.ok ? "" : plan.problems.join()).toBe(true);
    if (!plan.ok) return;
    expect(plan.composed).toBe(true);
    expect(plan.flow).toBe("CoA_Copay");
    const modules = plan.demos[0].recipe?.modules.map((m) => m.id) ?? [];
    expect(modules).not.toContain("cash_offer");
    expect(modules).toContain("financial_assistance");
    expect(plan.notes.join()).toContain("its own block list");
  });

  it("writes no recipe when an existing one matches", () => {
    const plan = planApply(copay(), undefined, "parent-brand");
    expect(plan.ok && plan.composed).toBe(false);
    expect(plan.ok && plan.demos[0].recipe).toBeUndefined();
  });

  it("rejects an order the blocks cannot run in", () => {
    // Enrollment provides the referral the other blocks need. Moved two places down, the notification before it runs without it.
    const d = copay();
    const plan = planApply(moveCard(moveCard(d, 0, 1), 1, 1), undefined, "parent-brand");
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.problems.join()).toContain('needs "Patient onboarding" before it');
  });

  it("rejects a fork no scenario with that intake declares", () => {
    const plan = planApply({ ...withoutCashOffer(), forks: ["bi", "pa", "no_such_fork"] }, undefined, "parent-brand");
    expect(plan.ok).toBe(false);
  });

  it("writes a recipe that passes the same checks the brand test runs", () => {
    const plan = planApply(withoutCashOffer(), undefined, "parent-brand");
    if (!plan.ok) throw new Error(plan.problems.join());
    const base = scenarioFor("CoA_Copay")!.recipe!;
    const run = composeRecipe(base, plan.demos[0].recipe!);
    expect(recipeProblems({ ...run, choices: { ...base.choices, ...plan.demos[0].choices } }, forksForScenario(forksForFlow("CoA_Copay"), "CoA_Copay"))).toEqual([]);
  });
});

describe("a demo's blocks reach the machine", () => {
  const composedRecipe = () => {
    const plan = planApply(withoutCashOffer(), undefined, "parent-brand");
    if (!plan.ok) throw new Error(plan.problems.join());
    return plan.demos[0].recipe!;
  };

  it("replaces the recipe every lookup reads, and puts it back when cleared", () => {
    expect(scenarioFor("CoA_Copay")!.recipe!.modules.some((m) => m.id === "cash_offer")).toBe(true);
    setRecipeOverride("CoA_Copay", composedRecipe());
    expect(scenarioFor("CoA_Copay")!.recipe!.modules.some((m) => m.id === "cash_offer")).toBe(false);
    // The scenario's own source, panels, and content stay.
    expect(scenarioFor("CoA_Copay")!.recipe!.source).toBe("coassist");
    setRecipeOverride("CoA_Copay", undefined);
    expect(recipeOverrideFor("CoA_Copay")).toBeUndefined();
    expect(scenarioFor("CoA_Copay")!.recipe!.modules.some((m) => m.id === "cash_offer")).toBe(true);
  });

  it("still reaches the named end state on the approved-PA path", () => {
    setRecipeOverride("CoA_Copay", composedRecipe());
    const scenario = SCENARIOS.find((s) => s.name === "coa-copay-direct-retail")!;
    const actor = startFlow("CoA_Copay");
    const records = runSteps(actor, scenario.steps);
    expect(END_STATES[scenario.endsAt](ctx(actor).workflowData as any)).toBe(true);
    expect(records.filter((r) => !r.accepted).map((r) => r.event)).toEqual([]);
  });

  it("rejects the event of a block the demo left out", () => {
    // DENY_PA belongs to the cash offer after a denied PA. The stock Copay scenario accepts it while the PA is submitted.
    const path = [
      { type: "REFERRAL_RECEIVED" }, { type: "VERIFY_SMS" }, { type: "VERIFY_OTP" }, { type: "CONFIRM_CONSENT" },
      { type: "COMPLETE_BI", result: "coverage_found" },
    ];
    const stock = startFlow("CoA_Copay");
    runSteps(stock, path);
    expect(stock.getSnapshot().can({ type: "DENY_PA" } as any)).toBe(true);

    setRecipeOverride("CoA_Copay", composedRecipe());
    const demo = startFlow("CoA_Copay");
    runSteps(demo, path);
    expect(demo.getSnapshot().can({ type: "DENY_PA" } as any)).toBe(false);
  });
});
