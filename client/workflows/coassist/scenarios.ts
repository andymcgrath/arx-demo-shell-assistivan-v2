import type { FlowType, Pharmacy } from "@/engine/types";
import type { ScenarioDefinition } from "@/engine/workflow/types";
import { TRANSFER_PHARMACY } from "../shared/assignment";
import { COA_COPAY_RECIPE, COA_COVERAGE_RECIPE, COA_DTP_RECIPE, COA_MEDICAL_TRANSFER_RECIPE } from "./recipes";

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
  // What BI finds and how the PA resolves are the `bi` and `pa` forks (forks.ts). The scenario's `choices` pick them.
  retail: Pharmacy;
  mailOrder: Pharmacy;
  selfPay: Pharmacy;
  /** The pharmacy a scenario hands the Rx to when it assigns one (the BI fork's `pharmacy_transfer` exit). */
  transferPharmacy: Pharmacy;
}

const MAIL_ORDER: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };
const SELF_PAY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

export const COA_DTP: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_DTP",
  intake: "erx",
  choices: { bi: "pharmacy_covered", pa: "approved" },
  recipe: COA_DTP_RECIPE,
  content: {
    retail: { name: "CVS Pharmacy #3795", address: "1450 Riverside Drive", city: "Fairview", state: "TX", zip: "75069", phone: "(972) 555-0142" },
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
    transferPharmacy: TRANSFER_PHARMACY,
  },
};

export const COA_COPAY: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_Copay",
  intake: "erx",
  choices: { bi: "pharmacy_covered", pa: "approved" },
  recipe: COA_COPAY_RECIPE,
  content: {
    retail: { name: "CVS Pharmacy #3795", address: "210 N Orange Ave", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-0142" },
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
    transferPharmacy: TRANSFER_PHARMACY,
  },
};

/** Coverage never offers Retail or Mail Order. The patient picks a network pharmacy, or pays cash through CoAssist's own. */
export const COA_COVERAGE: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_Coverage",
  intake: "erx",
  // The story: pharmacy coverage. A demo in the brand file can pick another branch.
  choices: { bi: "pharmacy_covered", pa: "approved" },
  recipe: COA_COVERAGE_RECIPE,
  content: {
    retail: COA_DTP.content.retail,
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
    transferPharmacy: TRANSFER_PHARMACY,
  },
};

/**
 * The medical benefit covers it and a PA is required. The Rx transfers to an assigned site of care, and the order ends
 * there: no pricing, delivery, or payment.
 */
export const COA_MEDICAL_TRANSFER: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_Medical_Transfer",
  intake: "erx",
  choices: { bi: "medical_pa_required", pa: "approved" },
  recipe: COA_MEDICAL_TRANSFER_RECIPE,
  content: {
    retail: COA_DTP.content.retail,
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
    transferPharmacy: TRANSFER_PHARMACY,
  },
};

/** The scenarios of the CoAssist workflow. */
export const COASSIST_FLOWS: FlowType[] = ["CoA_DTP", "CoA_Copay", "CoA_Coverage", "CoA_Medical_Transfer"];
