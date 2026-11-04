import type { ScenarioDefinition } from "@/engine/workflow/types";
import type { ModuleId } from "@/engine/workflow/components";
import { scenarioFor } from "./scenarios";

/**
 * What the UI asks about a scenario, derived from its definition: recipe (source, forks, modules), intake
 * channel, and `legacy`. UI code reads these instead of comparing `flowType` to a flow id (CLAUDE.md rule 7).
 *
 * Each fact keeps the meaning of the UI flag it replaces (see docs/plans/PLAN_RULE7_CLEANUP.md). Where one
 * flag name had two meanings, each meaning has its own name here:
 * - `isCoA`: `isCoassistSource` (every CoAssist flow) and `hasPricingFork` (the patient picks a pricing option).
 * - `isPapFlow`: `isFaxPap` (fax intake, no PA) and `isNoPaIntake` (fax or esign intake, no PA).
 *
 * `engine/__tests__/scenarioFacts.test.ts` checks every fact against the recorded UI predicates.
 */
export interface ScenarioFacts {
  /** The scenario starts from CoAssist. */
  isCoassistSource: boolean;
  /** The scenario starts from iAssist. */
  isIassistSource: boolean;
  /** The patient picks a pricing option (the recipe passes through the `pricing` fork). */
  hasPricingFork: boolean;
  /** The recipe passes through the `copay` fork (copay enrollment). */
  hasCopayFork: boolean;
  /** A client-managed web page starts the case (source `web`). The page calls ABV and APA through the gateway. No CRM. */
  isWebSource: boolean;
  /** Medical-benefit coverage outcomes: a cash offer SMS and a provider transfer, with no PA or pricing. */
  isCoverageScenario: boolean;
  /** Fax intake. */
  isFax: boolean;
  /** Fax intake and BI finds no insurance, so no PA runs. */
  isFaxPap: boolean;
  /** Fax intake with a manual PA: coverage is found and the provider's submission starts the PA. */
  isStandardFaxPa: boolean;
  /** Fax or esign intake and BI finds no insurance, so no PA runs. */
  isNoPaIntake: boolean;
  /** Legacy esign intake. The patient app uses the wide layout. */
  isPres: boolean;
  isWideFlow: boolean;
  /** iAssist, with a payment step (the standard PA path). */
  isIassistStandardPa: boolean;
  /** iAssist, PA denied and an appeal. */
  isIassistAppeal: boolean;
  /** The free drug program in iAssist: financial assistance after a benefit verification. */
  isFreeDrug: boolean;
  /** `isIassistAppeal` or `isFreeDrug`. The CRM dispenses through a site of care for both. */
  dispensesAtSiteOfCare: boolean;
  /** Copay with the patient's pick filled outside the platform's own dispensing (retail or mail order). */
  isCopayRetail: (pricingOption: string | null | undefined) => boolean;
}

/** The scenario shapes that carry a BI result in their content (the Standard and PAP workflows). */
const biResultOf = (scenario: ScenarioDefinition<any>): string | undefined => {
  const content = scenario.content as { biResult?: string } | undefined;
  return content?.biResult;
};

export function scenarioFacts(flowType: string): ScenarioFacts {
  const scenario = scenarioFor(flowType);
  const recipe = scenario?.recipe;
  const hasModule = (id: ModuleId) => !!recipe?.modules.some((m) => m.id === id);
  const hasFork = (id: string) => !!recipe?.forks.includes(id);
  const intake = scenario?.intake;
  const noPa = !!scenario && !recipe && biResultOf(scenario) === "no_insurance";

  const isCoassistSource = recipe?.source === "coassist";
  const isIassistSource = recipe?.source === "iassist";
  const hasCopayFork = hasFork("copay");
  const isIassistAppeal = isIassistSource && hasModule("appeal");
  const isFreeDrug = hasModule("financial_assistance") && hasModule("benefit_verification");
  const isPres = !!scenario?.legacy && intake === "esign";

  return {
    isCoassistSource,
    isIassistSource,
    hasPricingFork: hasFork("pricing"),
    hasCopayFork,
    isWebSource: recipe?.source === "web",
    isCoverageScenario: !!recipe?.modules.some((m) => m.id === "cash_offer" && m.props?.variant === "sms") && hasModule("provider_transfer"),
    isFax: intake === "fax",
    isStandardFaxPa: !!scenario && !recipe && !noPa && intake === "fax",
    isFaxPap: noPa && intake === "fax",
    isNoPaIntake: noPa && (intake === "fax" || intake === "esign"),
    isPres,
    isWideFlow: isPres,
    isIassistStandardPa: isIassistSource && hasModule("payment"),
    isIassistAppeal,
    isFreeDrug,
    dispensesAtSiteOfCare: isIassistAppeal || isFreeDrug,
    isCopayRetail: (pricingOption) => hasCopayFork && (pricingOption === "retail" || pricingOption === "mail_order"),
  };
}
