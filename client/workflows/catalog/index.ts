import { MODULE_CONTRACTS, type ModuleId } from "@/engine/workflow/components";
import type { ForkDefinition } from "@/engine/workflow/types";
import { ALL_FORKS } from "../forks";
import { CATALOG_BLOCKS } from "./blocks";
import { CATALOG_FORKS } from "./forks";
import type { CatalogBlock, CatalogExit, CatalogFork, CatalogLane, CatalogTrigger, CatalogVariant } from "./types";

export { CATALOG_BLOCKS } from "./blocks";
export { CATALOG_FORKS } from "./forks";
export { CATALOG_WHOLE_DEMOS } from "./demos";
export * from "./types";

/** What a block needs and sets, read from the module contract. Not copied into the catalog. */
export const blockContract = (id: ModuleId) => {
  const c = MODULE_CONTRACTS[id];
  return { needs: c.needs, needsModules: c.needsModules ?? [], orderedAfter: c.orderedAfter ?? [], sets: c.sets };
};

/** A block's variant, with the block's lane and trigger where the variant does not override them. */
export const blockVariant = (block: CatalogBlock, variantId: string): (CatalogVariant & { lane: CatalogLane; trigger: CatalogTrigger }) | undefined => {
  const v = block.variants?.find((x) => x.id === variantId);
  return v && { ...v, lane: v.lane ?? block.lane, trigger: v.trigger ?? block.trigger };
};

export const catalogBlock = (id: ModuleId): CatalogBlock => CATALOG_BLOCKS[id];

const forkFor = (forkId: string): ForkDefinition | undefined => ALL_FORKS.find((f) => f.id === forkId);

/** A fork's catalog entry, with the label from `forks.ts` when the catalog sets none. */
export const catalogFork = (forkId: string): (CatalogFork & { label: string }) | undefined => {
  const entry = CATALOG_FORKS.find((f) => f.id === forkId);
  const fork = forkFor(forkId);
  return entry && fork && { ...entry, label: entry.label ?? fork.label };
};

/**
 * A fork exit as the lab shows it: sales label and description (the catalog's, else `forks.ts`), aliases, and the
 * blocks a recipe must include to pick it (`requires`, from the fork, not copied).
 * The `bi` fork has one exit list per workflow, so the first declared exit with this id supplies the fallback text.
 */
export const catalogExit = (forkId: string, exitId: string): (CatalogExit & { label: string; description: string; requires: string[] }) | undefined => {
  const entry = CATALOG_FORKS.find((f) => f.id === forkId)?.exits.find((e) => e.id === exitId);
  const exit = ALL_FORKS.filter((f) => f.id === forkId).flatMap((f) => f.exits).find((e) => e.id === exitId);
  return entry && exit && { ...entry, label: entry.label ?? exit.label, description: entry.description ?? exit.description ?? "", requires: exit.requires ?? [] };
};
