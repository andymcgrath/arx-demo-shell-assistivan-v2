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
  choices: { bi: "pharmacy_covered", pa: "approved" },
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
  choices: { bi: "pharmacy_covered", pa: "denied" },
  modules: [
    { id: "enrollment" },
    { id: "appeal" },
    { id: "scheduling", props: { variant: "infusion" } },
    { id: "pharmacy_selection", props: { variant: "site_of_care" } },
    { id: "tracking" },
  ],
};

/**
 * The medical benefit covers it and a PA is required. HCP administered (Buy & Bill): the Triage `transfer` exit, so no
 * payment and no scheduling. The BI exit assigns the pharmacy, so the patient sees its contact details and nothing
 * else. Copay is data in the CRM, not a patient step.
 */
export const IA_MEDICAL_TRANSFER_RECIPE: ScenarioRecipe = {
  source: "iassist",
  forks: ["bi", "pa"],
  choices: { bi: "medical_pa_required", pa: "approved" },
  triage: "transfer",
  panels: ["benefits"],
  modules: [
    { id: "enrollment" },
    { id: "pa_notification" },
    { id: "pharmacy_selection", props: { variant: "assigned" } },
    { id: "tracking" },
  ],
};

export const IASSIST_RECIPES = {
  iAssist_PA_Approved: IA_PA_APPROVED_RECIPE,
  iAssist_PAP: IA_PA_DENIED_APPEAL_RECIPE,
  iAssist_Medical_Transfer: IA_MEDICAL_TRANSFER_RECIPE,
} as const;
