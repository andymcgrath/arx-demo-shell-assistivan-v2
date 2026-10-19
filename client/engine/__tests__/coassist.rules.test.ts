import { describe, it, expect } from "vitest";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
import { COASSIST_FORKS } from "@/workflows/coassist/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { ruleAppliesTo, scopeProblems } from "@/engine/workflow/scope";
import { expectMatchesFixture } from "./harness";

/**
 * The CoAssist rule table, recorded by id.
 *
 * XState takes the first matching rule per event, and a rule's `scenarios` filter decides who gets it. Moving rules
 * into module files (PLAN_STEP2.md, 2.4) must not reorder them or re-scope them. This test records two things:
 *
 * - `order`: the rule ids for each event, in the order the machine tries them
 * - `applies`: for each rule id, the scenarios it applies to
 *
 * An intentional change? Run `RECORD=1 pnpm test`, read the fixture diff, and commit it with the change.
 */
const FLOWS = ["CoA_DTP", "CoA_Copay", "CoA_Coverage"] as const;

const scenarioFor = (flow: (typeof FLOWS)[number]) => ALL_SCENARIOS.find((s) => s.flowType === flow)!;

const sortKeys = <T,>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

describe("CoAssist rule table", () => {
  it("gives every rule a unique id", () => {
    const ids = COASSIST_RULES.map((r) => r.id);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("derives where each rule applies and lists no scenarios by hand", () => {
    expect(COASSIST_RULES.filter((r) => r.scenarios !== undefined).map((r) => r.id)).toEqual([]);
  });

  it("scopes every rule to a fork, exit, or module that exists", () => {
    expect(scopeProblems(COASSIST_RULES, FLOWS.map(scenarioFor), COASSIST_FORKS)).toEqual([]);
  });

  it("keeps the rule order for each event, and where each rule applies", () => {
    const order: Record<string, string[]> = {};
    for (const rule of COASSIST_RULES) (order[rule.on] ??= []).push(rule.id!);

    const applies: Record<string, string[]> = {};
    for (const rule of COASSIST_RULES) {
      applies[rule.id!] = FLOWS.filter((flow) => ruleAppliesTo(rule, scenarioFor(flow), COASSIST_FORKS));
    }

    // Sort the keys, so moving a rule between module files does not reshuffle the fixture. Only the ids inside
    // each event's list keep their order: that order is what the machine tries.
    expectMatchesFixture("rules/coassist", { order: sortKeys(order), applies: sortKeys(applies) });
  });
});
