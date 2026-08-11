import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import activeBrand from '@patient/config/active-brand.json';

export interface PatientIdentity {
  patientName: string;
  patientDob: string;
  drugName: string;
  rxNumber: string;
  phone: string;
  email: string;
  payer: string;
  caseNumber: string;
  npi: string;
  deliveryAddress: string;
  preferredMethodOfContact: string;
  // Strength/form/route (e.g. "150 mg/6 mL Injection for IV") — admin-
  // managed alongside drugName below, so CRM/Provider/iAssist's own
  // dosage displays can read one shared value instead of each hand-typing
  // a (frequently oral-tablet-shaped) placeholder that doesn't match the
  // active brand's actual product.
  dosageForm: string;
  // Generic identity attributes — added for WF5's PrES_PAP patient-info
  // capture (see client/portals/patient/pages/PesPatientInfo.tsx), but not
  // WF5-specific themselves. Any flow could read/write these; WF5 is just
  // the first one whose UI actually lets the patient edit their own
  // identity data instead of it being a fixed pre-seeded persona.
  gender: string;
  phoneType: string;
  preferredLanguage: string;
  // Added for the Boehringer Cares PAP application (and any other
  // financial/clinical-assistance form) — WF1's case wizard never collects
  // these itself (householdSize/householdIncome exist as blank inputs on
  // Step 1, and there's no medication-history or conditions-list field at
  // all), so they live here as the one shared source both WF1 and any
  // form-filling task can read from instead of inventing new numbers.
  householdSize: string;
  householdIncome: string;
  // Rx member/BIN/PCN mirror the CVS Caremark ("cvs-caremark") found-
  // insurance record NewCaseInsurance.tsx already seeds for WF1 — rxGroup
  // is new (that record has no group number field) but is set here so any
  // consumer needing one still points at the same plan.
  memberId: string;
  rxBin: string;
  rxPcn: string;
  rxGroup: string;
  currentMedications: string;
  healthConditions: string;
}

// drugName is the one piece of Patient Portal branding that has to propagate
// to every other portal (CRM, Provider, iAssist) — Branding Admin only
// re-colors the Patient Portal, but the medication name is shared demo data.
// Sourced from the same active-brand.json the Admin screen writes to, so a
// rebrand's new drug name shows up here on the next load. Because this store
// is persisted to sessionStorage, a save from /admin also needs to write
// through to the live store directly (see Admin.tsx's handleSave) — this
// seed alone only takes effect for sessions with no cached identity yet.
const ACTIVE_DRUG_NAME = activeBrand.program.drugDisplayName || activeBrand.program.name;
const ACTIVE_DOSAGE_FORM = (activeBrand.program as { dosageForm?: string }).dosageForm ?? "";

export const PATIENT_SEED: PatientIdentity = {
  patientName: "Keanu Dixon",
  patientDob: "09/02/1964",
  drugName: ACTIVE_DRUG_NAME,
  rxNumber: "40002500",
  phone: "(555) 310-4200",
  email: "keanu.dixon@email.com",
  payer: "Commercial",
  caseNumber: "00056249",
  npi: "1234567890",
  deliveryAddress: "123 Main Street, Orlando, FL 32801",
  preferredMethodOfContact: "Text",
  dosageForm: ACTIVE_DOSAGE_FORM,
  gender: "Male",
  phoneType: "Cell",
  preferredLanguage: "English",
  householdSize: "2",
  householdIncome: "$62,000",
  memberId: "HQK883883ZZ88",
  rxBin: "003858",
  rxPcn: "A4",
  rxGroup: "RX4471",
  currentMedications: "Lisinopril 10mg once daily, Atorvastatin 20mg once daily",
  healthConditions: "Hypertension, Hyperlipidemia",
};

interface PatientStore extends PatientIdentity {
  reset: () => void;
  /** Merges partial identity updates — used by WF5's PesPatientInfo.tsx so
   *  the patient can edit their own identity data, which every other portal
   *  (CRM, Provider, Field) reads via the same shared store. */
  updateIdentity: (fields: Partial<PatientIdentity>) => void;
}

export const usePatientStore = create<PatientStore>()(
  persist(
    (set) => ({
      ...PATIENT_SEED,
      reset: () => set(PATIENT_SEED),
      updateIdentity: (fields) => set((state) => ({ ...state, ...fields })),
    }),
    {
      name: 'arx-patient-identity',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
