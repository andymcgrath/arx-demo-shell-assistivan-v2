/**
 * The pharmacies a prescriber can send an Rx to. The Provider app's eRx form and the web enrollment form share this list, so the
 * Rx step shows the same options in both. The client's own pharmacy (`program.specialtyPharmacy`) leads it when the brand file has one.
 */
import { BRAND } from "@/brand";

export interface PharmacyOption {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export const PHARMACIES: PharmacyOption[] = [
  // The client's own pharmacy, when its brand file names one (`program.specialtyPharmacy`). It leads the list.
  ...(BRAND.program.specialtyPharmacy?.name
    ? [{ address: "", city: "", state: "", zip: "", phone: "", ...BRAND.program.specialtyPharmacy }]
    : []),
  { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" },
  { name: "Biologics", address: "456 Specialty Lane", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-1234" },
  { name: "Accredo Health Group Inc.", address: "789 Pharma Ave", city: "Tampa", state: "FL", zip: "33602", phone: "(813) 555-5678" },
  { name: "CVS Specialty", address: "321 Medication Blvd", city: "Jacksonville", state: "FL", zip: "32099", phone: "(904) 555-9012" },
  { name: "Walgreens Specialty", address: "654 Drug St", city: "Miami", state: "FL", zip: "33101", phone: "(305) 555-3456" },
  { name: "AllianceRx Walgreens Prime", address: "987 Medicine Way", city: "Fort Lauderdale", state: "FL", zip: "33301", phone: "(954) 555-7890" },
  { name: "Optum Specialty Pharmacy", address: "111 Health Lane", city: "Clearwater", state: "FL", zip: "33755", phone: "(727) 555-2345" },
  { name: "Shields Health Solutions", address: "222 Care Dr", city: "St. Petersburg", state: "FL", zip: "33701", phone: "(727) 555-6789" },
  { name: "PharMerica Specialty", address: "333 Wellness Ave", city: "Sarasota", state: "FL", zip: "34236", phone: "(941) 555-0123" },
];

