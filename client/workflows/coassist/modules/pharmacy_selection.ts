/**
 * Pharmacy selection: Coverage's one-tap network pick must come before the generic pick. The first matching rule wins.
 */
import type { CoaRule } from "./shared";
import { inFulfillmentTail } from "./shared";

export const PHARMACY_SELECTION_RULES: CoaRule[] = [
  {
    // Coverage: one tap picks a network pharmacy and sets pricing in the same action. Must come before the generic SELECT_PHARMACY.
    id: "pharmacy_selection.select_pharmacy.coverage",
    on: "SELECT_PHARMACY",
    scope: { module: "pharmacy_selection", props: { variant: "network" } },
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, e) => ({ pricingOption: "retail", selectedPharmacy: e.pharmacy }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "pharmacy_selection.select_pharmacy",
    on: "SELECT_PHARMACY",
    // An assigned pharmacy (transfer branch) is not the patient's to change.
    when: (d) => !d.pharmacyAssigned && inFulfillmentTail(d),
    set: (_d, e) => ({ selectedPharmacy: e.pharmacy }),
    emit: { portal: "crm", step: 5 },
  },
];
