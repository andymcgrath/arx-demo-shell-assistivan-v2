import { describe, it, expect } from "vitest";
import type { ScenarioRecipe } from "@/engine/workflow/components";
import { inScope, ruleAppliesTo, scopeProblems } from "@/engine/workflow/scope";
import type { ForkDefinition, Rule, ScenarioDefinition } from "@/engine/workflow/types";

/** Where a rule applies is derived from the recipe and the forks. These tests use small synthetic scenarios. */
const recipe = (modules: ScenarioRecipe["modules"]): ScenarioRecipe => ({ source: "coassist", forks: [], choices: {}, modules });

const scenario = (flowType: string, modules?: ScenarioRecipe["modules"]): ScenarioDefinition<any> =>
  ({ flowType, intake: "erx", content: {}, ...(modules ? { recipe: recipe(modules) } : {}) }) as any;

const fork = (id: string, exits: string[], scenarios?: string[]): ForkDefinition =>
  ({
    id,
    label: id,
    chooser: "story",
    scenarios,
    exits: exits.map((e) => ({ id: e, label: e, data: {} })),
    resolved: () => false,
  }) as any;

const rule = (extra: Partial<Rule>): Rule => ({ on: "EVENT", ...extra });

describe("module scope", () => {
  const withCash = scenario("A", [{ id: "cash_offer", props: { variant: "sms" } }]);
  const withoutCash = scenario("B", [{ id: "enrollment" }]);

  it("applies to a scenario whose recipe lists the module", () => {
    expect(inScope({ module: "cash_offer" }, withCash, [])).toBe(true);
    expect(inScope({ module: "cash_offer" }, withoutCash, [])).toBe(false);
  });

  it("matches props, so one module can scope different rules to different variants", () => {
    expect(inScope({ module: "cash_offer", props: { variant: "sms" } }, withCash, [])).toBe(true);
    expect(inScope({ module: "cash_offer", props: { variant: "pa_denied" } }, withCash, [])).toBe(false);
  });

  it("never applies to a scenario with no recipe", () => {
    expect(inScope({ module: "cash_offer" }, scenario("C"), [])).toBe(false);
  });
});

describe("scope list", () => {
  const forks = [fork("bi", ["coverage_found"], ["A", "B"]), fork("bi", ["pharmacy_covered"], ["C"])];
  const a = scenario("A", [{ id: "scheduling" }]);
  const b = scenario("B", [{ id: "enrollment" }]);
  const c = scenario("C", [{ id: "scheduling" }]);
  const both = [{ module: "scheduling" }, { fork: "bi", exit: "coverage_found" }];

  it("needs every scope in the list to hold", () => {
    expect(inScope(both, a, forks)).toBe(true);
    // B has the branch but not the module. C has the module but not the branch.
    expect(inScope(both, b, forks)).toBe(false);
    expect(inScope(both, c, forks)).toBe(false);
  });

  it("flags a list no scenario satisfies, even when each part is real", () => {
    const unsatisfiable = rule({ id: "r.x", scope: [{ module: "scheduling" }, { fork: "bi", exit: "pharmacy_covered" }] });
    expect(scopeProblems([unsatisfiable], [a, b], forks)).toEqual([`rule "r.x" has a scope list that no scenario satisfies`]);
    expect(scopeProblems([unsatisfiable], [a, b, c], forks)).toEqual([]);
  });
});

describe("fork scope", () => {
  const forks = [fork("bi", ["coverage_found", "no_coverage"], ["A"]), fork("bi", ["pharmacy_covered"], ["B"]), fork("pa", ["approved", "denied"])];

  it("applies where the fork applies", () => {
    expect(inScope({ fork: "pa" }, scenario("A"), forks)).toBe(true);
    expect(inScope({ fork: "nope" }, scenario("A"), forks)).toBe(false);
  });

  it("picks the fork that belongs to the scenario when two share an id", () => {
    expect(inScope({ fork: "bi", exit: "coverage_found" }, scenario("A"), forks)).toBe(true);
    expect(inScope({ fork: "bi", exit: "coverage_found" }, scenario("B"), forks)).toBe(false);
    expect(inScope({ fork: "bi", exit: "pharmacy_covered" }, scenario("B"), forks)).toBe(true);
  });
});

describe("ruleAppliesTo", () => {
  it("applies to every scenario when the rule has no scenarios and no scope", () => {
    expect(ruleAppliesTo(rule({}), scenario("A"), [])).toBe(true);
  });

  it("still honors a hand-written scenarios list, for workflows with no recipes", () => {
    expect(ruleAppliesTo(rule({ scenarios: ["A"] as any }), scenario("A"), [])).toBe(true);
    expect(ruleAppliesTo(rule({ scenarios: ["A"] as any }), scenario("B"), [])).toBe(false);
  });

  it("needs both to pass when a rule sets both", () => {
    const r = rule({ scenarios: ["A"] as any, scope: { module: "cash_offer" } });
    expect(ruleAppliesTo(r, scenario("A", [{ id: "cash_offer" }]), [])).toBe(true);
    expect(ruleAppliesTo(r, scenario("A", [{ id: "enrollment" }]), [])).toBe(false);
    expect(ruleAppliesTo(r, scenario("B", [{ id: "cash_offer" }]), [])).toBe(false);
  });
});

describe("scopeProblems", () => {
  const scenarios = [scenario("A", [{ id: "cash_offer", props: { variant: "sms" } }])];
  const forks = [fork("pa", ["approved", "denied"])];

  it("is empty when every scope names something real", () => {
    const rules = [
      rule({ id: "r1", scope: { fork: "pa", exit: "denied" } }),
      rule({ id: "r2", scope: { module: "cash_offer", props: { variant: "sms" } } }),
      rule({ id: "r3" }),
    ];
    expect(scopeProblems(rules, scenarios, forks)).toEqual([]);
  });

  it("reports a fork, an exit, or a module that nothing declares", () => {
    const rules = [
      rule({ id: "r1", scope: { fork: "nope" } }),
      rule({ id: "r2", scope: { fork: "pa", exit: "maybe" } }),
      rule({ id: "r3", scope: { module: "payment" } }),
      rule({ id: "r4", scope: { module: "cash_offer", props: { variant: "pa_denied" } } }),
    ];
    expect(scopeProblems(rules, scenarios, forks)).toHaveLength(4);
  });
});
