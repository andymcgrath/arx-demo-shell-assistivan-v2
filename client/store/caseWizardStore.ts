import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PATIENT_SEED } from "./patientStore";

/**
 * caseWizardStore — persisted, session-scoped state for every step of the
 * iAssist eRx case-creation wizard (Patient / Medication / Insurance /
 * Clinical / Prior Authorization / Rx).
 *
 * Each step page used to keep its fields in local useState, which meant
 * hitting the wizard's Back button (or Next, then Back) silently threw away
 * whatever the user had typed — nothing else in this app works that way.
 * patientStore.ts already persists patient identity across portals the same
 * way (Zustand + sessionStorage); this does the same thing for the wizard's
 * own form fields, plus a couple of small cross-step defaults (Step 4's
 * diagnosis feeding Step 5, Step 1's address/prescriber feeding Step 6).
 *
 * Demo-only view toggles (which pharmacy-mode tab is showing, which PA
 * state is showing, in-progress search box text) are NOT persisted here —
 * those are presentation state, not "answers," and resetting them on
 * navigation is fine.
 */

/** "Keanu Dixon" -> { first: "Keanu", last: "Dixon" } */
function splitName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return { first: first ?? "", last: rest.join(" ") };
}

/** "09/02/1964" (MM/DD/YYYY) -> "1964-09-02" for a <input type="date"> */
export function toIsoDate(mmddyyyy: string) {
  const [mm, dd, yyyy] = mmddyyyy.split("/");
  if (!mm || !dd || !yyyy) return "";
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** "1964-09-02" -> "09/02/1964" */
export function isoDateToMmddyyyy(iso: string) {
  const [yyyy, mm, dd] = iso.split("-");
  if (!mm || !dd || !yyyy) return "";
  return `${mm}/${dd}/${yyyy}`;
}

/** "123 Main Street, Orlando, FL 32801" -> { addr1, city, state, zip } */
function parseDeliveryAddress(address: string) {
  const [addr1 = "", city = "", stateZip = ""] = address.split(",").map((s) => s.trim());
  const [state = "", zip = ""] = stateZip.split(/\s+/);
  return { addr1, city, state, zip };
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  FL: "Florida",
  NY: "New York",
  NJ: "New Jersey",
  CT: "Connecticut",
  PA: "Pennsylvania",
};

/** "FL" -> "Florida"; anything already spelled out passes through unchanged. */
export function expandStateAbbreviation(state: string) {
  return STATE_ABBREVIATIONS[state.toUpperCase()] ?? state;
}

// Prescriber directory — shared between Step 1 (where it's picked) and
// Step 6 (where the pick becomes the default shipping office contact).
export const PRESCRIBER_OPTIONS = [{ id: "1", npi: "1234567890", name: "Sarah Chen, MD" }];

export function prescriberNameById(id: string) {
  return PRESCRIBER_OPTIONS.find((p) => p.id === id)?.name ?? "";
}

// Medication directory — shared between Step 2 (Medication Details, where
// it's picked/edited) and the Dashboard's "Commonly Prescribed" row (which
// seeds a medication choice before Step 2 is ever visited).
export const MEDICATION_OPTIONS = [
  "Assistivan 10 MG ORAL TABLET 100 EA NDC 123456789",
  "Assistimab 40MG/ML SUBCUTANEOUS SOLN PREF SRY 1ML",
  "Ramoni 20MG ORAL TABLET 30 EA",
  "Voloxivan 5MG/ML INJECTION 10ML VIAL",
];

// JCode/CPT pairs keyed by medication — prefills Step 2's billing code
// fields as soon as a medication is picked (from Step 2's own dropdown, or
// from the Dashboard's Commonly Prescribed row), instead of leaving them
// blank for the user to look up manually.
export const MEDICATION_CODES: Record<string, { jcode: string; cptCode: string }> = {
  "Assistivan 10 MG ORAL TABLET 100 EA NDC 123456789": { jcode: "J8499", cptCode: "99070" },
  "Assistimab 40MG/ML SUBCUTANEOUS SOLN PREF SRY 1ML": { jcode: "J3590", cptCode: "96401" },
  "Ramoni 20MG ORAL TABLET 30 EA": { jcode: "J8499", cptCode: "99070" },
  "Voloxivan 5MG/ML INJECTION 10ML VIAL": { jcode: "J3490", cptCode: "96413" },
};

export type SignSource = "patient" | "guardian" | "skip";
export type ConsentMethod = "now" | "email" | "text";

export interface PhoneEntry {
  id: string;
  number: string;
  type: "Cell" | "Home" | "Work";
  bestTime: string;
  leaveMessage: "Yes" | "No";
}

export interface PatientData {
  firstName: string;
  lastName: string;
  dob: string;
  sex: string;
  heightUnit: "in" | "cm";
  weightUnit: "lbs" | "kg";
  height: string;
  weight: string;
  ssnLast4: string;
  language: string;
  otherLanguage: string;
  hasAllergies: string;
  allergies: string;
  addr1: string;
  showAddr2: boolean;
  addr2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phones: PhoneEntry[];
  showAdditionalContact: boolean;
  altFirstName: string;
  altLastName: string;
  altRelationship: string;
  altRelationshipOther: string;
  prescriber: string;
  signSource: SignSource;
  guardianFirst: string;
  guardianLast: string;
  consentMethod: ConsentMethod;
  phiAgreed: boolean;
  hasSignature: boolean;
  householdSize: string;
  householdIncome: string;
}

export interface MedicationData {
  medication: string;
  jcode: string;
  cptCode: string;
  form: string;
  quantity: string;
  daysSupply: string;
  pharmacyMode: "standard" | "soc" | "ldd";
  selectedPharmacy: string;
  zip: string;
  siteOfCare: string;
  hopdNpi: string;
  tin: string;
  specialtyPharmacy: "yes" | "no" | "";
  lddPharmacy: string;
}

export interface ManualInsurance {
  id: string;
  kind: "medical" | "pharmacy";
  companyName: string;
  type: string;
  groupNumber: string;
  memberId: string;
  relationship: string;
  cardholderDob: string;
  cardholderFirst: string;
  cardholderLast: string;
  phone: string;
  fax: string;
  cob: string;
}

export interface SelectedInsurance {
  payer: string;
  planType: string;
  memberId: string;
  pbmPhone: string;
}

export interface InsuranceData {
  searchState: "searching" | "found" | "none";
  preferredId: string;
  manualInsurances: ManualInsurance[];
  notInsured: boolean;
}

export interface ClinicalData {
  selectedIcd: string;
  diagnosisDate: string;
  priorTherapy: "yes" | "no" | "";
  contraindications: "yes" | "no" | "";
}

export interface PAData {
  dynamicAnswers: Record<number, "yes" | "no" | "">;
  lmn: "yes" | "no" | "";
  contactName: string;
  diagnosis: string;
  treatmentStart: string;
  treatmentPlan: string;
  reasonForPrescribing: string;
}

export interface RxData {
  form: string;
  quantity: string;
  daysSupply: string;
  refills: string;
  substitutions: string;
  sigManualEdit: boolean;
  sigText: string;
  notesForPharmacy: string;
  submittingOffice: string;
  officeContactName: string;
  addressLine1: string;
  showAddressLine2: boolean;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
}

export const AUTO_SIG =
  "Infuse subcutaneously. Pump rate: titrate initial and maintenance IV per product label. " +
  "Vascular access: central. IV method: pump. Infuse 10 gms IV every 2 weeks; split total dose over 3 days " +
  "(where clinically appropriate, round to nearest vial size). Infuse total dose of immune globulin " +
  "subcutaneously in 1 to multiple sites. Premeds (30 mins before IV): diphenhydramine 10mg PO for mild " +
  "reactions, increase to 20mg for moderate/severe; acetaminophen 10-15mg/kg PO. PRN meds: epinephrine " +
  "auto-inject 0.3mg IM for anaphylaxis.";

function buildInitialState() {
  const { first: patientFirst, last: patientLast } = splitName(PATIENT_SEED.patientName);
  const deliveryAddr = parseDeliveryAddress(PATIENT_SEED.deliveryAddress);

  const patient: PatientData = {
    firstName: patientFirst,
    lastName: patientLast,
    dob: toIsoDate(PATIENT_SEED.patientDob),
    sex: "male",
    heightUnit: "in",
    weightUnit: "lbs",
    height: "6' 1\"",
    weight: "195",
    ssnLast4: "7734",
    language: "english",
    otherLanguage: "",
    hasAllergies: "yes",
    allergies: "Penicillin, Sulfa drugs",
    addr1: deliveryAddr.addr1,
    showAddr2: false,
    addr2: "",
    city: deliveryAddr.city,
    state: deliveryAddr.state,
    zip: deliveryAddr.zip,
    email: PATIENT_SEED.email,
    phones: [
      { id: crypto.randomUUID(), number: PATIENT_SEED.phone, type: "Cell", bestTime: "Afternoon (12:00 pm - 4:00 pm)", leaveMessage: "Yes" },
    ],
    showAdditionalContact: false,
    altFirstName: "",
    altLastName: "",
    altRelationship: "",
    altRelationshipOther: "",
    prescriber: PRESCRIBER_OPTIONS[0].id,
    signSource: "patient",
    guardianFirst: "",
    guardianLast: "",
    consentMethod: "now",
    phiAgreed: false,
    hasSignature: false,
    householdSize: "",
    householdIncome: "",
  };

  const medication: MedicationData = {
    medication: MEDICATION_OPTIONS[0],
    jcode: MEDICATION_CODES[MEDICATION_OPTIONS[0]].jcode,
    cptCode: MEDICATION_CODES[MEDICATION_OPTIONS[0]].cptCode,
    form: "",
    quantity: "",
    daysSupply: "",
    pharmacyMode: "standard",
    selectedPharmacy: "CoAssist",
    zip: "",
    siteOfCare: "",
    hopdNpi: "",
    tin: "",
    specialtyPharmacy: "",
    lddPharmacy: "Accredo",
  };

  const insurance: InsuranceData = {
    searchState: "found",
    preferredId: "cvs-caremark",
    manualInsurances: [],
    notInsured: false,
  };

  const clinical: ClinicalData = {
    selectedIcd: "",
    diagnosisDate: "",
    priorTherapy: "",
    contraindications: "",
  };

  const pa: PAData = {
    dynamicAnswers: {},
    lmn: "",
    contactName: "",
    diagnosis: "",
    treatmentStart: "",
    treatmentPlan: "",
    reasonForPrescribing: "",
  };

  const rx: RxData = {
    form: "Tablet",
    quantity: "30",
    daysSupply: "30",
    refills: "1",
    substitutions: "Dispense as written",
    sigManualEdit: false,
    sigText: AUTO_SIG,
    notesForPharmacy: "",
    submittingOffice: "Four Oaks Cardio",
    officeContactName: "",
    addressLine1: "",
    showAddressLine2: false,
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
  };

  return { patient, medication, insurance, selectedInsurance: null as SelectedInsurance | null, clinical, pa, rx };
}

interface CaseWizardStore {
  patient: PatientData;
  medication: MedicationData;
  insurance: InsuranceData;
  selectedInsurance: SelectedInsurance | null;
  clinical: ClinicalData;
  pa: PAData;
  rx: RxData;
  setPatient: (patch: Partial<PatientData>) => void;
  setMedication: (patch: Partial<MedicationData>) => void;
  setInsurance: (patch: Partial<InsuranceData>) => void;
  setSelectedInsurance: (insurance: SelectedInsurance | null) => void;
  setClinical: (patch: Partial<ClinicalData>) => void;
  setPA: (patch: Partial<PAData>) => void;
  setRx: (patch: Partial<RxData>) => void;
  resetCaseWizard: () => void;
}

export const useCaseWizardStore = create<CaseWizardStore>()(
  persist(
    (set) => ({
      ...buildInitialState(),
      setPatient: (patch) => set((s) => ({ patient: { ...s.patient, ...patch } })),
      setMedication: (patch) => set((s) => ({ medication: { ...s.medication, ...patch } })),
      setInsurance: (patch) => set((s) => ({ insurance: { ...s.insurance, ...patch } })),
      setSelectedInsurance: (insurance) => set({ selectedInsurance: insurance }),
      setClinical: (patch) => set((s) => ({ clinical: { ...s.clinical, ...patch } })),
      setPA: (patch) => set((s) => ({ pa: { ...s.pa, ...patch } })),
      setRx: (patch) => set((s) => ({ rx: { ...s.rx, ...patch } })),
      resetCaseWizard: () => set(buildInitialState()),
    }),
    {
      name: "arx-case-wizard",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
