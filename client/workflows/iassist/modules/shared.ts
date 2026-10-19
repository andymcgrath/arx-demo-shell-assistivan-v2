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

export const selfPayOwesPayment = (d: WorkflowData) => d.pricingOption === "self_pay" && !d.paymentVerified;
