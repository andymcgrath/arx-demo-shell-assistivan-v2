import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";
import type { Stage } from "../types";

/** Prior Authorization. Opening the stage while the PA is submitted is the machine's decision timer (the stage's `signal`). */

const ID = "PA-14274";
const NAME = "Prior Authorization";

/** Fax and iAssist. A letter goes to the HCP once BI completes. */
const standard = (d: WorkflowData): Stage =>
  d.paStatus === "none" && d.biStatus === "complete"
    ? { id: ID, name: NAME, statusLabel: "Letter sent", statusDetail: "HCP letter mailed for Prior Authorization", isComplete: false, isNotStarted: false, fields: [], lastUpdated: new Date().toLocaleDateString(), lastUpdatedAgo: "just now" }
    : d.paStatus === "none"
    ? { id: ID, name: NAME, statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : d.paStatus === "submitted"
    ? { id: ID, name: NAME, statusLabel: "Submitted", statusDetail: "Awaiting Approval", isComplete: false, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.paStatus === "approved"
    ? { id: ID, name: NAME, statusLabel: "Complete", statusDetail: "PA Approved", isComplete: true, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: ID, name: NAME, statusLabel: "Denied", statusDetail: "PA Denied — Appeal initiated", isComplete: false, isNotStarted: false, fields: [], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" };

/** CoAssist DTP and Copay: the PA starts on its own, and a denial leads to a cash offer. */
const coa = (d: WorkflowData): Stage => ({
  id: ID,
  name: NAME,
  statusLabel: d.paStatus === "none" ? "Stage not started" : d.paStatus === "submitted" ? "Submitted" : d.paStatus === "approved" ? "Approved" : "Denied",
  statusDetail:
    d.paStatus === "none"
      ? "Awaiting BI completion"
      : d.paStatus === "submitted"
      ? "Awaiting payer decision"
      : d.paStatus === "approved"
      ? d.consentStatus === "confirmed"
        ? "PA Approved — pricing options sent to patient"
        : "PA Approved — pricing options will be sent once the patient completes enrollment"
      : "PA Denied — Patient eligible for cash offer",
  isComplete: d.paStatus === "denied" || d.paStatus === "approved",
  isNotStarted: d.paStatus === "none",
  fields: [
    { label: "PA Status", value: d.paStatus === "none" ? null : d.paStatus === "submitted" ? "Submitted" : d.paStatus === "approved" ? "Approved" : "Denied" },
  ],
  lastUpdated: d.paStatus !== "none" ? new Date().toLocaleDateString() : null,
  lastUpdatedAgo: d.paStatus !== "none" ? "today" : null,
});

/**
 * APA (the `prior_authorization` block's `apa` and `apa_skip` variants): the system emails the prescriber a secure form
 * link, and the stage follows the form until the PA is submitted. Other scenarios never set `paFormStatus`, so their
 * builders draw as before.
 */
const FORM_STATUS: Record<string, { label: string; detail: string }> = {
  sent: { label: "Form sent", detail: "Secure PA form emailed to the prescriber" },
  opened: { label: "Form opened", detail: "The prescriber opened the secure link" },
  verified: { label: "Prescriber verified", detail: "NPI verified. Waiting on the completed form" },
};

const withPaForm = (build: (d: WorkflowData) => Stage) => (d: WorkflowData): Stage => {
  const form = d.paStatus === "none" ? FORM_STATUS[d.paFormStatus] : undefined;
  if (!form) return build(d);
  return {
    id: ID,
    name: NAME,
    statusLabel: form.label,
    statusDetail: form.detail,
    isComplete: false,
    isNotStarted: false,
    fields: [{ label: "PA form", value: form.label }],
    lastUpdated: d.paFormSentAt ? new Date(d.paFormSentAt).toLocaleDateString() : new Date().toLocaleDateString(),
    lastUpdatedAgo: "just now",
  };
};

/** Coverage outcomes with no PA: both benefits covered, or neither covered. */
const notNeeded = (d: WorkflowData): Stage => ({
  id: ID,
  name: NAME,
  statusLabel: "Not needed",
  statusDetail:
    d.medicalBenefitStatus === "covered"
      ? "Both benefits covered — no Prior Authorization needed"
      : "No coverage found under either benefit — no Prior Authorization needed",
  isComplete: true,
  isNotStarted: false,
  fields: [],
  lastUpdated: dateFromToday(0).toLocaleDateString(),
  lastUpdatedAgo: "today",
});

export const PA_BUILDERS = { standard: withPaForm(standard), coa: withPaForm(coa), not_needed: notNeeded };
