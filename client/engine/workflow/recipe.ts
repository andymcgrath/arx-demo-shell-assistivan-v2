import {
  MODULE_CONTRACTS,
  SOURCES,
  TRIAGE_EXIT_RULES,
  type ModuleId,
  type ScenarioRecipe,
  type TriageModuleId,
} from "./components";
import type { ForkDefinition } from "./types";

/**
 * Pure checks for a scenario recipe. No React, no store, no machine. A recipe that fails here cannot work,
 * so the test fails before the demo does. An empty list means the recipe is valid.
 *
 * What it enforces:
 * - every module exists, and appears once
 * - each module's needs are provided by the source, a fork, or a module earlier in the recipe
 * - `needsModules` appear earlier, and `requiresModulesWhen` appear somewhere
 * - tracking comes last
 * - the Triage exit's rules: required modules are present, forbidden ones are absent
 * - when `forks` is passed (the forks that apply to this scenario): every fork the recipe names is declared,
 *   every choice names a declared exit, and the recipe includes the modules that exit `requires`
 */
export function recipeProblems(recipe: ScenarioRecipe, forks?: ForkDefinition[]): string[] {
  const problems: string[] = [];
  const source = SOURCES[recipe.source];
  if (!source) return [`source "${recipe.source}" is not defined yet`];

  const provided = new Set<string>([...source.provides, ...recipe.forks.map((f) => `fork:${f}`)]);
  const ids = recipe.modules.map((m) => m.id);
  const seen: ModuleId[] = [];

  recipe.modules.forEach((spec, i) => {
    const contract = MODULE_CONTRACTS[spec.id];
    if (!contract) {
      problems.push(`unknown module "${spec.id}"`);
      return;
    }
    if (seen.includes(spec.id)) problems.push(`module "${spec.id}" appears twice`);

    for (const key of contract.needs) {
      if (!provided.has(key)) problems.push(`${spec.id} needs "${key}", and nothing before it provides it`);
    }
    for (const m of contract.needsModules ?? []) {
      if (!seen.includes(m)) problems.push(`${spec.id} needs ${m} earlier in the recipe`);
    }
    for (const rule of contract.requiresModulesWhen ?? []) {
      const matches = Object.entries(rule.props).every(([k, v]) => spec.props?.[k] === v);
      if (!matches) continue;
      for (const m of rule.modules) {
        if (!ids.includes(m)) problems.push(`${spec.id} with ${JSON.stringify(rule.props)} requires ${m} in the recipe`);
      }
    }
    if (spec.id === "tracking" && i !== recipe.modules.length - 1) problems.push("tracking must be last");

    seen.push(spec.id);
    for (const key of contract.sets) provided.add(key);
  });

  if (recipe.triage) {
    const rules = TRIAGE_EXIT_RULES[recipe.triage];
    for (const [id, rule] of Object.entries(rules) as [TriageModuleId, string][]) {
      if (rule === "required" && !ids.includes(id)) problems.push(`triage "${recipe.triage}" requires ${id}`);
      if (rule === "forbidden" && ids.includes(id)) problems.push(`triage "${recipe.triage}" forbids ${id}`);
    }
  }

  if (forks) {
    for (const id of recipe.forks) {
      if (!forks.some((f) => f.id === id)) problems.push(`fork "${id}" is not declared for this scenario`);
    }
    for (const [forkId, exitId] of Object.entries(recipe.choices)) {
      const fork = forks.find((f) => f.id === forkId);
      if (!fork) {
        problems.push(`choice names fork "${forkId}", which is not declared for this scenario`);
        continue;
      }
      const exit = fork.exits.find((e) => e.id === exitId);
      if (!exit) {
        problems.push(`fork "${forkId}" has no exit "${exitId}"`);
        continue;
      }
      for (const m of exit.requires ?? []) {
        // `module:variant` needs that module with that `variant` prop. A bare module id needs the module.
        const [moduleId, variant] = m.split(":");
        const found = recipe.modules.some((spec) => spec.id === moduleId && (variant === undefined || spec.props?.variant === variant));
        if (!found) problems.push(`fork "${forkId}" exit "${exitId}" requires ${m} in the recipe`);
      }
    }
  }

  return problems;
}
