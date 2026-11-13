import type { CatalogBranch, CatalogFork, CatalogLane, CatalogStep, CatalogTrigger } from "./types";

/**
 * Fork and exit entries. `ownedBy` says which block a fork is drawn under. `leadsTo` lists the blocks an outcome works with (see `CatalogExit`). `then` is written for patient forks only. `label` and `description` are left out where `forks.ts` already reads well to sales, and
 * `catalogExit` falls back to it. Aliases are sales vocabulary for the palette search. Draft entries carry a question.
 */
const step = (label: string, lane: CatalogLane, trigger: CatalogTrigger): CatalogStep => ({ label, lane, trigger });

const branch = (steps: CatalogStep[], when?: string): CatalogBranch => ({ ...(when ? { when } : {}), steps });


export const CATALOG_FORKS: CatalogFork[] = [
  {
    id: "bi",
    ownedBy: ["benefit_verification", "enrollment"],
    aliases: ["BI", "benefits investigation", "benefit verification", "coverage check"],
    exits: [
      { id: "pharmacy_covered", leadsTo: ["prior_authorization", "pa_notification", "cash_offer", "payment", "financial_assistance", "income_qualification", "provider_transfer", "pharmacy_selection", "appeal", "scheduling", "tracking"], aliases: ["pharmacy benefit", "commercial", "covered with PA", "retail coverage"] },
      { id: "pharmacy_transfer", leadsTo: ["prior_authorization", "pa_notification", "provider_transfer", "pharmacy_selection:assigned", "scheduling", "tracking"], aliases: ["transfer to SP", "assigned pharmacy", "pharmacy transfer"] },
      { id: "medical_covered", leadsTo: ["provider_transfer", "tracking"], aliases: ["medical benefit", "covered, no PA", "transfer to provider"] },
      {
        id: "medical_pa_required", leadsTo: ["prior_authorization", "pa_notification", "pharmacy_selection:assigned", "tracking"],
        label: "Medical benefit covers, PA required",
        description: "The medical benefit covers it and a PA is required. We process the Rx and transfer it to an assigned dispenser. The patient picks nothing and sees its contact details.",
        aliases: ["medical transfer", "medical PA required", "transfer for dispensing"],
      },
      {
        id: "medical_buy_and_bill", leadsTo: ["benefit_verification", "copay", "enrollment", "prior_authorization", "pa_notification", "patient_record", "copay_claim"],
        label: "Medical benefit covers, HCP buys and bills",
        description: "The medical benefit covers it and a PA is required. The HCP buys and bills the drug, so nothing ships to the patient. The HCP runs eMedBV and enrolls the patient in copay.",
        aliases: ["buy and bill", "B&B", "HCP buys and bills", "HCP administered"],
      },
      { id: "no_coverage", leadsTo: ["cash_offer", "payment", "financial_assistance", "enrollment", "patient_record", "pharmacy_selection", "scheduling", "tracking"], aliases: ["cash", "self-pay", "DTP", "uncovered", "no benefit"] },
      { id: "no_coverage_pap", leadsTo: ["pap_transfer", "income_qualification", "pharmacy_selection:assigned", "scheduling", "tracking"], aliases: ["PAP", "free drug", "patient assistance", "PSP", "patient support program"] },
    ],
  },
  {
    id: "pa",
    ownedBy: ["prior_authorization", "pa_notification"],
    aliases: ["APA", "PA", "prior auth", "prior authorization"],
    exits: [
      { id: "approved", leadsTo: ["pa_notification", "payment", "financial_assistance", "income_qualification", "provider_transfer", "pharmacy_selection", "scheduling", "patient_record", "copay_claim", "tracking"], aliases: ["approve", "approved"] },
      { id: "denied", leadsTo: ["appeal", "cash_offer", "payment", "pharmacy_selection", "scheduling", "tracking"], aliases: ["deny", "denied", "appeal"] },
    ],
  },
  {
    id: "pricing",
    ownedBy: ["payment"],
    aliases: ["pricing", "price pick", "pricing options"],
    exits: [
      { id: "retail", leadsTo: ["pharmacy_selection:store", "tracking"], then: [branch([step("The patient sees the price and picks a retail store", "patient", "click"), step("The pharmacy fills it at the counter. No address, ship date, or payment is collected", "system", "view")], "pharmacy_selection:store"), branch([step("The patient confirms the delivery address", "patient", "click"), step("The patient picks a ship date", "patient", "click"), step("The patient reviews the cost and confirms payment", "patient", "click")])], aliases: ["retail store", "pick up"] },
      { id: "mail_order", leadsTo: ["financial_assistance", "pharmacy_selection", "scheduling", "tracking"], then: [branch([step("The patient sees the price and confirms the delivery address", "patient", "click"), step("The filling pharmacy handles the date. No payment is collected", "system", "automatic")], "pharmacy_selection:store"), branch([step("The patient confirms the delivery address", "patient", "click"), step("The patient picks a ship date", "patient", "click"), step("The patient reviews the cost and confirms payment", "patient", "click")])], aliases: ["mail", "home delivery"] },
      { id: "self_pay", hiddenWith: "financial_assistance:copay", leadsTo: ["cash_offer", "financial_assistance", "pharmacy_selection", "scheduling", "tracking"], then: [branch([step("The patient accepts the self-pay offer", "patient", "click"), step("The patient confirms the delivery address", "patient", "click"), step("The patient picks a ship date", "patient", "click"), step("Our pharmacy collects payment. The patient pays by card, and nothing is charged", "patient", "click"), step("The CRM verifies the payment", "agent", "click")])], aliases: ["cash pay", "cash", "DTP"] },
    ],
  },
  {
    id: "copay",
    ownedBy: ["financial_assistance"],
    aliases: ["copay", "copay program", "copay enrollment"],
    exits: [
      { id: "enroll", leadsTo: ["pharmacy_selection", "scheduling", "tracking"], then: [branch([step("The patient enrolls in the copay program", "patient", "click"), step("The reduced price applies", "system", "automatic")])], aliases: ["enroll in copay", "reduced price"] },
      { id: "decline", leadsTo: ["pharmacy_selection", "scheduling", "tracking"], then: [branch([step("The patient declines the copay program and keeps the full price", "patient", "click")])], aliases: ["decline copay", "full price"] },
    ],
  },
  {
    id: "assistance",
    ownedBy: ["financial_assistance"],
    aliases: ["assistance", "financial assistance", "patient choice of assistance"],
    exits: [
      { id: "pap", leadsTo: ["income_qualification", "pharmacy_selection", "scheduling", "tracking"], then: [branch([step("The patient chooses the free drug program, and it activates", "patient", "click"), step("The patient sets the delivery address and ship date", "patient", "click"), step("The pharmacy ships the free drug", "system", "automatic")])], aliases: ["free drug", "PAP", "patient assistance program"] },
      { id: "copay", leadsTo: ["financial_assistance", "pharmacy_selection", "scheduling", "tracking"], then: [branch([step("The patient chooses the copay program", "patient", "click"), step("The patient sets the delivery address and ship date", "patient", "click"), step("The pharmacy ships at the copay price", "system", "automatic")])], aliases: ["copay offer", "manufacturer copay"] },
      { id: "self_pay", leadsTo: ["cash_offer", "pharmacy_selection", "scheduling", "tracking"], then: [branch([step("The patient chooses to pay out of pocket", "patient", "click"), step("The patient sets the delivery address and ship date", "patient", "click"), step("The pharmacy ships it", "system", "automatic")])], aliases: ["pay out of pocket", "pay cash after qualifying"] },
    ],
  },
  {
    id: "consent",
    ownedBy: ["enrollment"],
    aliases: ["consent", "patient consent"],
    exits: [
      { id: "patient_text", aliases: ["text consent", "patient consents"] },
      { id: "hcp_signs", aliases: ["HCP consent", "HCP signs"] },
    ],
  },
];
