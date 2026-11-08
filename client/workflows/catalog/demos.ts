import type { CatalogWholeDemo } from "./types";

/**
 * Scenarios of workflows with no recipes yet (Standard and PAP). The lab lists each as a whole demo and does not
 * break it into blocks. Add a recipe first to change that.
 */
export const CATALOG_WHOLE_DEMOS: CatalogWholeDemo[] = [
  {
    flowType: "Fax_QS_PA_Approved",
    workflow: "standard",
    name: "Standard fax referral, PA approved",
    summary: "A faxed referral, coverage found, and a manual PA that the provider submits and that is approved.",
    aliases: ["standard", "fax", "quick start", "QS"],
    apps: ["crm", "patient", "provider", "field"],
    draft: true,
    question: "Is QS short for Quick Start? I guessed it from the flow id.",
  },
  {
    flowType: "Fax_PAP_Audit",
    workflow: "pap",
    name: "Free drug (PAP) from a fax referral",
    summary: "No insurance is found, so there is no PA. The patient applies for the free drug program, the Rx goes to the pharmacy, and the tracker follows it to delivery.",
    aliases: ["PAP", "free drug", "fax PAP", "PAP audit"],
    apps: ["crm", "patient", "provider", "field"],
  },
  {
    flowType: "PrES_PAP",
    workflow: "pap",
    name: "Free drug (PAP) from an e-signature referral (legacy)",
    summary: "The same free drug path as the fax version, with a provider e-signature intake. Legacy: kept working, no new features.",
    aliases: ["PrES", "PrES PAP", "e-sign", "esign"],
    apps: ["crm", "patient", "provider", "field"],
  },
];
