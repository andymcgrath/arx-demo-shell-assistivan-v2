/**
 * The diagnosis the active brand's drug treats. Screens read it here and never hardcode a code. A brand with no
 * `indication` returns null, and the HCP picks a diagnosis as before.
 */
import { BRAND } from "./index";

/** Same shape the iAssist diagnosis search stores: "L50.1 — Idiopathic urticaria". */
export function indicationDiagnosis(): string | null {
  const i = BRAND.program.indication;
  return i ? `${i.icd10} — ${i.icd10Label}` : null;
}

/** "L50.1: Idiopathic urticaria", as the Buy and Bill summary shows it. */
export function indicationSummary(): string | null {
  const i = BRAND.program.indication;
  return i ? `${i.icd10}: ${i.icd10Label}` : null;
}

export function indicationRationale(): string {
  const i = BRAND.program.indication;
  return i ? i.rationale.replace("{drug}", BRAND.program.drugDisplayName) : "";
}

export function indicationTreatment(): string {
  return BRAND.program.indication?.currentTreatment ?? "";
}
