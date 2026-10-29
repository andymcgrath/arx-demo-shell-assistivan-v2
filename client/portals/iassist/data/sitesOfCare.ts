/**
 * Sites of care for the iAssist Buy and Bill screens. One list feeds the Medication step (site of care, HOPD NPI,
 * TIN) and the Buy and Bill step (which office), so the two always agree. Demo data. The first site is the patient's
 * own site of care (KEANU_SITE_OF_CARE_FACTS).
 */
import { KEANU_SITE_OF_CARE_FACTS } from "@/engine/WorkflowEngine";

export interface SiteOfCare {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  /** The hospital outpatient department's NPI. */
  hopdNpi: string;
  tin: string;
}

export const SITES_OF_CARE: SiteOfCare[] = [
  {
    name: KEANU_SITE_OF_CARE_FACTS.facilityName,
    address: KEANU_SITE_OF_CARE_FACTS.address,
    city: KEANU_SITE_OF_CARE_FACTS.city,
    state: KEANU_SITE_OF_CARE_FACTS.state,
    zip: KEANU_SITE_OF_CARE_FACTS.zip,
    hopdNpi: "1245319599",
    tin: "12-1234567",
  },
  { name: "Westgate Infusion Clinic", address: "820 Westgate Pkwy", city: "Orlando", state: "FL", zip: "32835", hopdNpi: "1356420610", tin: "59-2210448" },
  { name: "Orlando Health Infusion Center", address: "52 W Underwood St", city: "Orlando", state: "FL", zip: "32806", hopdNpi: "1467531721", tin: "59-0634218" },
  { name: "AdventHealth Infusion Suite", address: "601 E Rollins St", city: "Orlando", state: "FL", zip: "32803", hopdNpi: "1578642832", tin: "59-1503726" },
  { name: "Lake Eola Ambulatory Infusion", address: "100 N Eola Dr", city: "Orlando", state: "FL", zip: "32801", hopdNpi: "1689753943", tin: "59-3347815" },
];

export const siteByName = (name: string): SiteOfCare | undefined => SITES_OF_CARE.find((s) => s.name === name);

export const siteAddress = (s: SiteOfCare) => `${s.address}, ${s.city}, ${s.state} ${s.zip}`;
