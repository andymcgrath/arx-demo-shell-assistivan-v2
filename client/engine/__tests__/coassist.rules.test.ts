import { describe, it, expect } from "vitest";
import { COASSIST_RULES } from "@/workflows/coassist/rules";
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
const FLOWS = ["CoA_DTP", "CoA_Copay", "CoA_DME"] as const;

describe("CoAssist rule table", () => {
  it("gives every rule a unique id", () => {
    const ids = COASSIST_RULES.map((r) => r.id);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the rule order for each event, and where each rule applies", () => {
    const order: Record<string, string[]> = {};
    for (const rule of COASSIST_RULES) (order[rule.on] ??= []).push(rule.id!);

    const applies: Record<string, string[]> = {};
    for (const rule of COASSIST_RULES) {
      applies[rule.id!] = FLOWS.filter((flow) => !rule.scenarios || rule.scenarios.includes(flow));
    }

    expectMatchesFixture("rules/coassist", { order, applies });
  });
});
