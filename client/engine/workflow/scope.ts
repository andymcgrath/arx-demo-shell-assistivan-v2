import { forkApplies } from "./forks";
import type { ForkDefinition, Rule, RuleScope, ScenarioDefinition, Scope } from "./types";

/**
 * Pure checks for where a rule applies. No React, no store, no machine, so the factory and the tests use the
 * same answer. A rule's `scope` reads the scenario's recipe and the declared forks. It replaces a hand-written
 * `scenarios` list, which could drift from the recipe.
 */

const propsMatch = (have: Record<string, unknown> | undefined, want: Record<string, unknown> | undefined) =>
  !want || Object.entries(want).every(([key, value]) => have?.[key] === value);

const listOf = (scope: Scope): RuleScope[] => (Array.isArray(scope) ? scope : [scope]);

/** True when the scenario falls inside the scope. A list of scopes needs all of them. */
export function inScope(scope: Scope, scenario: ScenarioDefinition<any>, forks: ForkDefinition[]): boolean {
  return listOf(scope).every((one) => inOneScope(one, scenario, forks));
}

function inOneScope(scope: RuleScope, scenario: ScenarioDefinition<any>, forks: ForkDefinition[]): boolean {
  if ("module" in scope) {
    return !!scenario.recipe?.modules.some((m) => m.id === scope.module && propsMatch(m.props, scope.props));
  }
  const fork = forks.find((f) => f.id === scope.fork && forkApplies(f, scenario.flowType));
  return !!fork && (!scope.exit || fork.exits.some((e) => e.id === scope.exit));
}

/** True when the rule applies to the scenario. A rule with no `scenarios` and no `scope` applies to all of them. */
export function ruleAppliesTo(rule: Rule<any, any>, scenario: ScenarioDefinition<any>, forks: ForkDefinition[]): boolean {
  if (rule.scenarios && !rule.scenarios.includes(scenario.flowType)) return false;
  return !rule.scope || inScope(rule.scope, scenario, forks);
}

/**
 * Problems with the scopes in a rule table: a scope that names a fork no workflow declares, or a module no
 * recipe lists, can never apply. Empty when every scope names something real.
 */
export function scopeProblems(rules: Rule<any, any>[], scenarios: ScenarioDefinition<any>[], forks: ForkDefinition[]): string[] {
  const problems: string[] = [];
  for (const rule of rules) {
    if (!rule.scope) continue;
    const name = rule.id ?? rule.on;
    for (const scope of listOf(rule.scope)) {
      if ("fork" in scope) {
        const declared = forks.filter((f) => f.id === scope.fork);
        if (!declared.length) problems.push(`rule "${name}" is scoped to fork "${scope.fork}", which no fork declares`);
        else if (scope.exit && !declared.some((f) => f.exits.some((e) => e.id === scope.exit))) {
          problems.push(`rule "${name}" is scoped to exit "${scope.exit}", which fork "${scope.fork}" does not have`);
        }
      } else if (!scenarios.some((s) => inScope(scope, s, forks))) {
        problems.push(`rule "${name}" is scoped to module "${scope.module}", which no scenario recipe lists with those props`);
      }
    }
    // A list that no scenario satisfies together can never apply, even when each part is real.
    if (Array.isArray(rule.scope) && !scenarios.some((s) => inScope(rule.scope!, s, forks))) {
      problems.push(`rule "${name}" has a scope list that no scenario satisfies`);
    }
  }
  return problems;
}
