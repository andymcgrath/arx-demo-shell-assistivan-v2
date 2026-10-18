import type { ForkDefinition } from "@/engine/workflow/types";

/**
 * CoAssist forks. A fork is a point where the story has a default branch and named alternatives.
 * The pick lives in `workflowData.choices`, and the rule that resolves the fork reads it.
 */

/**
 * The events that enroll the patient and verify them. BI starts on its own when the referral lands
 * (see rules.ts), so after these the fork is waiting to resolve. The stage-jump ladders reuse this list.
 */
export const ENROLL_AND_VERIFY = [
  { type: "REFERRAL_RECEIVED", portal: "crm" },
  { type: "VERIFY_SMS", portal: "patient" },
  { type: "VERIFY_OTP", portal: "patient" },
  { type: "CONFIRM_CONSENT", portal: "patient" },
];

/**
 * CoA_DME benefits investigation. One BI resolves to one of three coverage outcomes. The presenter picks
 * it on the CRM, or a demo in the brand file starts with it chosen. Medical benefit always wins when covered.
 */
export const DME_BI_FORK: ForkDefinition = {
  id: "bi",
  label: "Benefits investigation result",
  chooser: "presenter",
  scenarios: ["CoA_DME"],
  leadIn: ENROLL_AND_VERIFY,
  resolved: (d) => d.biStatus === "complete",
  exits: [
    {
      id: "pharmacy_covered",
      label: "Pharmacy Coverage",
      description: "The pharmacy benefit covers it and needs a PA. The patient picks a network pharmacy.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" },
    },
    {
      id: "covered_by_both",
      label: "Covered by Both",
      description: "The medical benefit covers it. The case transfers to an outside DME provider.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered" },
    },
    {
      id: "no_coverage",
      label: "No Coverage (Cash)",
      description: "Neither benefit covers it. The patient gets a cash offer.",
      data: { pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" },
    },
  ],
};

export const COASSIST_FORKS: ForkDefinition[] = [DME_BI_FORK];
