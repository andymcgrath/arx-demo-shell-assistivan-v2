/**
 * Helpers the CoAssist module rules share. `CONFIRM_CONSENT` and `VERIFY_PA_APPROVED_OTP` both apply an assigned
 * pharmacy and pre-picked pricing, so these live here and not in one module.
 */
import type { WorkflowData } from "@/engine/types";
import type { ForkExit, Rule } from "@/engine/workflow/types";
import { forkApplies } from "@/engine/workflow/forks";
import { COPAY_FORK, pricingForkFor } from "../forks";
import type { CoassistContent } from "../scenarios";

export type CoaRule = Rule<any, CoassistContent>;

export const nowIso = () => new Date().toISOString();

/** Order tail: pricing is chosen (or payment cleared) and Rx is not yet in fulfillment. */
export const inFulfillmentTail = (d: WorkflowData) =>
  d.pharmacyStatus === "none" && (d.pricingOption !== null || d.dispatchStatus !== "none" || d.paymentVerified);

/** CoA_DME BI outcome. Medical benefit always wins when covered. */
export function deriveBiResult(
  pharmacyBenefitStatus: "covered" | "not_covered",
  medicalBenefitStatus: "covered" | "not_covered",
): string {
  if (medicalBenefitStatus === "covered") return "dme_covered";
  if (pharmacyBenefitStatus === "covered") return "coverage_found";
  return "no_coverage";
}

export const dmeNeitherCovered = (d: WorkflowData) =>
  d.pharmacyBenefitStatus === "not_covered" && d.medicalBenefitStatus === "not_covered";

/** A scenario that assigns the pharmacy hands the Rx over as soon as the PA approval is verified. No patient choice. */
export const assignment = (d: WorkflowData, s: { content: CoassistContent }) =>
  d.pharmacyAssigned ? { pricingOption: "retail" as const, selectedPharmacy: s.content.transferPharmacy } : {};

export const DTP_COPAY = ["CoA_DTP", "CoA_Copay"] as const;

/** The scenario content that names the pharmacy for each `pricing` exit. Exit data is static, so content supplies it. */
const PRICING_PHARMACY: Record<string, "retail" | "mailOrder" | "selfPay"> = {
  retail: "retail",
  mail_order: "mailOrder",
  self_pay: "selfPay",
};

/** The scenario's own `pricing` exit for what the patient picked, or undefined when it has no such exit. */
export const pricingExit = (d: WorkflowData, option: unknown): ForkExit | undefined =>
  pricingForkFor(d.flowType)?.exits.find((e) => e.id === option);

/** What a pricing pick sets: the exit's data, plus the pharmacy that exit names in the scenario's content. */
export const pricingPick = (exit: ForkExit, s: { content: CoassistContent }) => ({
  ...exit.data,
  selectedPharmacy: s.content[PRICING_PHARMACY[exit.id]],
});

/**
 * A recipe or a demo can pin the patient's picks (`choices.copay`, `choices.pricing`). They apply the moment the PA
 * approval is verified, so the patient skips the menu, the same way an assigned pharmacy skips selection. A pin that
 * names no real exit was dropped when the run started. With no pin this returns nothing, so the menu shows as before.
 * A pinned Retail uses the scenario's default retail pharmacy. The patient did not choose a store.
 * An exit marked `confirm` (the self-pay offer) is not applied here. The route sends the patient to its screen,
 * and accepting it there sends SELECT_SELF_PAY.
 */
export function prePicked(d: WorkflowData, s: { content: CoassistContent }): Partial<WorkflowData> {
  const enroll = forkApplies(COPAY_FORK, d.flowType) && d.choices?.copay === "enroll" ? COPAY_FORK.exits.find((e) => e.id === "enroll")!.data : {};
  const exit = d.choices?.pricing ? pricingExit(d, d.choices.pricing) : undefined;
  return { ...enroll, ...(exit && !exit.confirm ? pricingPick(exit, s) : {}) };
}

/** How long the CRM shows a stage as "working" before the result lands. */
export const REVEAL_MS = 3000;
