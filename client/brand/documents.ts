/**
 * The PDFs the active brand shows. Screens read these and never hardcode a path or file name.
 * A brand sets them in `brand.json` under `program.documents`. Without an entry the enrollment form
 * and the summary of benefits fall back to the shared files in `public/`. The PA form has no
 * fallback: a brand with no `paForm` shows no PA form.
 */
import { BRAND } from "./index";
import type { BrandDocument } from "./schema";

const DEFAULT_ENROLLMENT_FORM: BrandDocument = {
  file: "/enrollment-form.pdf",
  fileName: "Enrollment_Form_KDixon_051526.pdf",
};

const DEFAULT_SUMMARY_OF_BENEFITS: BrandDocument = {
  file: "/summary-of-benefits.pdf",
  fileName: "Summary_of_Benefits.pdf",
};

export function enrollmentFormDocument(): BrandDocument {
  return BRAND.program.documents?.enrollmentForm ?? DEFAULT_ENROLLMENT_FORM;
}

export function summaryOfBenefitsDocument(): BrandDocument {
  return BRAND.program.documents?.summaryOfBenefits ?? DEFAULT_SUMMARY_OF_BENEFITS;
}

/** `undefined` when the brand has no PA form. */
export function paFormDocument(): BrandDocument | undefined {
  return BRAND.program.documents?.paForm;
}
