import type { ForkExit } from "./types";

/**
 * Component types for the CRM-driven model (see docs/plans/MODEL_DRAFT.md). Types and declarative data only.
 * The machine does not read this file. recipe.ts validates recipes against it, and the tests run it.
 *
 * The idea: define components once, then let the demo author wire them into a scenario.
 * The system does not decide which scenarios exist. It rejects combinations that cannot work.
 */

/** The scaffold a scenario starts from. It sets the intake, the apps, the first actor, and the opening data. */
export type SourceId = "coassist" | "iassist" | "fulfillment_center" | "pres" | "pes";

/** `system` steps the patient never sees. `patient` steps are reached by a notification such as an SMS magic link. */
export type ModuleLane = "system" | "patient";

export type ModuleId =
  | "enrollment"
  | "pa_notification"
  | "cash_offer"
  | "financial_assistance"
  | "provider_transfer"
  | "pharmacy_selection"
  | "scheduling"
  | "payment"
  | "appeal"
  | "tracking";

/** The four modules that live inside the Triage stage. */
export type TriageModuleId = "pharmacy_selection" | "scheduling" | "payment" | "tracking";

/** Who starts a step. Extends rule 11: `patient` waits on a patient action after a notification. */
export type StepTrigger = "system" | "agent" | "patient";

/**
 * What a module needs and what it sets. Keys are labels, not `WorkflowData` fields, so a module can be
 * declared before the machine knows about it. `fork:<id>` means the recipe passes through that fork.
 */
export interface ModuleContract {
  id: ModuleId;
  lane: ModuleLane;
  /** Keys that must be provided by the source, a fork, or a module earlier in the recipe. */
  needs: string[];
  /** Modules that must appear earlier in the recipe. */
  needsModules?: ModuleId[];
  /** Modules that must appear somewhere in the recipe, in any order, when the props match. */
  requiresModulesWhen?: { props: Record<string, unknown>; modules: ModuleId[] }[];
  /** Keys the module provides once it runs. */
  sets: string[];
  /** Steps the module adds to the tracker. Tracking shows the steps of the modules that ran. */
  trackerSteps: string[];
}

/** One module in a recipe, with the props the scenario supplies (price, variant, method). */
export interface ModuleSpec<Props extends Record<string, unknown> = Record<string, unknown>> {
  id: ModuleId;
  props?: Props;
}

export type FinancialAssistanceVariant = "pap" | "copay";
export type PaymentMethod = "retail" | "mail_order" | "self_pay";

export interface FinancialAssistanceProps extends Record<string, unknown> {
  /** `pap` ends in Free. `copay` is a reduced price. */
  variant: FinancialAssistanceVariant;
}

export interface PaymentProps extends Record<string, unknown> {
  price?: number;
  /** Leave it out when the patient picks live. `mail_order` requires `scheduling` somewhere in the recipe. */
  method?: PaymentMethod;
}

/**
 * A fork exit that sends the patient into a module. Financial Assistance has three entry points:
 * BI with no coverage, an appeal denied with no coverage (both `pap`), and commercial pharmacy
 * coverage (`copay`, optional). Each is data on the exit that leads there.
 */
export interface ModuleEntry {
  module: "financial_assistance";
  props: FinancialAssistanceProps;
  /** True when the patient may decline. A declined copay means full price and a required `payment`. */
  optional?: boolean;
}

export interface EnteringForkExit extends ForkExit {
  enters?: ModuleEntry;
}

/**
 * How a Triage exit treats a module.
 * `required`: the module must be in the recipe. `forbidden`: it must not be. `optional`: the author decides.
 */
export type TriageRule = "required" | "forbidden" | "optional";

export type TriageExitId = "commercial" | "non_commercial" | "transfer";

/**
 * A Triage exit. Triage runs after coverage resolves and chooses the path, not the payer.
 * Commercial coverage is the BI result, so the exit is pre-selected from the BI exit.
 */
export interface TriageExit extends ForkExit {
  rules: Record<TriageModuleId, TriageRule>;
  /** Pre-ticked in the builder. The author can override each one. */
  defaults?: TriageModuleId[];
}

/** What a source gives every recipe that starts from it. */
export interface SourceDef {
  id: SourceId;
  intake: "erx" | "fax" | "esign";
  /** Keys available before any module runs. */
  provides: string[];
}

/**
 * A scenario as a recipe: a source, the forks it passes through, the picks it starts with, and the
 * modules that run, in order. Pure data. A sales rep's request becomes one of these with no new code.
 */
export interface ScenarioRecipe {
  source: SourceId;
  /** Ids of the forks the scenario passes through. Each provides `fork:<id>` to the modules after it. */
  forks: string[];
  /** The starting pick per fork id. A choice that names no declared exit fails the brand test (rule 14). */
  choices: Record<string, string>;
  /** The Triage exit, when the recipe sets one. The validator checks the module list against its rules. */
  triage?: TriageExitId;
  modules: ModuleSpec[];
  /** CRM panels the scenario shows. `benefits` is the pharmacy and medical benefits panel. */
  panels?: PanelId[];
}

/** CRM panels a recipe can turn on. */
export type PanelId = "benefits";

/** Sources defined so far. The rest arrive as each source moves onto the recipe (steps 4 and later). */
export const SOURCES: Partial<Record<SourceId, SourceDef>> = {
  coassist: { id: "coassist", intake: "erx", provides: ["referralReceived"] },
  iassist: { id: "iassist", intake: "erx", provides: ["referralReceived"] },
};

/** Triage rules per exit. Tracking is always required. Transfer forbids scheduling and payment. */
export const TRIAGE_EXIT_RULES: Record<TriageExitId, Record<TriageModuleId, TriageRule>> = {
  commercial: { pharmacy_selection: "optional", scheduling: "optional", payment: "optional", tracking: "required" },
  non_commercial: { pharmacy_selection: "optional", scheduling: "optional", payment: "optional", tracking: "required" },
  transfer: { pharmacy_selection: "optional", scheduling: "forbidden", payment: "forbidden", tracking: "required" },
};

/** The module catalog. Tracker steps are labels to confirm with the presenter. */
export const MODULE_CONTRACTS: Record<ModuleId, ModuleContract> = {
  enrollment: {
    id: "enrollment",
    lane: "patient",
    needs: ["referralReceived"],
    sets: ["consentVerified"],
    trackerSteps: ["Enrolled"],
  },
  pa_notification: {
    id: "pa_notification",
    lane: "patient",
    needs: ["consentVerified", "fork:pa"],
    sets: ["paNotified"],
    trackerSteps: ["Decision confirmed by patient"],
  },
  cash_offer: {
    id: "cash_offer",
    lane: "patient",
    needs: ["fork:bi"],
    sets: ["cashOffered"],
    trackerSteps: ["Cash offer sent"],
  },
  financial_assistance: {
    id: "financial_assistance",
    lane: "patient",
    needs: ["paNotified"],
    sets: ["assistanceApplied"],
    trackerSteps: ["Assistance applied"],
  },
  provider_transfer: {
    id: "provider_transfer",
    lane: "patient",
    needs: ["fork:bi"],
    sets: ["providerTransferred"],
    trackerSteps: ["Provider notified", "Transfer confirmed"],
  },
  pharmacy_selection: {
    id: "pharmacy_selection",
    lane: "patient",
    needs: ["consentVerified"],
    sets: ["selectedPharmacy"],
    trackerSteps: ["Pharmacy selected", "Rx transferred"],
  },
  scheduling: {
    id: "scheduling",
    lane: "patient",
    needs: ["consentVerified"],
    sets: ["address", "shipDate"],
    trackerSteps: ["Delivery scheduled"],
  },
  payment: {
    id: "payment",
    lane: "patient",
    needs: ["consentVerified"],
    requiresModulesWhen: [{ props: { method: "mail_order" }, modules: ["scheduling"] }],
    sets: ["paymentVerified"],
    trackerSteps: ["Payment received"],
  },
  appeal: {
    id: "appeal",
    lane: "system",
    needs: ["consentVerified", "fork:pa"],
    sets: ["appealResolved"],
    trackerSteps: ["Appeal filed", "Appeal decided"],
  },
  tracking: {
    id: "tracking",
    lane: "patient",
    needs: [],
    sets: [],
    trackerSteps: [],
  },
};
