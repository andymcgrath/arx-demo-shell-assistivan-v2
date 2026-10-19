import type { ScenarioRecipe } from "@/engine/workflow/components";

/**
 * iAssist scenarios as recipes. Each lists the modules that scenario reaches today, in journey order.
 * The machine reads the picks (forks.ts) and does not read the module list yet (step 4.3 does).
 *
 * Both scenarios pass through the `bi` and `pa` forks, and `choices` names the story's picks.
 *
 * Variants (read by a rule's `scope`, see engine/workflow/scope.ts):
 * - `scheduling` has `delivery` (address and ship date) and `infusion` (the infusion date after an appeal).
 * - `pharmacy_selection` has `crm` (the agent can change the dispensing pharmacy once a price is chosen) and
 *   `site_of_care` (the Rx goes to the site of care that the appeal unlocks).
 */

/** The PA is approved, then pricing, delivery, payment (self-pay only), and fulfillment. */
export const IA_PA_APPROVED_RECIPE: ScenarioRecipe = {
  source: "iassist",
  forks: ["bi", "pa"],
  choices: { bi: "coverage_found", pa: "approved" },
  modules: [
    { id: "enrollment" },
    { id: "pa_notification" },
    { id: "payment" },
    { id: "pharmacy_selection", props: { variant: "crm" } },
    { id: "scheduling", props: { variant: "delivery" } },
    { id: "tracking" },
  ],
};

/** The PA is denied for good. The appeal unlocks fulfillment: an infusion date, a site of care, then tracking. */
export const IA_PA_DENIED_APPEAL_RECIPE: ScenarioRecipe = {
  source: "iassist",
  forks: ["bi", "pa"],
  choices: { bi: "coverage_found", pa: "denied" },
  modules: [
    { id: "enrollment" },
    { id: "appeal" },
    { id: "scheduling", props: { variant: "infusion" } },
    { id: "pharmacy_selection", props: { variant: "site_of_care" } },
    { id: "tracking" },
  ],
};

export const IASSIST_RECIPES = {
  iAssist_PA_Approved: IA_PA_APPROVED_RECIPE,
  iAssist_PAP: IA_PA_DENIED_APPEAL_RECIPE,
} as const;
