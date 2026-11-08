import type { ScenarioRecipe } from "@/engine/workflow/components";

/**
 * CoAssist scenarios as recipes. Each lists the modules that scenario can reach today, in journey order.
 * This describes the current behavior. The machine does not read it yet (step 2.4 does).
 *
 * A recipe covers every branch of its scenario, so it lists the union of modules. Which of them run on one
 * pass depends on the fork picks: PA denied reaches `cash_offer`, PA approved reaches `pa_notification`.
 *
 * `forks` names the forks the scenario passes through. Every CoAssist scenario passes through `bi` and `pa`.
 * DTP and Copay add the patient's `pricing` pick, and Copay adds the `copay` enrollment. The patient picks those live,
 * so `choices` does not pin them.
 * `choices` pins the branch the story walks. Coverage pins `pa` to `approved`: its rules do not handle a denial yet.
 * `payment.method` is left out where the patient picks live (DTP and Copay today).
 *
 * Rules read these props to decide where they apply (a rule's `scope`, see engine/workflow/scope.ts):
 * - `cash_offer` has two variants. `pa_denied` is the cash offer after a denied PA (DTP and Copay). `sms` is the
 *   cash-offer SMS when neither benefit covers (Coverage).
 * - `pharmacy_selection` has two variants. `store` is the patient's retail store pick (Copay). `network` is Coverage's
 *   one-tap network pharmacy pick.
 */

export const COA_DTP_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa", "pricing"],
  choices: { bi: "pharmacy_covered", pa: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "prior_authorization", props: { variant: "auto" } },
    { id: "pa_notification" },
    { id: "cash_offer", props: { variant: "pa_denied" } },
    { id: "payment" },
    { id: "scheduling" },
    { id: "tracking" },
  ],
};

export const COA_COPAY_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa", "copay", "pricing"],
  choices: { bi: "pharmacy_covered", pa: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "prior_authorization", props: { variant: "auto" } },
    { id: "pa_notification" },
    { id: "cash_offer", props: { variant: "pa_denied" } },
    { id: "payment" },
    { id: "financial_assistance", props: { variant: "copay" } },
    { id: "pharmacy_selection", props: { variant: "store" } },
    { id: "scheduling" },
    { id: "tracking" },
  ],
};

/**
 * The client's web page starts the case (source `web`). The page collects consent, patient and Rx details, then calls
 * benefit verification, and the PA starts on its own once BI says one is required. The patient taps Enroll on the page
 * and lands in the patient experience on the copay screen, with the PA still running. So the `enrollment` block's `web`
 * variant has no SMS, one-time code, or consent step. The patient is verified at the PA-approved text and code.
 * The tail is Copay's. No `copay` pin: the patient enrolls live on the copay screen.
 */
export const COA_WEB_COPAY_RECIPE: ScenarioRecipe = {
  source: "web",
  forks: ["bi", "pa", "copay", "pricing"],
  choices: { bi: "pharmacy_covered", pa: "approved" },
  modules: [
    { id: "enrollment", props: { variant: "web" } },
    { id: "pa_notification", props: { variant: "web" } },
    { id: "cash_offer", props: { variant: "pa_denied" } },
    { id: "payment" },
    { id: "financial_assistance", props: { variant: "copay" } },
    { id: "pharmacy_selection", props: { variant: "store" } },
    { id: "scheduling" },
    { id: "tracking" },
  ],
};

/** Coverage never offers Retail or Mail Order. The `bi` fork picks the branch. */
export const COA_COVERAGE_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa"],
  choices: { bi: "pharmacy_covered", pa: "approved" },
  panels: ["benefits"],
  modules: [
    { id: "enrollment" },
    { id: "prior_authorization", props: { variant: "auto" } },
    { id: "pa_notification" },
    { id: "provider_transfer" },
    { id: "cash_offer", props: { variant: "sms" } },
    { id: "pharmacy_selection", props: { variant: "network" } },
    { id: "scheduling" },
    { id: "payment" },
    { id: "tracking" },
  ],
};

/**
 * The medical benefit covers it and a PA is required. The Rx transfers for dispensing (the Triage `transfer` exit), so no
 * payment and no scheduling. The BI exit assigns the site of care, so the patient sees its contact details and nothing
 * else. The same outcome as the iAssist medical transfer, from a CoAssist start.
 */
export const COA_MEDICAL_TRANSFER_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa"],
  choices: { bi: "medical_pa_required", pa: "approved" },
  triage: "transfer",
  panels: ["benefits"],
  modules: [
    { id: "enrollment" },
    { id: "prior_authorization", props: { variant: "auto" } },
    { id: "pa_notification" },
    { id: "pharmacy_selection", props: { variant: "assigned" } },
    { id: "tracking" },
  ],
};

/**
 * BI finds no coverage, and the case transfers to the manufacturer's patient support program. The patient applies for the
 * free drug program (Fax PAP income form), and an assigned pharmacy dispenses. No PA, no cash offer, no payment: the
 * `bi` exit `no_coverage_pap` runs none of them, and the recipe lists none. Income is approved only (docs/plans/PLAN_COA_PAP.md).
 */
export const COA_PAP_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi"],
  choices: { bi: "no_coverage_pap" },
  panels: ["benefits"],
  modules: [
    { id: "enrollment" },
    { id: "pap_transfer" },
    { id: "income_qualification" },
    { id: "pharmacy_selection", props: { variant: "assigned" } },
    { id: "scheduling" },
    { id: "tracking" },
  ],
};

/**
 * The composition proof (step 2.6). Commercial coverage, PA approved, the patient's Retail pick, a pharmacy the
 * patient selects, and the Rx handed over: the order tracker shows it. No `scheduling` and no `payment`.
 *
 * It is not a scenario the presenter can pick. It exists so a test can compose a path from modules, with no new
 * rule, route, or screen. See `coassist.composition.test.ts`. It borrows Copay's forks, because Copay declares
 * the `pricing` fork with a Retail exit. Making it pickable needs a scenario id, which is the rule 7 cleanup first.
 */
export const COA_COMMERCIAL_TRANSFER_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa", "pricing"],
  choices: { bi: "pharmacy_covered", pa: "approved", pricing: "retail" },
  modules: [
    { id: "enrollment" },
    { id: "pa_notification" },
    { id: "pharmacy_selection", props: { variant: "store" } },
    { id: "tracking" },
  ],
};

export const COASSIST_RECIPES = {
  CoA_DTP: COA_DTP_RECIPE,
  CoA_Copay: COA_COPAY_RECIPE,
  CoA_Web_Copay: COA_WEB_COPAY_RECIPE,
  CoA_Coverage: COA_COVERAGE_RECIPE,
  CoA_Medical_Transfer: COA_MEDICAL_TRANSFER_RECIPE,
  CoA_PAP: COA_PAP_RECIPE,
} as const;
