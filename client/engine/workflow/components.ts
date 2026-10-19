import type { ForkExit } from "./types";

/**
 * Component types for the CRM-driven model (see MODEL_DRAFT.md). Types and declarative data only.
 * Nothing imports this file yet, so it changes no behavior. Step 2 moves CoAssist onto it.
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
  | "financial_assistance"
  | "pharmacy_selection"
  | "scheduling"
  | "payment"
  | "tracking";

/** The four modules that live inside the Triage stage. */
export type TriageModuleId = "pharmacy_selection" | "scheduling" | "payment" | "tracking";

/** Who starts a step. Extends rule 11: `patient` waits on a patient action after a notification. */
export type StepTrigger = "system" | "agent" | "patient";

/**
 * What a module needs and what it sets. A key names a field on `WorkflowData`. Modules that gate
 * on another module use `needsModules` so a recipe with the wrong order fails a test.
 */
export interface ModuleContract {
  id: ModuleId;
  lane: ModuleLane;
  /** Data that must be set before the module can run. */
  needs: string[];
  /** Modules that must appear earlier in the recipe. Can depend on props, see `needsModulesWhen`. */
  needsModules?: ModuleId[];
  /** Extra module needs that apply only for certain props. */
  needsModulesWhen?: { props: Record<string, unknown>; modules: ModuleId[] }[];
  /** Data the module sets when it completes. */
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
export type PaymentMethod = "retail" | "mail_order";

export interface FinancialAssistanceProps extends Record<string, unknown> {
  /** `pap` ends in Free. `copay` is a reduced price. */
  variant: FinancialAssistanceVariant;
}

export interface PaymentProps extends Record<string, unknown> {
  price: number;
  /** `mail_order` requires `scheduling` earlier in the recipe. */
  method: PaymentMethod;
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

/**
 * A Triage exit. Triage runs after coverage resolves and chooses the path, not the payer.
 * Commercial coverage is the BI result, so the exit is pre-selected from the BI exit.
 */
export interface TriageExit extends ForkExit {
  rules: Record<TriageModuleId, TriageRule>;
  /** Pre-ticked in the builder. The author can override each one. */
  defaults?: TriageModuleId[];
}

/**
 * A scenario as a recipe: a source, one pick per fork, and the modules that run, in order.
 * Pure data. A sales rep's request becomes one of these with no new code.
 */
export interface ScenarioRecipe {
  source: SourceId;
  /** One exit per fork id. A choice that names no declared exit fails the brand test (rule 14). */
  choices: Record<string, string>;
  modules: ModuleSpec[];
}

/** The module catalog. Tracker steps are labels to confirm with the presenter. */
export const MODULE_CONTRACTS: Record<ModuleId, ModuleContract> = {
  enrollment: {
    id: "enrollment",
    lane: "patient",
    needs: ["referralReceived"],
    sets: ["consentVerified"],
    trackerSteps: ["Enrolled"],
  },
  financial_assistance: {
    id: "financial_assistance",
    lane: "patient",
    needs: ["assistanceEntry"],
    sets: ["assistanceApplied", "assistanceOutcome"],
    trackerSteps: ["Assistance applied"],
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
    needs: ["pharmacy", "price"],
    needsModulesWhen: [{ props: { method: "mail_order" }, modules: ["scheduling"] }],
    sets: ["paymentVerified"],
    trackerSteps: ["Payment received"],
  },
  tracking: {
    id: "tracking",
    lane: "patient",
    needs: [],
    sets: [],
    trackerSteps: [],
  },
};
