/**
 * Pharmacy selection. `crm` lets the agent change the dispensing pharmacy once a price is chosen. `site_of_care` is where the appeal sends the Rx.
 */
import { siteOfCareUnlocked, type IaRule } from "./shared";

/** How long after triage the dispensing pharmacy starts the order. */
const FILL_RX_MS = 2000;

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
    // Free drug: the agent triages after the patient confirms the appointment date. An appeal triages any time.
    when: (d) => siteOfCareUnlocked(d) && d.pharmacyStatus === "none" && (d.papStatus !== "active" || d.infusionDate !== null),
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy ?? null, dispatchStatus: "selected" }),
    emit: { portal: "crm", step: 5 },
    // Free drug (`system`): triage hands the Rx to the dispensing pharmacy, which starts the order. Order Status then
    // takes the agent through Ready, Shipped, and Delivered. An appeal ends at triage, so it never has an active PAP.
    then: { trigger: "system", id: "fill-rx", after: FILL_RX_MS, when: (d) => d.papStatus === "active", send: () => ({ type: "FILL_RX" }) },
  },
];
