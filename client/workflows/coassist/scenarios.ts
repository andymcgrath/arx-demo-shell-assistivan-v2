import type { FlowType, Pharmacy } from "@/engine/types";
import type { ScenarioDefinition } from "@/engine/workflow/types";
import { BRAND } from "@/brand";
import { TRANSFER_PHARMACY } from "../shared/assignment";
import { COA_COPAY_RECIPE, COA_COVERAGE_RECIPE, COA_DTP_RECIPE, COA_MEDICAL_TRANSFER_RECIPE, COA_PAP_RECIPE, COA_WEB_COPAY_RECIPE, COA_HCP_ENROLL_RECIPE, COA_APA_SPECIALTY_RECIPE, COA_APA_ASSISTANCE_RECIPE, COA_WEB_PAP_RECIPE } from "./recipes";

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

/**
 * The client's web page starts the case and hands the patient to the copay screen. Same content as Copay: only the
 * entry differs. Intake is `erx`, so the PA starts on its own once BI says one is required.
 */
export const COA_WEB_COPAY: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_Web_Copay",
  intake: "erx",
  choices: { bi: "pharmacy_covered", pa: "approved" },
  recipe: COA_WEB_COPAY_RECIPE,
  content: COA_COPAY.content,
};

/**
 * An HCP enrolls the patient from the client's web page, and the patient consents in the patient experience. The case
 * ends at enrollment, so the pharmacies are placeholders no screen reads.
 */
export const COA_HCP_ENROLL: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_HCP_Enroll",
  intake: "erx",
  choices: {},
  recipe: COA_HCP_ENROLL_RECIPE,
  content: COA_COPAY.content,
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

/**
 * No coverage, and the case transfers to the patient support program for the free drug program. The `transferPharmacy`
 * dispenses (the brand file's `program.transferPartner`). The patient never sees a price, a PA, or a cash offer.
 */
export const COA_PAP: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_PAP",
  intake: "erx",
  choices: { bi: "no_coverage_pap" },
  recipe: COA_PAP_RECIPE,
  content: {
    retail: COA_DTP.content.retail,
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
    transferPharmacy: TRANSFER_PHARMACY,
  },
};

/**
 * The pharmacy the APA scenario uses when the eRx named none (a stage jump replays the eRx with no pick). It is the
 * client's own pharmacy when the brand file has one (`program.specialtyPharmacy`), and a placeholder otherwise.
 */
const SPECIALTY_PHARMACY: Pharmacy = BRAND.program.specialtyPharmacy ?? { name: "CoAssist Specialty Pharmacy", address: "2400 Sand Lake Road, Suite 300", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0188" };

/**
 * The prescriber completes the PA form (APA) and the pharmacy benefit covers it. The prescriber picked the pharmacy on
 * the eRx, the patient schedules the delivery after the PA, and the agent dispatches to that pharmacy in the CRM.
 */
export const COA_APA_SPECIALTY: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_APA_Specialty",
  intake: "erx",
  choices: { bi: "pharmacy_covered", pa: "approved" },
  recipe: COA_APA_SPECIALTY_RECIPE,
  content: {
    retail: COA_DTP.content.retail,
    mailOrder: MAIL_ORDER,
    selfPay: SELF_PAY,
    transferPharmacy: SPECIALTY_PHARMACY,
  },
};

/**
 * The APA scenario plus financial assistance: after the PA approval the patient qualifies for the free drug program, then
 * chooses it or the copay program. Same pharmacy and content as the specialty APA scenario.
 */
export const COA_APA_ASSISTANCE: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_APA_Assistance",
  intake: "erx",
  choices: { bi: "pharmacy_covered", pa: "approved" },
  recipe: COA_APA_ASSISTANCE_RECIPE,
  content: COA_APA_SPECIALTY.content,
};

/**
 * The client's web page starts the case and BI finds no coverage. The case transfers to the patient support program, and the
 * `transferPharmacy` dispenses (the brand file's `program.transferPartner`). Intake is `erx`: the web page holds what BI needs.
 * The agent works the case in the CRM, so BI returns when the agent opens the BI stage.
 */
export const COA_WEB_PAP: ScenarioDefinition<CoassistContent> = {
  flowType: "CoA_Web_PAP",
  intake: "erx",
  choices: { bi: "no_coverage_pap" },
  recipe: COA_WEB_PAP_RECIPE,
  content: COA_PAP.content,
};

/** The scenarios of the CoAssist workflow. */
export const COASSIST_FLOWS: FlowType[] = ["CoA_APA_Specialty", "CoA_APA_Assistance", "CoA_DTP", "CoA_Copay", "CoA_Web_Copay", "CoA_HCP_Enroll", "CoA_Coverage", "CoA_Medical_Transfer", "CoA_PAP", "CoA_Web_PAP"];
