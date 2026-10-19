import type { ScenarioRecipe } from "@/engine/workflow/components";

/**
 * CoAssist scenarios as recipes. Each lists the modules that scenario can reach today, in journey order.
 * This describes the current behavior. The machine does not read it yet (step 2.4 does).
 *
 * A recipe covers every branch of its scenario, so it lists the union of modules. Which of them run on one
 * pass depends on the fork picks: PA denied reaches `cash_offer`, PA approved reaches `pa_notification`.
 *
 * `forks` names the forks the scenario passes through. Every CoAssist scenario passes through `bi` and `pa`.
 * `choices` pins the branch the story walks. DME pins `pa` to `approved`: its rules do not handle a denial yet.
 * `payment.method` is left out where the patient picks live (DTP and Copay today).
 */

export const COA_DTP_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa"],
  choices: { bi: "coverage_found", pa: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "pa_notification" },
    { id: "cash_offer" },
    { id: "payment" },
    { id: "scheduling" },
    { id: "tracking" },
  ],
};

export const COA_COPAY_RECIPE: ScenarioRecipe = {
  source: "coassist",
  forks: ["bi", "pa"],
  choices: { bi: "coverage_found", pa: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "pa_notification" },
    { id: "cash_offer" },
    { id: "payment" },
    { id: "financial_assistance", props: { variant: "copay" } },
    { id: "pharmacy_selection" },
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
    { id: "cash_offer" },
    { id: "pharmacy_selection" },
    { id: "scheduling" },
    { id: "payment" },
    { id: "tracking" },
  ],
};

export const COASSIST_RECIPES = {
  CoA_DTP: COA_DTP_RECIPE,
  CoA_Copay: COA_COPAY_RECIPE,
  CoA_DME: COA_DME_RECIPE,
} as const;
