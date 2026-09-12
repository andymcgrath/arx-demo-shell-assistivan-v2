import { create } from "zustand";

/**
 * Tiny, non-persisted toast channel scoped to the patient portal's iPhone
 * mockup (rendered by DemoShell.tsx inside `.i17pro__screen`).
 *
 * Deliberately separate from sonner's global `toast()` from "sonner": sonner
 * has exactly one shared toast queue for the whole app (see App.tsx's
 * `<Toaster position="top-right" richColors />`), and every mounted
 * `<Toaster/>` subscribes to and renders ALL toasts pushed via `toast()` —
 * there's no built-in way to scope a toast to one part of the page. CRM's
 * FulfilmentCenter.tsx already uses that global sonner toast for its own
 * confirmations; reusing it here would either keep floating over the whole
 * demo shell (the original problem) or, if the shared `<Toaster/>` were
 * moved inside the phone frame, start swallowing CRM's toasts too.
 *
 * This store exists so CopayEnroll.tsx can request a confirmation message
 * and DemoShell.tsx (which owns the phone frame and stays mounted across
 * the CopayEnroll -> BenefitPricing navigation) can render it confined to
 * that frame. Not wrapped in zustand's `persist` middleware, unlike
 * demoStore.ts — a toast message is transient UI state and shouldn't survive
 * a page refresh via sessionStorage.
 */
interface PatientToastState {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
}

export const usePatientToastStore = create<PatientToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}));
