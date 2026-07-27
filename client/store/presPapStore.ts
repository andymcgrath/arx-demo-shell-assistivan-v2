/**
 * presPapStore — WF5 (PrES_PAP) captured application data
 *
 * Isolated to WF5, mirroring the isolation already established for its
 * dedicated XState machine (client/workflows/presPap.ts) and provider/patient
 * placeholder screens. This holds the data captured by the new Pes* patient
 * pages that doesn't fit either existing store:
 *   - patientStore.ts is for identity (name, DOB, address, phone...) shared
 *     by every flow — WF5 writes into it via updateIdentity() for the
 *     generic identity fields (see PesPatientInfo.tsx).
 *   - WorkflowData (types.ts) is for cross-portal progression STATUS
 *     (enrollmentStatus, consentStatus, incomeStatus, papStatus...) — WF5
 *     reuses the existing fields/events there unchanged (see presPap.ts).
 *   - This store is for the actual captured VALUES that are specific to
 *     WF5's e-signature/PAP application (consent signatures, household
 *     income, PAP terms agreement) and don't belong in either of the above.
 *
 * Not currently read by any other portal, but kept as its own store (rather
 * than component-local state) so it's available to CRM/Field/etc. later
 * without another architecture change — consistent with the "central core
 * data" principle the rest of WF5 follows.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PresPapApplicationData {
  // Attestation (PesAttestation.tsx)
  hasPrescription: 'Yes' | 'No' | null;
  // Patient Consent (PesConsent.tsx) — three separate consent+signature blocks
  healthInfoConsent: 'Yes' | 'No' | null;
  healthInfoSignature: string;
  privacyConsent: 'Yes' | 'No' | null;
  privacySignature: string;
  callsConsent: 'Yes' | 'No' | null;
  callsSignature: string;
  cellPhone: string;
  // Income Verification (PesIncomeConsent.tsx / PesIncomeSubmission.tsx)
  incomeConsent: 'Yes' | 'No' | null;
  incomeSignature: string;
  householdSize: string;
  annualHouseholdIncome: string;
  // PAP Terms (PesPapTerms.tsx)
  agreePAPTerms: 'Yes' | 'No' | null;
}

export const PRES_PAP_APPLICATION_SEED: PresPapApplicationData = {
  hasPrescription: null,
  healthInfoConsent: null,
  healthInfoSignature: "",
  privacyConsent: null,
  privacySignature: "",
  callsConsent: null,
  callsSignature: "",
  cellPhone: "",
  incomeConsent: null,
  incomeSignature: "",
  householdSize: "",
  annualHouseholdIncome: "",
  agreePAPTerms: null,
};

interface PresPapStore extends PresPapApplicationData {
  setField: <K extends keyof PresPapApplicationData>(field: K, value: PresPapApplicationData[K]) => void;
  setFields: (fields: Partial<PresPapApplicationData>) => void;
  reset: () => void;
}

export const usePresPapStore = create<PresPapStore>()(
  persist(
    (set) => ({
      ...PRES_PAP_APPLICATION_SEED,
      setField: (field, value) => set((state) => ({ ...state, [field]: value })),
      setFields: (fields) => set((state) => ({ ...state, ...fields })),
      reset: () => set(PRES_PAP_APPLICATION_SEED),
    }),
    {
      name: 'arx-prespap-application',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
