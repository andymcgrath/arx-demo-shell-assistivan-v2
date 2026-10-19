/**
 * Pharmacy selection. `crm` lets the agent change the dispensing pharmacy once a price is chosen. `site_of_care` is where the appeal sends the Rx.
 */
import type { IaRule } from "./shared";

export const PHARMACY_SELECTION_RULES: IaRule[] = [
  {
    // The CRM can change the dispensing pharmacy once a price is chosen.
    id: "pharmacy_selection.select_pharmacy.crm",
    on: "SELECT_PHARMACY",
    scope: { module: "pharmacy_selection", props: { variant: "crm" } },
    when: (d) => d.paStatus === "approved" && d.pricingOption !== null && d.pharmacyStatus === "none",
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy ?? null }),
    emit: { portal: "crm", step: 5 },
  },
  {
    // WF5 dispenses to a site of care. Picking it is what the Triage to Pharmacy stage shows as done.
    id: "pharmacy_selection.select_pharmacy.site_of_care",
    on: "SELECT_PHARMACY",
    scope: { module: "pharmacy_selection", props: { variant: "site_of_care" } },
    when: (d) => d.appealStatus !== "none" && d.pharmacyStatus === "none",
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy ?? null, dispatchStatus: "selected" }),
    emit: { portal: "crm", step: 5 },
  },
];
