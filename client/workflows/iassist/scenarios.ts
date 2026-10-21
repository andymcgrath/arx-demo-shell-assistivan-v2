import type { FlowType, Pharmacy } from "@/engine/types";
import type { ScenarioDefinition } from "@/engine/workflow/types";
import { TRANSFER_PHARMACY } from "../shared/assignment";
import { IA_BUY_AND_BILL_PAP_RECIPE, IA_BUY_AND_BILL_RECIPE, IA_MEDICAL_TRANSFER_RECIPE, IA_PA_APPROVED_RECIPE, IA_PA_DENIED_APPEAL_RECIPE } from "./recipes";

/**
 * iAssist scenarios. Each is data: the fork picks (forks.ts) and the content its rules read.
 *
 * iAssist is an `erx` workflow: the provider's eRx holds everything the PA needs,
 * so BI starts when the referral arrives and the PA starts when BI says one is required.
 */
export interface IassistContent {
  retail: Pharmacy;
  mailOrder: Pharmacy;
  selfPay: Pharmacy;
  /** The pharmacy a scenario hands the Rx to when the BI exit assigns one. */
  transferPharmacy: Pharmacy;
}

// The same pharmacies the CoAssist DTP Benefit Pricing card shows. The card is a shared component.
const RETAIL: Pharmacy = { name: "CVS Pharmacy #3795", address: "1450 Riverside Drive", city: "Fairview", state: "TX", zip: "75069", phone: "(972) 555-0142" };
const MAIL_ORDER: Pharmacy = { name: "FutureScripts Home Delivery", address: "2200 Commerce Pkwy", city: "Fort Worth", state: "TX", zip: "76102", phone: "(866) 555-0199" };
const SELF_PAY: Pharmacy = { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" };

/** The PA is approved, then pricing, delivery and fulfillment. */
export const IA_PA_APPROVED: ScenarioDefinition<IassistContent> = {
  flowType: "iAssist_PA_Approved",
  intake: "erx",
  choices: { bi: "pharmacy_covered", pa: "approved" },
  recipe: IA_PA_APPROVED_RECIPE,
  content: { retail: RETAIL, mailOrder: MAIL_ORDER, selfPay: SELF_PAY, transferPharmacy: TRANSFER_PHARMACY },
};

/** The PA is denied. An appeal (started by an automation rule built in the Rules portal) is approved, then the infusion is scheduled. */
export const IA_PA_DENIED_APPEAL: ScenarioDefinition<IassistContent> = {
  flowType: "iAssist_PAP",
  intake: "erx",
  choices: { bi: "pharmacy_covered", pa: "denied" },
  recipe: IA_PA_DENIED_APPEAL_RECIPE,
  content: { retail: RETAIL, mailOrder: MAIL_ORDER, selfPay: SELF_PAY, transferPharmacy: TRANSFER_PHARMACY },
};

/**
 * The medical benefit covers it and a PA is required. The Rx transfers to an assigned pharmacy, and the order ends
 * there: no pricing, delivery, or payment.
 */
export const IA_MEDICAL_TRANSFER: ScenarioDefinition<IassistContent> = {
  flowType: "iAssist_Medical_Transfer",
  intake: "erx",
  choices: { bi: "medical_pa_required", pa: "approved" },
  recipe: IA_MEDICAL_TRANSFER_RECIPE,
  content: { retail: RETAIL, mailOrder: MAIL_ORDER, selfPay: SELF_PAY, transferPharmacy: TRANSFER_PHARMACY },
};

/**
 * Buy and Bill. The medical benefit covers it and a PA is required. The HCP buys and bills, so there is no pharmacy,
 * pricing, delivery, or payment. The PA starts on its own once BI completes (`erx` intake) and approves on a timer.
 */
export const IA_BUY_AND_BILL: ScenarioDefinition<IassistContent> = {
  flowType: "iAssist_Buy_And_Bill",
  intake: "erx",
  choices: { bi: "medical_buy_and_bill", pa: "approved", consent: "patient_text" },
  recipe: IA_BUY_AND_BILL_RECIPE,
  content: { retail: RETAIL, mailOrder: MAIL_ORDER, selfPay: SELF_PAY, transferPharmacy: TRANSFER_PHARMACY },
};

/**
 * Buy and Bill, free drug (PAP). No medical coverage, so no PA and no copay. The patient applies for the free drug
 * program, and approval sends it to the site of care.
 */
export const IA_BUY_AND_BILL_PAP: ScenarioDefinition<IassistContent> = {
  flowType: "iAssist_Buy_And_Bill_PAP",
  intake: "erx",
  choices: { bi: "no_coverage" },
  recipe: IA_BUY_AND_BILL_PAP_RECIPE,
  content: { retail: RETAIL, mailOrder: MAIL_ORDER, selfPay: SELF_PAY, transferPharmacy: TRANSFER_PHARMACY },
};

/** The scenarios of the iAssist workflow. */
export const IASSIST_FLOWS: FlowType[] = ["iAssist_PA_Approved", "iAssist_PAP", "iAssist_Medical_Transfer", "iAssist_Buy_And_Bill", "iAssist_Buy_And_Bill_PAP"];
