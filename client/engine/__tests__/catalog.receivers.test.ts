import { describe, it, expect } from "vitest";
import { ALL_FORKS } from "@/workflows/forks";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { CATALOG_BLOCKS, CATALOG_FORKS, entryNamesBlock, exitFeeds, forkOwnerIndex } from "@/workflows/catalog";
import type { ModuleId } from "@/engine/workflow/components";

/**
 * Outcomes list the blocks they work with (`leadsTo`), and each fork says which block it is drawn under (`ownedBy`).
 * The canvas reads both. These tests keep them true to the forks and recipes the machine actually runs.
 */

const variantOf = (m: { props?: Record<string, unknown> }) => (typeof m.props?.variant === "string" ? (m.props.variant as string) : undefined);

describe("fork receiver lists", () => {
  it("name only blocks and variants the catalog has", () => {
    for (const f of CATALOG_FORKS) {
      for (const e of f.exits) {
        for (const entry of e.leadsTo ?? []) {
          const [id, variant] = entry.split(":");
          const block = CATALOG_BLOCKS[id as ModuleId];
          expect(block, `${f.id}.${e.id} leadsTo "${entry}": no such block`).toBeDefined();
          if (variant) expect(block.variants?.some((v) => v.id === variant), `${f.id}.${e.id} leadsTo "${entry}": no such variant`).toBe(true);
        }
      }
    }
  });

  it("include every block the outcome requires", () => {
    for (const fork of ALL_FORKS) {
      for (const exit of fork.exits) {
        const leadsTo = CATALOG_FORKS.find((f) => f.id === fork.id)?.exits.find((e) => e.id === exit.id)?.leadsTo;
        if (!leadsTo) continue;
        for (const req of exit.requires ?? []) {
          // `a|b` is any of them, so one of them must be listed.
          const listed = req.split("|").some((alt) => {
            const [id, variant] = alt.split(":");
            return leadsTo.some((entry) => entryNamesBlock(entry, id, variant));
          });
          expect(listed, `${fork.id}.${exit.id} requires ${req}, but its leadsTo does not list it`).toBe(true);
        }
      }
    }
  });

  it("give every fork an owner block the catalog has, and every patient outcome its steps", () => {
    for (const fork of ALL_FORKS) {
      const entry = CATALOG_FORKS.find((f) => f.id === fork.id);
      expect(entry, `fork ${fork.id} has no catalog entry`).toBeDefined();
      expect(entry!.ownedBy.length, `fork ${fork.id} has no owner`).toBeGreaterThan(0);
      for (const owner of entry!.ownedBy) expect(CATALOG_BLOCKS[owner], `fork ${fork.id} owner ${owner}`).toBeDefined();
      if (fork.chooser !== "patient") continue;
      for (const exit of fork.exits) {
        const then = entry!.exits.find((e) => e.id === exit.id)?.then;
        expect(then?.length, `patient fork ${fork.id}.${exit.id} has no steps`).toBeGreaterThan(0);
      }
    }
  });

  it("feed every block after a fork in every recipe, from the picked outcome or any outcome of a patient fork", () => {
    for (const scenario of ALL_SCENARIOS.filter((s) => s.recipe)) {
      const recipe = scenario.recipe!;
      const modules = recipe.modules;
      const picks = { ...recipe.choices, ...scenario.choices } as Record<string, string>;
      for (const forkId of recipe.forks) {
        const owner = forkOwnerIndex(forkId, modules);
        expect(owner, `${scenario.flowType}: fork ${forkId} has no owner block in the recipe`).toBeGreaterThanOrEqual(0);
      }
      // Each block after the first fork's owner must be fed by some preceding fork's outcome.
      modules.forEach((m, index) => {
        const block = { id: m.id, variantId: variantOf(m) };
        const forks = recipe.forks.filter((f) => forkOwnerIndex(f, modules) < index && CATALOG_FORKS.find((c) => c.id === f)?.exits.some((e) => e.leadsTo));
        if (!forks.length) return;
        const fed = forks.some((forkId) => {
          const fork = ALL_FORKS.find((f) => f.id === forkId)!;
          const exits = fork.chooser === "patient" ? fork.exits.map((e) => e.id) : picks[forkId] ? [picks[forkId]] : fork.exits.map((e) => e.id);
          return exits.some((exitId) => exitFeeds(forkId, exitId, block));
        });
        expect(fed, `${scenario.flowType}: no outcome feeds ${m.id}${block.variantId ? ":" + block.variantId : ""}`).toBe(true);
      });
    }
  });
});
