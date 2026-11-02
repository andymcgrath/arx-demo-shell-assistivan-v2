import { KEANU_SITE_OF_CARE_FACTS } from "@/engine/WorkflowEngine";
import { daysFromToday } from "@/lib/relativeDate";
import { enrollmentFormDocument, paFormDocument } from "@/brand/documents";

// The CRM case page's tab lists, related-document list, and pharmacy and site-of-care options.
export const CASE_TABS = [
  { id: "summary", label: "Case Summary" },
  { id: "documents", label: "Related Documents" },
  { id: "doc-mgmt", label: "Document Management" },
  { id: "tasks", label: "Related Tasks" },
  { id: "file-drop", label: "File Drop" },
  { id: "relations", label: "Case Relations" },
];

export const RIGHT_TABS = [
  { id: "quick-answers", label: "Quick Answers" },
  { id: "missing-info", label: "Missing Information" },
];

export interface RelatedDocument {
  fileId: string;
  fileName: string;
  dateReceived: string;
  type: string;
  pages: number;
  /** When set, clicking the row opens this URL directly instead of the enrollment-form subtab viewer. */
  href?: string;
}

export const FAX_DOCUMENTS: RelatedDocument[] = [
  {
    fileId: "FAX-2026-00431",
    fileName: enrollmentFormDocument().fileName,
    dateReceived: daysFromToday(-4),
    type: "Enrollment Form",
    pages: 3,
  },
];

// PA form. Only a brand that sets `program.documents.paForm` has one. It opens in a new tab like the
// Summary of Benefits. Shown on every flow except the PAP flows.
export const PA_FORM = paFormDocument();
export const PA_FORM_DOCUMENT: RelatedDocument | null = PA_FORM
  ? {
      fileId: "FAX-2026-00433",
      fileName: PA_FORM.fileName,
      dateReceived: daysFromToday(-2),
      type: "Prior Authorization Form",
      pages: 5,
      href: PA_FORM.file,
    }
  : null;

export interface PharmacyOption {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

/** The preferred pharmacy on the demo patient's enrollment form. It is also one of the pharmacies the agent can pick. */
export const PREFERRED_PHARMACY_NAME = "Accredo Health Group Inc.";

export const SPECIALTY_PHARMACIES: PharmacyOption[] = [
  // Leads the list — AssistRx's own specialty pharmacy, same contact details
  // iAssist.ts's SELF_PAY_PHARMACY and the case wizard's "Preferred Pharmacy"
  // default (NewCaseMedication.tsx) already use, so HUB staff manually
  // overriding the pharmacy here can pick the same CoAssist Pharmacy the
  // rest of the flow lands on by default.
  { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" },
  { name: "Biologics", address: "456 Specialty Lane", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-1234" },
  { name: PREFERRED_PHARMACY_NAME, address: "789 Pharma Ave", city: "Tampa", state: "FL", zip: "33602", phone: "(813) 555-5678" },
  { name: "CVS Specialty", address: "321 Medication Blvd", city: "Jacksonville", state: "FL", zip: "32099", phone: "(904) 555-9012" },
  { name: "Walgreens Specialty", address: "654 Drug St", city: "Miami", state: "FL", zip: "33101", phone: "(305) 555-3456" },
  { name: "AllianceRx Walgreens Prime", address: "987 Medicine Way", city: "Fort Lauderdale", state: "FL", zip: "33301", phone: "(954) 555-7890" },
  { name: "Optum Specialty Pharmacy", address: "111 Health Lane", city: "Clearwater", state: "FL", zip: "33755", phone: "(727) 555-2345" },
  { name: "Shields Health Solutions", address: "222 Care Dr", city: "St. Petersburg", state: "FL", zip: "33701", phone: "(727) 555-6789" },
  { name: "PharMerica Specialty", address: "333 Wellness Ave", city: "Sarasota", state: "FL", zip: "34236", phone: "(941) 555-0123" },
];

// PAP/Income Verification flows (Fax_PAP_Audit, PrES_PAP) route through
// ARx Pharmacy in addition to the standard specialty pharmacy list — see
// isPapFlow below, which gates this addition onto SPECIALTY_PHARMACIES.
export const ARX_PHARMACY: PharmacyOption = {
  name: "ARx Pharmacy",
  address: "1 ARx Way",
  city: "Orlando",
  state: "FL",
  zip: "32819",
  phone: "(800) 555-2790",
};

// iAssist_PAP (WF5) dispenses in-office rather than shipping through a
// specialty pharmacy — "Keanu to facility," not "pharmacy to Keanu." The
// Office Dispense dropdown swaps SPECIALTY_PHARMACIES for this list of
// sites of care instead. Keanu's own site (built from
// KEANU_SITE_OF_CARE_FACTS, the same facts Field Portal reads via
// getLiveWorkItems/liveSOCs — see WorkflowEngine.ts) leads the list; the
// rest are mocked decoy clinics so the dropdown doesn't look suspiciously
// short next to the other three.
export const SITES_OF_CARE: PharmacyOption[] = [
  {
    name: KEANU_SITE_OF_CARE_FACTS.facilityName,
    address: KEANU_SITE_OF_CARE_FACTS.address,
    city: KEANU_SITE_OF_CARE_FACTS.city,
    state: KEANU_SITE_OF_CARE_FACTS.state,
    zip: KEANU_SITE_OF_CARE_FACTS.zip,
    phone: KEANU_SITE_OF_CARE_FACTS.contactPhone,
  },
  { name: "Westgate Infusion Clinic", address: "8323 International Dr", city: "Orlando", state: "FL", zip: "32819", phone: "(407) 555-4821" },
  { name: "Orlando Health Infusion Center", address: "1222 S Orange Ave", city: "Orlando", state: "FL", zip: "32806", phone: "(407) 555-2290" },
  { name: "AdventHealth Infusion Suite", address: "601 E Rollins St", city: "Orlando", state: "FL", zip: "32803", phone: "(407) 555-6634" },
  { name: "Lake Eola Ambulatory Infusion", address: "200 S Eola Dr", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-7712" },
];
