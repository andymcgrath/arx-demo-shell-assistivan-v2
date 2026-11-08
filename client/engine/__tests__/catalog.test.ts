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
  paletteCards,
  DEFAULT_VARIANT,
  CATALOG_PAYERS,
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

  it("has an entry for every variant a recipe uses, and a default entry where a block with variants is used plain", () => {
    for (const r of RECIPES) {
      for (const m of r.modules) {
        const block = CATALOG_BLOCKS[m.id];
        const variant = typeof m.props?.variant === "string" ? m.props.variant : DEFAULT_VARIANT;
        if (!block.variants && variant === DEFAULT_VARIANT) continue;
        expect(blockVariant(block, variant), `no catalog variant "${variant}" on block "${m.id}"`).toBeDefined();
      }
    }
  });

  it("gives every step a label", () => {
    for (const b of Object.values(CATALOG_BLOCKS)) {
      for (const list of [b.steps, ...(b.variants ?? []).map((v) => v.steps)]) {
        for (const st of list ?? []) expect(st.label.trim(), `${b.id} step`).not.toBe("");
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

});

/** Aliases are unique within one kind and may repeat across kinds: the palette groups results by kind. */
const duplicates = (entries: { key: string; aliases: string[] }[]): string[] => {
  const seen = new Map<string, string>();
  const dup: string[] = [];
  for (const { key, aliases } of entries) {
    for (const a of aliases) {
      const alias = a.toLowerCase();
      if (seen.has(alias) && seen.get(alias) !== key) dup.push(`"${a}" is on both ${seen.get(alias)} and ${key}`);
      seen.set(alias, key);
    }
  }
  return dup;
};

describe("catalog aliases", () => {
  it("are unique across blocks", () => {
    expect(duplicates(Object.values(CATALOG_BLOCKS).map((b) => ({ key: b.id, aliases: b.aliases })))).toEqual([]);
  });

  it("are unique across whole demos", () => {
    expect(duplicates(CATALOG_WHOLE_DEMOS.map((d) => ({ key: d.flowType, aliases: d.aliases })))).toEqual([]);
  });

  it("are unique across fork ids", () => {
    expect(duplicates(CATALOG_FORKS.map((f) => ({ key: f.id, aliases: f.aliases })))).toEqual([]);
  });

  it("are unique across the exits of one fork", () => {
    for (const f of CATALOG_FORKS) expect(duplicates(f.exits.map((e) => ({ key: `${f.id}.${e.id}`, aliases: e.aliases }))), f.id).toEqual([]);
  });

  it("may repeat across kinds", () => {
    expect(CATALOG_BLOCKS.benefit_verification.aliases).toContain("benefit verification");
    expect(CATALOG_FORKS.find((f) => f.id === "bi")!.aliases).toContain("benefit verification");
  });
});

describe("catalog palette cards", () => {
  const cards = Object.values(CATALOG_BLOCKS).flatMap(paletteCards);

  it("returns one card per variant, or one card for a block with none", () => {
    for (const b of Object.values(CATALOG_BLOCKS)) expect(paletteCards(b)).toHaveLength(b.variants?.length || 1);
  });

  it("has a card for every module and variant a recipe uses", () => {
    for (const r of RECIPES) {
      for (const m of r.modules) {
        const variant = typeof m.props?.variant === "string" ? m.props.variant : undefined;
        expect(cards.find((c) => c.moduleId === m.id && c.variantId === variant), `no card for ${m.id}${variant ? `:${variant}` : ""}`).toBeDefined();
      }
    }
  });

  it("carries the module id and the variant id, and a step list", () => {
    const web = cards.find((c) => c.moduleId === "pa_notification" && c.variantId === "web")!;
    expect(web).toMatchObject({ moduleId: "pa_notification", variantId: "web", lane: "patient", trigger: "view" });
    for (const c of cards) {
      expect(c.steps.length, c.label).toBeGreaterThan(0);
      expect(c.apps.length, c.label).toBeGreaterThan(0);
    }
    expect(cards.filter((c) => c.moduleId === "tracking")).toHaveLength(1);
    expect(cards.find((c) => c.moduleId === "tracking")!.variantId).toBeUndefined();
  });

  it("gives a plain module's card one step built from its own lane and trigger", () => {
    const copayClaim = paletteCards(CATALOG_BLOCKS.copay_claim)[0];
    expect(copayClaim.steps).toEqual([{ label: copayClaim.label, lane: "hcp", trigger: "click" }]);
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

describe("catalog payers", () => {
  // Who pays and whether a PA is needed, derived from each bi exit's data. Not written by hand.
  const TABLE: Record<string, { payer: string; paRequired: boolean }> = {
    pharmacy_covered: { payer: "pharmacy", paRequired: true },
    pharmacy_transfer: { payer: "pharmacy", paRequired: true },
    medical_covered: { payer: "medical", paRequired: false },
    medical_pa_required: { payer: "medical", paRequired: true },
    medical_buy_and_bill: { payer: "medical", paRequired: true },
    no_coverage: { payer: "none", paRequired: false },
    no_coverage_pap: { payer: "none", paRequired: false },
  };
  const biExits = [...new Set(ALL_FORKS.filter((f) => f.id === "bi").flatMap((f) => f.exits.map((e) => e.id)))];

  it("derives a payer and paRequired for every bi exit, matching the table", () => {
    expect(biExits.sort()).toEqual(Object.keys(TABLE).sort());
    for (const id of biExits) {
      const c = catalogExit("bi", id)!;
      expect({ payer: c.payer, paRequired: c.paRequired }, id).toEqual(TABLE[id]);
    }
  });

  it("gives no payer to an exit of any other fork", () => {
    expect(catalogExit("pa", "approved")!.payer).toBeUndefined();
  });

  it("has a label and aliases for every payer, unique across payers", () => {
    expect(Object.keys(CATALOG_PAYERS).sort()).toEqual(["medical", "none", "pharmacy"]);
    for (const p of Object.values(CATALOG_PAYERS)) {
      expect(p.label.trim()).not.toBe("");
      expect(p.aliases.length).toBeGreaterThan(0);
    }
    expect(duplicates(Object.entries(CATALOG_PAYERS).map(([key, p]) => ({ key, aliases: p.aliases })))).toEqual([]);
  });

  it("keeps the pharmacy and medical check names on the payers, not on the bi fork", () => {
    const bi = CATALOG_FORKS.find((f) => f.id === "bi")!.aliases.map((a) => a.toLowerCase());
    for (const a of ["abv", "bv", "emedbv"]) expect(bi).not.toContain(a);
    expect(CATALOG_PAYERS.pharmacy.aliases).toEqual(expect.arrayContaining(["ABV", "BV"]));
    expect(CATALOG_PAYERS.medical.aliases).toContain("eMedBV");
  });

  it("keeps ABV, BV, and BI off the benefit_verification block", () => {
    const aliases = CATALOG_BLOCKS.benefit_verification.aliases.map((a) => a.toLowerCase());
    for (const a of ["abv", "bv", "bi"]) expect(aliases).not.toContain(a);
  });
});
