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
};

interface PatientStore extends PatientIdentity {
  reset: () => void;
}

export const usePatientStore = create<PatientStore>()(
  persist(
    (set) => ({
      ...PATIENT_SEED,
      reset: () => set(PATIENT_SEED),
    }),
    {
      name: 'arx-patient-identity',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
