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
 * `choices` pins the branch the story walks. DME pins `pa` to `approved`: its rules do not handle a denial yet.
 * `payment.method` is left out where the patient picks live (DTP and Copay today).
 *
 * Rules read these props to decide where they apply (a rule's `scope`, see engine/workflow/scope.ts):
 * - `cash_offer` has two variants. `pa_denied` is the cash offer after a denied PA (DTP and Copay). `sms` is the
 *   cash-offer SMS when neither benefit covers (DME).
 * - `pharmacy_selection` has two variants. `store` is the patient's retail store pick (Copay). `network` is DME's
 *   one-tap network pharmacy pick.
 */

export const COA_DTP_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa", "pricing"],
  choices: { bi: "coverage_found", pa: "approved" },
  modules: [
    { id: "enrollment" },
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
  choices: { bi: "coverage_found", pa: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "pa_notification" },
    { id: "cash_offer", props: { variant: "pa_denied" } },
    { id: "payment" },
    { id: "financial_assistance", props: { variant: "copay" } },
    { id: "pharmacy_selection", props: { variant: "store" } },
    { id: "scheduling" },
    { id: "tracking" },
  ],
};

/** DME never offers Retail or Mail Order. The BI fork picks the branch. */
export const COA_DME_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa"],
  choices: { bi: "pharmacy_covered", pa: "approved" },
  modules: [
    { id: "enrollment" },
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
  choices: { bi: "coverage_found", pa: "approved", pricing: "retail" },
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
  CoA_DME: COA_DME_RECIPE,
} as const;
