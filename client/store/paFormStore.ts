/**
 * paFormStore: what the provider has entered on the PA questions form (the clinical answers and the Letter of Necessity).
 *
 * It lives here, not in the form's own state, so an Undo of the submit leaves the form as the provider filled it. Undo
 * rewinds the workflow data, and the form remounts. In memory only, so a reload starts clean. Cleared on every reset
 * (Reset All, a stage jump, a stale session), the same places the other demo stores clear.
 */
import { create } from "zustand";

export interface PaFormState {
  answers: Record<number, string | null>;
  lonRequired: string | null;
  lonFile: { file: string; name: string } | null;
  lonSubmitted: boolean;
}

const EMPTY: PaFormState = { answers: {}, lonRequired: null, lonFile: null, lonSubmitted: false };

interface PaFormStore extends PaFormState {
  setAnswer: (index: number, value: string | null) => void;
  set: (fields: Partial<PaFormState>) => void;
  reset: () => void;
}

export const usePaFormStore = create<PaFormStore>()((set) => ({
  ...EMPTY,
  setAnswer: (index, value) => set((s) => ({ answers: { ...s.answers, [index]: value } })),
  set: (fields) => set(fields),
  reset: () => set(EMPTY),
}));
