/**
 * The documents on an HCP-administered case (Buy and Bill, with or without copay, and free drug). iAssist, the CRM, and
 * the Field portal all read this one list, so a document that exists in one app exists in the others. A file exists
 * once its step has happened. The files are representative samples in `public/`. Nothing uploads.
 */
import type { WorkflowData } from "@/engine/types";
import { enrollmentFormDocument, paFormDocument, summaryOfBenefitsDocument } from "./documents";

export interface CaseDocument {
  /** A stable id, for example "DOC-2026-00431". */
  id: string;
  /** The file name the apps show. */
  name: string;
  /** Path of the sample PDF. */
  file: string;
  type: string;
  pages: number;
}

export function caseDocuments(d: WorkflowData, freeDrug = false): CaseDocument[] {
  const docs: CaseDocument[] = [];
  if (d.enrollmentStatus !== "none") docs.push({ id: "DOC-2026-00431", name: "EnrollmentForm.pdf", file: enrollmentFormDocument().file, type: "Enrollment Form", pages: 3 });
  if (d.consentStatus === "confirmed") docs.push({ id: "DOC-2026-00432", name: "ConsentForm.pdf", file: "/docs/consent-form.pdf", type: "Consent Form", pages: 1 });
  if (d.medbvStatus === "complete" && !freeDrug) docs.push({ id: "DOC-2026-00433", name: "SummaryOfBenefits.pdf", file: summaryOfBenefitsDocument().file, type: "Summary of Benefits", pages: 2 });
  if (freeDrug && d.papStatus === "active") docs.push({ id: "DOC-2026-00434", name: "FreeDrugApplication.pdf", file: "/docs/free-drug-application.pdf", type: "Free Drug Application", pages: 1 });
  if (d.paStatus === "submitted" || d.paStatus === "approved" || d.paStatus === "denied") {
    docs.push({ id: "DOC-2026-00435", name: "PriorAuthorizationForm.pdf", file: paFormDocument()?.file ?? "/docs/prior-authorization-form.pdf", type: "Prior Authorization Form", pages: 5 });
  }
  if (d.paStatus === "approved") docs.push({ id: "DOC-2026-00436", name: "PAApprovalNotice.pdf", file: "/docs/pa-approval-notice.pdf", type: "PA Approval Notice", pages: 1 });
  return docs;
}
