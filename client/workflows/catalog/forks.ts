import type { CatalogFork } from "./types";

/**
 * Fork and exit entries. `label` and `description` are left out where `forks.ts` already reads well to sales, and
 * `catalogExit` falls back to it. Aliases are sales vocabulary for the palette search. Draft entries carry a question.
 */
export const CATALOG_FORKS: CatalogFork[] = [
  {
    id: "bi",
    aliases: ["BI", "benefits investigation", "benefit verification", "coverage check"],
    exits: [
      { id: "pharmacy_covered", aliases: ["pharmacy benefit", "commercial", "covered with PA", "retail coverage"] },
      { id: "pharmacy_transfer", aliases: ["transfer to SP", "assigned pharmacy", "pharmacy transfer"] },
      { id: "medical_covered", aliases: ["medical benefit", "covered, no PA", "transfer to provider"] },
      {
        id: "medical_pa_required",
        label: "Medical benefit covers, PA required",
        description: "The medical benefit covers it and a PA is required. We process the Rx and transfer it to an assigned dispenser. The patient picks nothing and sees its contact details.",
        aliases: ["medical transfer", "medical PA required", "transfer for dispensing"],
      },
      {
        id: "medical_buy_and_bill",
        label: "Medical benefit covers, HCP buys and bills",
        description: "The medical benefit covers it and a PA is required. The HCP buys and bills the drug, so nothing ships to the patient. The HCP runs eMedBV and enrolls the patient in copay.",
        aliases: ["buy and bill", "B&B", "HCP buys and bills", "HCP administered"],
      },
      { id: "no_coverage", aliases: ["cash", "self-pay", "DTP", "uncovered", "no benefit"] },
      { id: "no_coverage_pap", aliases: ["PAP", "free drug", "patient assistance", "PSP", "patient support program"] },
    ],
  },
  {
    id: "pa",
    aliases: ["APA", "PA", "prior auth", "prior authorization"],
    exits: [
      { id: "approved", aliases: ["approve", "approved"] },
      { id: "denied", aliases: ["deny", "denied", "appeal"] },
    ],
  },
  {
    id: "pricing",
    aliases: ["pricing", "price pick", "pricing options"],
    exits: [
      { id: "retail", aliases: ["retail store", "pick up"] },
      { id: "mail_order", aliases: ["mail", "home delivery"] },
      { id: "self_pay", aliases: ["cash pay", "cash", "DTP"] },
    ],
  },
  {
    id: "copay",
    aliases: ["copay", "copay program", "copay enrollment"],
    exits: [
      { id: "enroll", aliases: ["enroll in copay", "reduced price"] },
      { id: "decline", aliases: ["decline copay", "full price"] },
    ],
  },
  {
    id: "consent",
    aliases: ["consent", "patient consent"],
    exits: [
      { id: "patient_text", aliases: ["text consent", "patient consents"] },
      { id: "hcp_signs", aliases: ["HCP consent", "HCP signs"] },
    ],
  },
];
