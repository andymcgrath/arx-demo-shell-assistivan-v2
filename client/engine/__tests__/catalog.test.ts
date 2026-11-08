import { describe, it, expect } from "vitest";
import { MODULE_CONTRACTS, type ModuleId } from "@/engine/workflow/components";
import { COASSIST_RECIPES, COA_COMMERCIAL_TRANSFER_RECIPE } from "@/workflows/coassist/recipes";
import { IASSIST_RECIPES } from "@/workflows/iassist/recipes";
import { ALL_FORKS } from "@/workflows/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import {
  CATALOG_BLOCKS,
  CATALOG_FORKS,
  CATALOG_WHOLE_DEMOS,
  blockContract,
  blockVariant,
  catalogExit,
  catalogFork,
  type Draftable,
} from "@/workflows/catalog";

/**
 * The Demo Lab reads the catalog, so every block a recipe uses and every fork exit needs an entry. A new module,
 * variant, or exit without sales wording fails here, not in the lab.
 */

const RECIPES = [...Object.values(COASSIST_RECIPES), COA_COMMERCIAL_TRANSFER_RECIPE, ...Object.values(IASSIST_RECIPES)];
const modulesInRecipes = new Set<ModuleId>(RECIPES.flatMap((r) => r.modules.map((m) => m.id)));

describe("catalog blocks", () => {
  it("has an entry for every module a recipe uses, under its own id", () => {
    for (const id of modulesInRecipes) {
      const entry = CATALOG_BLOCKS[id];
      expect(entry, `no catalog entry for module "${id}"`).toBeDefined();
      expect(entry.id).toBe(id);
    }
  });

  it("has an entry for every module in the contract list, and none for a module that does not exist", () => {
    expect(Object.keys(CATALOG_BLOCKS).sort()).toEqual(Object.keys(MODULE_CONTRACTS).sort());
  });

  it("has an entry for every variant a recipe uses", () => {
    for (const r of RECIPES) {
      for (const m of r.modules) {
        const variant = m.props?.variant;
        if (typeof variant !== "string") continue;
        expect(blockVariant(CATALOG_BLOCKS[m.id], variant), `no catalog variant "${variant}" on block "${m.id}"`).toBeDefined();
      }
    }
  });

  it("gives every block sales text, an app, and an alias", () => {
    for (const b of Object.values(CATALOG_BLOCKS)) {
      expect(b.name.trim(), b.id).not.toBe("");
      expect(b.summary.trim(), b.id).not.toBe("");
      expect(b.apps.length, b.id).toBeGreaterThan(0);
      expect(b.aliases.length, b.id).toBeGreaterThan(0);
      for (const v of b.variants ?? []) {
        expect(v.label.trim(), `${b.id}:${v.id}`).not.toBe("");
        expect(v.summary.trim(), `${b.id}:${v.id}`).not.toBe("");
      }
    }
  });

  it("reads needs and sets from the module contract", () => {
    for (const id of modulesInRecipes) {
      expect(blockContract(id).sets).toEqual(MODULE_CONTRACTS[id].sets);
      expect(blockContract(id).needs).toEqual(MODULE_CONTRACTS[id].needs);
    }
  });

  it("keeps an alias on one block only, so a palette search has one answer", () => {
    const seen = new Map<string, string>();
    for (const b of Object.values(CATALOG_BLOCKS)) {
      for (const a of b.aliases) {
        const key = a.toLowerCase();
        expect(seen.get(key) ?? b.id, `alias "${a}" is on both ${seen.get(key)} and ${b.id}`).toBe(b.id);
        seen.set(key, b.id);
      }
    }
  });
});

describe("catalog forks and exits", () => {
  const exitsByFork = (id: string) => [...new Set(ALL_FORKS.filter((f) => f.id === id).flatMap((f) => f.exits.map((e) => e.id)))];
  const forkIds = [...new Set(ALL_FORKS.map((f) => f.id))];

  it("has an entry for every declared fork and every exit", () => {
    for (const id of forkIds) {
      expect(catalogFork(id), `no catalog entry for fork "${id}"`).toBeDefined();
      for (const exit of exitsByFork(id)) {
        expect(catalogExit(id, exit), `no catalog entry for fork "${id}" exit "${exit}"`).toBeDefined();
      }
    }
  });

  it("has no entry for a fork or exit that is not declared", () => {
    for (const f of CATALOG_FORKS) {
      expect(forkIds, `catalog fork "${f.id}" is not declared`).toContain(f.id);
      for (const e of f.exits) expect(exitsByFork(f.id), `catalog exit "${f.id}.${e.id}" is not declared`).toContain(e.id);
    }
  });

  it("gives every exit a label, a description, and an alias, and lists its required blocks from the fork", () => {
    for (const id of forkIds) {
      for (const exit of exitsByFork(id)) {
        const c = catalogExit(id, exit)!;
        expect(c.label.trim(), `${id}.${exit}`).not.toBe("");
        expect(c.description.trim(), `${id}.${exit}`).not.toBe("");
        expect(c.aliases.length, `${id}.${exit}`).toBeGreaterThan(0);
        const declared = ALL_FORKS.filter((f) => f.id === id).flatMap((f) => f.exits).find((e) => e.id === exit)!;
        expect(c.requires).toEqual(declared.requires ?? []);
      }
    }
  });

  it("has every module an exit requires in the block catalog", () => {
    for (const f of ALL_FORKS) {
      for (const e of f.exits) {
        for (const req of e.requires ?? []) expect(CATALOG_BLOCKS[req.split(":")[0] as ModuleId], `${f.id}.${e.id} requires "${req}"`).toBeDefined();
      }
    }
  });
});

describe("catalog whole demos", () => {
  it("lists every scenario that has no recipe, and no scenario that has one", () => {
    const noRecipe = ALL_SCENARIOS.filter((s) => !s.recipe).map((s) => s.flowType).sort();
    expect(CATALOG_WHOLE_DEMOS.map((d) => d.flowType).sort()).toEqual(noRecipe);
  });

  it("marks the legacy scenario in its name", () => {
    for (const s of ALL_SCENARIOS.filter((x) => x.legacy)) {
      expect(CATALOG_WHOLE_DEMOS.find((d) => d.flowType === s.flowType)?.name).toMatch(/legacy/i);
    }
  });
});

describe("catalog drafts", () => {
  const all: { where: string; entry: Draftable }[] = [
    ...Object.values(CATALOG_BLOCKS).flatMap((b) => [{ where: `block ${b.id}`, entry: b as Draftable }, ...(b.variants ?? []).map((v) => ({ where: `block ${b.id} variant ${v.id}`, entry: v as Draftable }))]),
    ...CATALOG_FORKS.flatMap((f) => [{ where: `fork ${f.id}`, entry: f as Draftable }, ...f.exits.map((e) => ({ where: `exit ${f.id}.${e.id}`, entry: e as Draftable }))]),
    ...CATALOG_WHOLE_DEMOS.map((d) => ({ where: `demo ${d.flowType}`, entry: d as Draftable })),
  ];

  it("gives every draft a question, and every question a draft", () => {
    for (const { where, entry } of all) {
      expect(!!entry.draft, `${where}: draft and question must go together`).toBe(!!entry.question?.trim());
    }
  });

  // The tag step runs `CATALOG_NO_DRAFTS=1 pnpm test`. A draft the user has not cleared fails it.
  it.runIf(process.env.CATALOG_NO_DRAFTS)("has no entry still marked draft", () => {
    expect(all.filter((a) => a.entry.draft).map((a) => a.where)).toEqual([]);
  });
});
