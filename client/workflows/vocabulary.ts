import { scenarioFor } from "@/workflows/scenarios";

/**
 * Words the apps use for the same step, by how the referral arrived (the scenario's `intake`). One place decides, so the CRM
 * stage name, its button, the step bar, and the presenter's stage list never disagree.
 *
 * An `erx` referral reaches the pharmacy as an electronic transfer, so the step is "Transfer to Pharmacy". A fax (or e-sign)
 * referral is worked by a person, so it stays "Triage to Pharmacy".
 */
export const TRIAGE_LABEL = "Triage to Pharmacy";
export const TRANSFER_LABEL = "Transfer to Pharmacy";

const isErx = (flowType: string): boolean => scenarioFor(flowType)?.intake === "erx";

/** The name of the step that hands the Rx to the pharmacy: "Transfer to Pharmacy" for eRx, "Triage to Pharmacy" otherwise. */
export const triageLabel = (flowType: string): string => (isErx(flowType) ? TRANSFER_LABEL : TRIAGE_LABEL);

/** The verb alone, for headings such as "Transfer Pharmacy Details" and "Select Triage Pharmacy". */
export const triageVerb = (flowType: string): "Transfer" | "Triage" => (isErx(flowType) ? "Transfer" : "Triage");

/** Swaps the fax wording in a label for the scenario's own, leaving any other label as it is. */
export const withTriageLabel = (label: string, flowType: string): string => label.replace(TRIAGE_LABEL, triageLabel(flowType));
