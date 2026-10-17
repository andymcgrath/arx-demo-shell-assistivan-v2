import type { FlowType, Pharmacy } from "@/engine/types";
import type { ScenarioDefinition } from "@/engine/workflow/types";

/**
 * CoAssist scenarios. Each is data: the content its rules read.
 *
 * Pharmacies carry full contact details (not just a name) so the CRM's shared
 * "Triage Pharmacy Details" card does not render blank address or phone
 * fields. RETAIL is only a placeholder: the instant the patient picks Retail,
 * the Pharmacy Selection screen dispatches SELECT_PHARMACY with their choice.
 * Copay's retail address matches the demo patient's home in Orlando, FL.
 */
export interface CoassistContent {
  /** What BI finds for DTP and Copay. Only "coverage_found" means a PA is required. DME takes its result from the BI event. */
  biResult: "coverage_found" | "no_coverage";
  /** How the PA resolves once the agent opens the PA stage. DME always approves. */
  paOutcome: "approved" | "denied";
  retail: Pharmacy;
  mailOrder: Pharmacy;
  selfPay: Pharmacy;
}

const MAIL_ORDER: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };
const SELF_PAY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

export const COA_DTP: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_DTP",
  intake: "erx",
  content: {
    biResult: "coverage_found",
    paOutcome: "approved",
    retail: { name: "CVS Pharmacy #3795", address: "1450 Riverside Drive", city: "Fairview", state: "TX", zip: "75069", phone: "(972) 555-0142" },
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
  },
};

export const COA_COPAY: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_Copay",
  intake: "erx",
  content: {
    biResult: "coverage_found",
    paOutcome: "approved",
    retail: { name: "CVS Pharmacy #3795", address: "210 N Orange Ave", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-0142" },
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
  },
};

/** DME never offers Retail or Mail Order. The patient picks a network pharmacy, or pays cash through CoAssist's own. */
export const COA_DME: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_DME",
  intake: "erx",
  content: {
    biResult: "coverage_found",
    paOutcome: "approved",
    retail: COA_DTP.content.retail,
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
  },
};

/** The scenarios of the CoAssist workflow. */
export const COASSIST_FLOWS: FlowType[] = ["CoA_DTP", "CoA_Copay", "CoA_DME"];
