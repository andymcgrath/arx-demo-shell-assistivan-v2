import { describe, it, expect } from "vitest";
import { IASSIST_RULES } from "@/workflows/iassist/rules";
import { IASSIST_FORKS } from "@/workflows/iassist/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { ruleAppliesTo, scopeProblems } from "@/engine/workflow/scope";
import { expectMatchesFixture } from "./harness";

/**
 * The iAssist rule table, recorded by id. Same idea as coassist.rules.test.ts.
 *
 * XState takes the first matching rule per event, and a rule's scope decides who gets it. Moving rules into module
 * files (docs/plans/PLAN_STEP4.md, 4.3) must not reorder them or re-scope them. This test records two things:
 *
 * - `order`: the rule ids for each event, in the order the machine tries them
 * - `applies`: for each rule id, the scenarios it applies to
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */
const FLOWS = ["iAssist_PA_Approved", "iAssist_PAP", "iAssist_Medical_Transfer"] as const;

const scenarioFor = (flow: (typeof FLOWS)[number]) => ALL_SCENARIOS.find((s) => s.flowType === flow)!;

const sortKeys = <T,>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

describe("iAssist rule table", () => {
  it("gives every rule a unique id", () => {
    const ids = IASSIST_RULES.map((r) => r.id);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("derives where each rule applies and lists no scenarios by hand", () => {
    expect(IASSIST_RULES.filter((r) => r.scenarios !== undefined).map((r) => r.id)).toEqual([]);
  });

  it("scopes every rule to a fork, exit, or module that exists", () => {
    expect(scopeProblems(IASSIST_RULES, FLOWS.map(scenarioFor), IASSIST_FORKS)).toEqual([]);
  });

  it("keeps the rule order for each event, and where each rule applies", () => {
    const order: Record<string, string[]> = {};
    for (const rule of IASSIST_RULES) (order[rule.on] ??= []).push(rule.id!);

    const applies: Record<string, string[]> = {};
    for (const rule of IASSIST_RULES) {
      applies[rule.id!] = FLOWS.filter((flow) => ruleAppliesTo(rule, scenarioFor(flow), IASSIST_FORKS));
    }

    expectMatchesFixture("rules/iassist", { order: sortKeys(order), applies: sortKeys(applies) });
  });
});
