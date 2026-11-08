import type { ModuleId } from "@/engine/workflow/components";
import type { FlowType } from "@/engine/types";

/**
 * Sales-facing catalog types. The Demo Lab reads this catalog to draw blocks and outcomes in plain language.
 * The machine never reads it. Keep wording to what a screen or rule does today.
 *
 * `needs` and `sets` are not stored here. They come from `MODULE_CONTRACTS` (blocks) and from the fork exit's
 * `requires` (outcomes), through the helpers in `./index.ts`.
 */

/** The apps a block touches, by the shell's portal id. */
export type CatalogApp = "crm" | "patient" | "provider" | "field" | "iassist" | "rules" | "web" | "gateway";

/** Who the audience sees acting. */
export type CatalogLane = "hcp" | "patient" | "agent" | "system";

/**
 * `click`: someone taps or clicks. `text`: the patient acts on an SMS or one-time code. `automatic`: a timer or rule
 * fires it. `view`: someone opens a screen and no event fires.
 */
export type CatalogTrigger = "click" | "text" | "automatic" | "view";

/** One user-visible step, in order. A block with steps takes lane and trigger from them. */
export interface CatalogStep {
  label: string;
  lane: CatalogLane;
  trigger: CatalogTrigger;
}

/** The variant id for a module used with no `variant` prop. */
export const DEFAULT_VARIANT = "default";

/**
 * An entry the user has not signed off on. `draft: true` needs a one-line `question`. The tag step fails while any
 * draft remains (see `catalog.test.ts`, run with `CATALOG_NO_DRAFTS=1`).
 */
export interface Draftable {
  draft?: boolean;
  question?: string;
}

/** One value of a block's `variant` prop. Lane, trigger, and apps override the block's when they differ. */
export interface CatalogVariant extends Draftable {
  id: string;
  label: string;
  summary: string;
  lane?: CatalogLane;
  trigger?: CatalogTrigger;
  apps?: CatalogApp[];
  steps?: CatalogStep[];
  /** The workflows that build this variant. Omit for every workflow. The palette greys it out elsewhere. */
  workflows?: string[];
}

export interface CatalogBlock extends Draftable {
  /** The module id. Kept apart from the sales name. */
  id: ModuleId;
  name: string;
  /** One line: what the audience sees. */
  summary: string;
  /** Sales vocabulary the palette search reads. */
  aliases: string[];
  apps: CatalogApp[];
  lane: CatalogLane;
  trigger: CatalogTrigger;
  /**
   * One entry per step when the actor or trigger changes inside the block. `lane` and `trigger` above are the default
   * for a block with one step.
   */
  steps?: CatalogStep[];
  /**
   * One entry per value of the module's `variant` prop. A module used with no `variant` prop is the `default` entry,
   * which is required whenever the block has variants and a recipe uses it plain.
   */
  variants?: CatalogVariant[];
}

/**
 * A fork exit. `label` and `description` fall back to the exit in `forks.ts`, so they are set here only when the
 * sales wording differs.
 */
export interface CatalogExit extends Draftable {
  id: string;
  label?: string;
  description?: string;
  aliases: string[];
}

export interface CatalogFork extends Draftable {
  id: string;
  /** Falls back to the fork's own label. */
  label?: string;
  aliases: string[];
  exits: CatalogExit[];
}

/** A scenario of a workflow with no recipes yet. It is a whole demo, not a list of blocks. */
export interface CatalogWholeDemo extends Draftable {
  flowType: FlowType;
  workflow: "standard" | "pap";
  name: string;
  summary: string;
  aliases: string[];
  apps: CatalogApp[];
}
