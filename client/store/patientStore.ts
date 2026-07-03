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
  drugName: "Assistivan",
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
    }
  )
);
