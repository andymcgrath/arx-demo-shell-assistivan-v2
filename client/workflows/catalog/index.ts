import { MODULE_CONTRACTS, type ModuleId } from "@/engine/workflow/components";
import type { ForkDefinition, ForkExit } from "@/engine/workflow/types";
import { ALL_FORKS } from "../forks";
import { CATALOG_BLOCKS } from "./blocks";
import { CATALOG_FORKS } from "./forks";
import type { CatalogPayer } from "./payers";
import { DEFAULT_VARIANT, type CatalogApp, type CatalogBlock, type CatalogExit, type CatalogFork, type CatalogLane, type CatalogStep, type CatalogTrigger, type CatalogVariant } from "./types";

export { CATALOG_BLOCKS } from "./blocks";
export { CATALOG_FORKS } from "./forks";
export { CATALOG_WHOLE_DEMOS } from "./demos";
export * from "./types";
export { CATALOG_PAYERS, type CatalogPayer } from "./payers";

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

/**
 * A palette card: one block, or one variant of a block. The module id and variant id say what to put in a recipe.
 * `variantId` is undefined for a block with no variants, and for the `default` variant (a module used with no
 * `variant` prop). `steps` falls back to one step built from the card's own lane and trigger.
 */
export interface PaletteCard {
  moduleId: ModuleId;
  variantId?: string;
  label: string;
  summary: string;
  lane: CatalogLane;
  trigger: CatalogTrigger;
  apps: CatalogApp[];
  steps: CatalogStep[];
  /** The workflows that build this card. Undefined for every workflow. */
  workflows?: string[];
}

export const paletteCards = (block: CatalogBlock): PaletteCard[] => {
  const card = (label: string, summary: string, lane: CatalogLane, trigger: CatalogTrigger, apps: CatalogApp[], steps: CatalogStep[] | undefined, variantId?: string, workflows?: string[]): PaletteCard => ({
    moduleId: block.id,
    ...(variantId ? { variantId } : {}),
    label,
    summary,
    lane,
    trigger,
    apps,
    steps: steps ?? [{ label, lane, trigger }],
    ...(workflows ? { workflows } : {}),
  });
  if (!block.variants?.length) return [card(block.name, block.summary, block.lane, block.trigger, block.apps, block.steps)];
  return block.variants.map((v) =>
    card(v.label, v.summary, v.lane ?? block.lane, v.trigger ?? block.trigger, v.apps ?? block.apps, v.steps ?? block.steps, v.id === DEFAULT_VARIANT ? undefined : v.id, v.workflows),
  );
};

export const catalogBlock = (id: ModuleId): CatalogBlock => CATALOG_BLOCKS[id];

const forkFor = (forkId: string): ForkDefinition | undefined => ALL_FORKS.find((f) => f.id === forkId);

/**
 * Aliases are unique within one kind (blocks, whole demos, fork ids, the exits of one fork) and may repeat across
 * kinds. The palette groups results by kind, so "benefit verification" can name both a block and the `bi` fork.
 */

/** A fork's catalog entry, with the label from `forks.ts` when the catalog sets none. */
export const catalogFork = (forkId: string): (CatalogFork & { label: string }) | undefined => {
  const entry = CATALOG_FORKS.find((f) => f.id === forkId);
  const fork = forkFor(forkId);
  return entry && fork && { ...entry, label: entry.label ?? fork.label };
};

/**
 * Who pays and whether a PA is needed, read from a `bi` exit's `data`. The precedence is `deriveBiResult`'s
 * (workflows/shared/bi.ts): the medical benefit wins when it covers, then the pharmacy benefit, else neither.
 */
const biFacts = (exit: ForkExit): { payer: CatalogPayer; paRequired: boolean } => ({
  payer: exit.data.medicalBenefitStatus === "covered" ? "medical" : exit.data.pharmacyBenefitStatus === "covered" ? "pharmacy" : "none",
  paRequired: !!exit.data.paRequired,
});

/**
 * A fork exit as the lab shows it: sales label and description (the catalog's, else `forks.ts`), aliases, and the
 * blocks a recipe must include to pick it (`requires`, from the fork, not copied).
 * The `bi` fork has one exit list per workflow, so the first declared exit with this id supplies the fallback text.
 */
export const catalogExit = (forkId: string, exitId: string): (CatalogExit & { label: string; description: string; requires: string[]; payer?: CatalogPayer; paRequired?: boolean }) | undefined => {
  const entry = CATALOG_FORKS.find((f) => f.id === forkId)?.exits.find((e) => e.id === exitId);
  const exit = ALL_FORKS.filter((f) => f.id === forkId).flatMap((f) => f.exits).find((e) => e.id === exitId);
  return (
    entry &&
    exit && {
      ...entry,
      label: entry.label ?? exit.label,
      description: entry.description ?? exit.description ?? "",
      requires: exit.requires ?? [],
      ...(forkId === "bi" ? biFacts(exit) : {}),
    }
  );
};
