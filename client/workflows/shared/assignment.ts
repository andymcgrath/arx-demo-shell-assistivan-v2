/**
 * An assigned pharmacy: the scenario hands the Rx to one pharmacy, and the patient has nothing to choose. CoAssist
 * (`pharmacy_transfer`) and iAssist (`pharmacy_selection` variant `assigned`) both use it, so it lives here.
 */
import type { Pharmacy, WorkflowData } from "@/engine/types";
import { BRAND } from "@/brand";

/**
 * The pharmacy a transfer hands the Rx to. It comes from the brand file (`program.transferPartner`) so the name and
 * phone number are the client's. A brand with none falls back to the placeholder retail pharmacy.
 */
export const TRANSFER_PHARMACY: Pharmacy = BRAND.program.transferPartner ?? {
  name: "CVS Pharmacy #3795",
  address: "210 N Orange Ave",
  city: "Orlando",
  state: "FL",
  zip: "32801",
  phone: "(407) 555-0142",
};

/** The selected pharmacy, when the BI exit assigned one. Nothing otherwise. */
export const assignedPharmacy = (d: WorkflowData, s: { content: { transferPharmacy: Pharmacy } }): Partial<WorkflowData> =>
  d.pharmacyAssigned ? { selectedPharmacy: s.content.transferPharmacy } : {};
