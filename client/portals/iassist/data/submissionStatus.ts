/**
 * What the iAssist patient view shows for the active submission, derived from workflowData. Pure, so a test can
 * run it. The cards, documents, and PA details follow the machine. Nothing here is stored.
 */
import type { WorkflowData } from "@/engine/types";
import { caseDocuments } from "@/brand/caseDocuments";

export type CardState = "done" | "pending" | "idle";

export interface StatusCard {
  key: "enrollment" | "prior_authorization" | "copay" | "application" | "appointment";
  title: string;
  body: string;
  state: CardState;
}

/** A representative authorization number. The demo has no payer to issue one. */
export const DEMO_AUTH_NUMBER = "PA-48201937";

const mmddyyyy = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

/** The date the approved PA expires: one year after approval. */
export function paExpiration(paApprovedAt: string | null): string {
  if (!paApprovedAt) return "";
  const d = new Date(paApprovedAt);
  d.setFullYear(d.getFullYear() + 1);
  return mmddyyyy(d);
}

/** "2026-01-20" to "01/20/2026" without a time zone shift. A date already in that form passes through. */
export const ymdToMdy = (v: string) => (v.includes("-") ? [...v.split("-").slice(1), v.split("-")[0]].join("/") : v);

export function formatDate(iso: string | null | undefined): string {
  return iso ? mmddyyyy(new Date(iso)) : "";
}

/** When the patient consented by text, they also confirmed household size and income in the patient app. */
function incomeNote(d: WorkflowData): string {
  if (d.choices?.consent !== "patient_text" || !d.householdRequested) return "";
  if (d.incomeStatus !== "verified" || !d.householdIncome) return " Waiting on household income.";
  const income = `$${Number(d.householdIncome).toLocaleString("en-US")}`;
  return ` Household of ${d.householdSize}, income ${income}, confirmed.`;
}

/** Free drug (PAP): enrollment, the application, then the appointment at the site of care. */
function deriveFreeDrugCards(d: WorkflowData, firstName: string, enrollment: StatusCard): StatusCard[] {
  const approved = d.papStatus === "active";
  const application: StatusCard = approved
    ? { key: "application", title: "Free drug application", state: "done", body: `${firstName} was approved for the free drug program. Credit check and household income confirmed.` }
    : d.incomeStatus === "verified"
      ? { key: "application", title: "Free drug application", state: "pending", body: `${firstName} submitted the application with the credit check and household income. It is in review and waiting on approval.` }
    : d.biStatus === "complete"
      ? { key: "application", title: "Free drug application", state: "pending", body: `No medical coverage was found. Waiting on ${firstName} to finish the free drug application.` }
      : d.biStatus === "running"
        ? { key: "application", title: "Free drug application", state: "pending", body: "The benefits investigation is in progress." }
        : { key: "application", title: "Free drug application", state: "idle", body: "Waiting on the submission." };

  const appointment: StatusCard = !approved
    ? { key: "appointment", title: "Appointment", state: "idle", body: "Starts once the application is approved." }
    : d.infusionDate
      ? { key: "appointment", title: "Appointment", state: "done", body: `${firstName} chose ${formatDate(d.infusionDate)}. The free drug goes to the site of care.` }
      : { key: "appointment", title: "Appointment", state: "pending", body: `Approved. Waiting on ${firstName} to choose an appointment date.` };

  return [enrollment, application, appointment];
}

export function deriveStatusCards(d: WorkflowData, firstName: string, programName: string, freeDrug = false): StatusCard[] {
  const enrolled = d.enrollmentStatus !== "none";

  const enrollment: StatusCard = {
    key: "enrollment",
    title: "Enrollment",
    state: enrolled ? "done" : "idle",
    body: !enrolled
      ? "No enrollment submitted yet."
      : d.consentStatus === "confirmed"
        ? `${firstName}'s enrollment form was submitted and ${firstName} has consented.${incomeNote(d)}`
        : d.choices?.consent === "patient_text"
          ? `${firstName}'s enrollment form was submitted. Waiting on ${firstName} to consent by text.`
          : `${firstName}'s enrollment form was submitted. Waiting on ${firstName}'s consent.`,
  };

  if (freeDrug) return deriveFreeDrugCards(d, firstName, enrollment);

  let pa: StatusCard;
  if (d.paStatus === "approved") {
    pa = {
      key: "prior_authorization",
      title: "Prior Authorization",
      state: "done",
      body: `${firstName}'s prior authorization is approved. Authorization ${DEMO_AUTH_NUMBER}, expires ${paExpiration(d.paApprovedAt)}.`,
    };
  } else if (d.paStatus === "submitted") {
    pa = { key: "prior_authorization", title: "Prior Authorization", state: "pending", body: `${firstName}'s prior authorization was submitted. Waiting on the payer's decision.` };
  } else if (d.paStatus === "denied") {
    pa = { key: "prior_authorization", title: "Prior Authorization", state: "pending", body: `${firstName}'s prior authorization was denied.` };
  } else if (d.biStatus === "running" || d.biStatus === "complete") {
    pa = { key: "prior_authorization", title: "Prior Authorization", state: "pending", body: "The benefits investigation is in progress. The prior authorization follows." };
  } else {
    pa = { key: "prior_authorization", title: "Prior Authorization", state: "idle", body: "Waiting on the submission." };
  }

  const claims = d.copayClaims?.length ?? 0;
  const copay: StatusCard = {
    key: "copay",
    title: "Copay",
    state: d.copayEnrolled ? "done" : "idle",
    body: d.copayEnrolled
      ? `${firstName} is enrolled in ${programName}.${claims ? ` ${claims} claim${claims === 1 ? "" : "s"} filed.` : ""}`
      : "Not enrolled in the copay program.",
  };

  return [enrollment, pa, copay];
}

export interface SubmissionDocument {
  name: string;
  /** Path of the sample PDF the viewer opens. */
  file: string;
}

/** Files on the submission, in the order they appear. The list is shared with the CRM and the Field portal (brand/caseDocuments.ts). */
export function deriveDocuments(d: WorkflowData, freeDrug = false): SubmissionDocument[] {
  return caseDocuments(d, freeDrug).map(({ name, file }) => ({ name, file }));
}

/** What the submission covers, for the History row. */
export function submissionSummary(d: WorkflowData): string {
  const parts: string[] = [];
  if (d.enrollmentStatus !== "none") parts.push("Enrollment");
  if (d.medbvStatus === "complete") parts.push("MedBV");
  if (d.paStatus !== "none") parts.push("PA");
  if (d.papStatus === "active") parts.push("Free drug");
  if (d.copayEnrolled) parts.push("Copay");
  return parts.join(", ");
}
