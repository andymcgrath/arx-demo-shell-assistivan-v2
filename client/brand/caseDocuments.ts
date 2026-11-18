/**
 * The documents on a case, for every scenario. iAssist, the CRM, and the Field portal all read this one list, so a
 * document that exists in one app exists in the others with the same id, name, type, and date. A file exists once its
 * step has happened. The files are representative samples in `public/`. Nothing uploads.
 *
 * Scenario differences arrive as options (see `caseDocumentOptions`), never as `flowType ===` checks.
 */
import type { WorkflowData } from "@/engine/types";
import { enrollmentFormDocument, paFormDocument, summaryOfBenefitsDocument } from "./documents";

export interface CaseDocument {
  /** A stable id, for example "DOC-2026-00431". Faxed documents on a fax-intake scenario use "FAX-". */
  id: string;
  /** The file name the apps show. */
  name: string;
  /** Path of the sample PDF. */
  file: string;
  type: string;
  pages: number;
  /** How many days before today the file arrived. 0 is today. The apps format it. */
  daysAgo: number;
}

export interface CaseDocumentOptions {
  /** Free drug (PAP): the application replaces the Summary of Benefits. */
  freeDrug?: boolean;
  /** Fax intake: the enrollment form and the PA form arrive by fax. */
  fax?: boolean;
  /** The HCP submits the case in iAssist, so the enrollment form is on file from enrollment. */
  hcp?: boolean;
}

/** Sample file for an HCP-attached name. Chart notes and the Letter of Medical Necessity have their own; anything else shows the chart notes sample. */
function supportingFile(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("lmn") || n.includes("letter") || n.includes("necessity")) return "/docs/letter-of-medical-necessity.pdf";
  return "/docs/chart-notes.pdf";
}

/** `true` is the legacy form: an HCP-administered case, free drug or not. */
export function caseDocuments(d: WorkflowData, options: CaseDocumentOptions | boolean = {}): CaseDocument[] {
  const o: CaseDocumentOptions = typeof options === "boolean" ? { freeDrug: options, hcp: true } : options;
  const prefix = o.fax ? "FAX" : "DOC";
  const docs: CaseDocument[] = [];
  const enrolled = d.enrollmentStatus !== "none";
  const signed = !!d.signatureCaptured;

  // The enrollment form is on file for a fax intake, an HCP submission, or a patient who signed it.
  if (enrolled && (o.fax || o.hcp || signed)) {
    docs.push({
      id: `${prefix}-2026-00431`,
      name: signed ? "SignedEnrollmentForm.pdf" : enrollmentFormDocument().fileName,
      file: enrollmentFormDocument().file,
      type: signed ? "Enrollment Form (Signed)" : "Enrollment Form",
      pages: 3,
      daysAgo: o.fax ? 4 : 0,
    });
  }
  if (d.consentStatus === "confirmed") {
    docs.push({ id: "DOC-2026-00432", name: signed ? "SignedConsentForm.pdf" : "ConsentForm.pdf", file: "/docs/consent-form.pdf", type: signed ? "Consent Form (Signed)" : "Consent Form", pages: 1, daysAgo: 0 });
  }
  // Summary of Benefits: eMedBV produces it on an HCP case. Everywhere else it comes with the approved PA.
  const sobExists = o.hcp ? d.medbvStatus === "complete" && !o.freeDrug : d.paStatus === "approved";
  if (sobExists) docs.push({ id: "DOC-2026-00433", name: "SummaryOfBenefits.pdf", file: summaryOfBenefitsDocument().file, type: "Summary of Benefits", pages: 2, daysAgo: 0 });
  if (o.freeDrug && d.papStatus === "active") docs.push({ id: "DOC-2026-00434", name: "FreeDrugApplication.pdf", file: "/docs/free-drug-application.pdf", type: "Free Drug Application", pages: 1, daysAgo: 0 });
  if (d.paStatus === "submitted" || d.paStatus === "approved" || d.paStatus === "denied") {
    docs.push({ id: `${prefix}-2026-00435`, name: "PriorAuthorizationForm.pdf", file: paFormDocument()?.file ?? "/docs/prior-authorization-form.pdf", type: "Prior Authorization Form", pages: 5, daysAgo: o.fax ? 2 : 0 });
  }
  if (d.paStatus === "approved") docs.push({ id: "DOC-2026-00436", name: "PAApprovalNotice.pdf", file: "/docs/pa-approval-notice.pdf", type: "PA Approval Notice", pages: 1, daysAgo: 0 });
  // The appeal is filed after a denial. Its submission packet exists from that moment.
  if (d.appealStatus && d.appealStatus !== "none") {
    docs.push({ id: "DOC-2026-00437", name: "PAAppealSubmission.pdf", file: "/docs/pa-appeal-submission.pdf", type: "PA Appeal Submission", pages: 4, daysAgo: 0 });
  }
  // Files the HCP attached in the iAssist case wizard. Each name appears once.
  [...new Set(d.submittedDocuments ?? [])].forEach((name, i) => {
    docs.push({ id: `DOC-2026-${String(440 + i).padStart(5, "0")}`, name, file: supportingFile(name), type: "Supporting Document", pages: 1, daysAgo: 0 });
  });
  return docs;
}
