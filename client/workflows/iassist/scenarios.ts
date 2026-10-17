import type { FlowType, Pharmacy } from "@/engine/types";
import type { ScenarioDefinition } from "@/engine/workflow/types";

/**
 * iAssist scenarios. Each is data: the content its rules read.
 *
 * iAssist is an `erx` workflow: the provider's eRx holds everything the PA needs,
 * so BI starts when the referral arrives and the PA starts when BI says one is required.
 */
export interface IassistContent {
  /** What BI finds. Only "coverage_found" means a PA is required. */
  biResult: "coverage_found" | "no_coverage";
  /** How the PA resolves once the agent opens the PA stage. */
  paOutcome: "approved" | "denied";
  retail: Pharmacy;
  mailOrder: Pharmacy;
  selfPay: Pharmacy;
}

// The same pharmacies the CoAssist DTP Benefit Pricing card shows. The card is a shared component.
const RETAIL: Pharmacy = { name: "CVS Pharmacy #3795", address: "1450 Riverside Drive", city: "Fairview", state: "TX", zip: "75069", phone: "(972) 555-0142" };
const MAIL_ORDER: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };
const SELF_PAY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

/** The PA is approved, then pricing, delivery and fulfillment. */
export const IA_PA_APPROVED: ScenarioDefinition<IassistContent> = {
  flowType: "iAssist_PA_Approved",
  intake: "erx",
  content: { biResult: "coverage_found", paOutcome: "approved", retail: RETAIL, mailOrder: MAIL_ORDER, selfPay: SELF_PAY },
};

/** The PA is denied. An appeal (started by an automation rule built in the Rules portal) is approved, then the infusion is scheduled. */
export const IA_PA_DENIED_APPEAL: ScenarioDefinition<IassistContent> = {
  flowType: "iAssist_PAP",
  intake: "erx",
  content: { biResult: "coverage_found", paOutcome: "denied", retail: RETAIL, mailOrder: MAIL_ORDER, selfPay: SELF_PAY },
};

/** The scenarios of the iAssist workflow. */
export const IASSIST_FLOWS: FlowType[] = ["iAssist_PA_Approved", "iAssist_PAP"];
