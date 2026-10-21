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

/**
 * Buy and Bill: the HCP buys the drug and bills the medical benefit. The HCP runs eMedBV and enrolls the patient in
 * copay in iAssist, then submits an enrollment with no Rx. The CRM runs BI, then the PA, in order. The PA is
 * approved, the patient is told to contact the physician, and the HCP sees the patient record and can file a copay
 * claim. No pharmacy, scheduling, payment, or tracking: the HCP orders from their own wholesaler.
 */
export const IA_BUY_AND_BILL_RECIPE: ScenarioRecipe = {
  source: "iassist",
  forks: ["bi", "pa", "consent"],
  choices: { bi: "medical_buy_and_bill", pa: "approved", consent: "patient_text" },
  panels: ["benefits"],
  modules: [
    { id: "benefit_verification", props: { benefit: "medical" } },
    { id: "copay", props: { enrolledBy: "hcp" } },
    { id: "enrollment", props: { variant: "no_rx" } },
    { id: "pa_notification", props: { variant: "hcp_administered" } },
    { id: "patient_record" },
    { id: "copay_claim" },
  ],
};

/**
 * Buy and Bill, free drug (PAP). eMedBV finds no medical coverage, so no PA starts and copay does not apply. The patient
 * gets an application update, agrees to the credit check, and confirms household size and income. Approval sends the
 * free drug to the site of care: the CRM triages it, the patient picks an appointment date, and the order is tracked.
 * The patient pays nothing and sees no pricing. `approved` is the only outcome today. A scenario that wants a denial
 * adds a `pap` fork exit and a module that handles it.
 */
export const IA_BUY_AND_BILL_PAP_RECIPE: ScenarioRecipe = {
  source: "iassist",
  forks: ["bi"],
  choices: { bi: "no_coverage" },
  panels: ["benefits"],
  modules: [
    { id: "benefit_verification", props: { benefit: "medical" } },
    { id: "enrollment", props: { variant: "no_rx" } },
    { id: "financial_assistance", props: { variant: "pap" } },
    { id: "patient_record" },
    { id: "scheduling", props: { variant: "infusion" } },
    { id: "pharmacy_selection", props: { variant: "site_of_care" } },
    { id: "tracking" },
  ],
};

export const IASSIST_RECIPES = {
  iAssist_PA_Approved: IA_PA_APPROVED_RECIPE,
  iAssist_PAP: IA_PA_DENIED_APPEAL_RECIPE,
  iAssist_Medical_Transfer: IA_MEDICAL_TRANSFER_RECIPE,
  iAssist_Buy_And_Bill: IA_BUY_AND_BILL_RECIPE,
  iAssist_Buy_And_Bill_PAP: IA_BUY_AND_BILL_PAP_RECIPE,
} as const;
