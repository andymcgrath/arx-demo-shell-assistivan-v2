/**
 * Helpers the iAssist module rules share.
 */
import type { WorkflowData } from "@/engine/types";
import type { Rule } from "@/engine/workflow/types";
import type { IassistContent } from "../scenarios";

export type IaRule = Rule<any, IassistContent>;

export const nowIso = () => new Date().toISOString();

/** How long the CRM shows a stage as "working" before the result lands. */
export const REVEAL_MS = 3000;
/** Appeal steps run a little faster than the BI and PA reveals. */
export const APPEAL_MS = 2500;
/** How long after BI returns no coverage before the free drug application update goes out. */
export const PAP_UPDATE_MS = 2000;

export const selfPayOwesPayment = (d: WorkflowData) => d.pricingOption === "self_pay" && !d.paymentVerified;

/**
 * True when the scenario has the HCP verify benefits and enroll in copay before the submission (Buy and Bill).
 * The referral waits for both. Every other iAssist scenario starts with the referral.
 */
export const hcpPreparesFirst = (scenario: { recipe?: { modules: { id: string }[] } }) =>
  !!scenario.recipe?.modules.some((m) => m.id === "benefit_verification");

/** Buy and Bill: the story's pick for who captures consent (the `consent` fork). */
export const consentByPatient = (d: WorkflowData) => d.choices?.consent === "patient_text";
export const consentByHcp = (d: WorkflowData) => d.choices?.consent === "hcp_signs";

/** True when the HCP enrolls the patient in copay before the submission (a recipe with the `copay` module). */
export const hcpEnrollsCopay = (scenario: { recipe?: { modules: { id: string }[] } }) =>
  !!scenario.recipe?.modules.some((m) => m.id === "copay");

/**
 * Fulfillment to a site of care is unlocked: an appeal was filed, or the free drug application was approved
 * (`papStatus` "active" is what an approved application sets).
 */
export const siteOfCareUnlocked = (d: WorkflowData) => d.appealStatus !== "none" || d.papStatus === "active";
