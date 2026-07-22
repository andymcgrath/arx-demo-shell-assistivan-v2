import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

export const PATIENT_SEED: PatientIdentity = {
  patientName: "Keanu Reeves",
  patientDob: "09/02/1964",
  drugName: "Jascayd",
  rxNumber: "40002500",
  phone: "(555) 310-4200",
  email: "keanu.reeves@email.com",
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
      // Bumped for the Boehringer/Jascayd rebrand: any tab with a
      // pre-rebrand snapshot in sessionStorage (drugName: "Assistivan")
      // would otherwise keep rehydrating that stale value forever — no
      // reset action in the app touches this store, only demoStore's own
      // state, so the old drug name could outlive every other branding
      // fix. A version mismatch makes zustand discard the stale snapshot
      // and fall back to the current PATIENT_SEED instead of merging it.
      version: 1,
    }
  )
);
