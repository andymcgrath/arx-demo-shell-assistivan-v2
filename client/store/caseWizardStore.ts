import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * caseWizardStore — carries the insurance picked in Step 3 (Insurance)
 * forward to Step 5 (Prior Authorization), so the "Payer details" section
 * there can show/prefill based on what was actually selected instead of
 * being a disconnected free-text section. Session-scoped like
 * patientStore.ts, and just as isolated from the shared XState workflow
 * machine — this only threads state between the case-creation steps
 * themselves.
 */
export interface SelectedInsurance {
  payer: string;
  planType: string;
  memberId: string;
  pbmPhone: string;
}

interface CaseWizardStore {
  selectedInsurance: SelectedInsurance | null;
  setSelectedInsurance: (insurance: SelectedInsurance | null) => void;
}

export const useCaseWizardStore = create<CaseWizardStore>()(
  persist(
    (set) => ({
      selectedInsurance: null,
      setSelectedInsurance: (insurance) => set({ selectedInsurance: insurance }),
    }),
    {
      name: "arx-case-wizard",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
