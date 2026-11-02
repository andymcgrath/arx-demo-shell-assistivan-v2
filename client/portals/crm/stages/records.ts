import type { WorkflowData } from "@/engine/types";
import { dateFromToday } from "@/lib/relativeDate";

/**
 * The CRM's record views for a resolved stage (PA denied, PA approved, appeal approved), as data. One shell,
 * components/RecordStageView.tsx, draws any of them. Pure: it reads no store, actor or React.
 * Stage ids are matched as written in the stage list. Step 5 of docs/plans/PROMPT_CRM_REFACTOR.md replaces them.
 */

export interface RecordRow {
  label: string;
  value: string;
  isLink?: boolean;
}

export interface RecordSection {
  title: string;
  left: RecordRow[];
  right: RecordRow[];
}

export interface RecordNote {
  tone: "warning" | "success" | "info";
  title: string;
  body: string;
}

export interface RecordContent {
  /** The small line above the id. */
  kicker: string;
  /** The two or three letters on the badge. */
  mark: string;
  id: string;
  tone: "denied" | "approved";
  /** The pill in the header, for example "✓ Approved". */
  pill: string;
  /** The character in the status circle of the right rail. */
  icon: string;
  sections: RecordSection[];
  note?: RecordNote;
  rail: { title: string; status: string; rows: { label: string; value: string }[] };
}

/** What a record view reads besides `workflowData`. The patient's own facts live in the patient store. */
export interface RecordFacts {
  patientName: string;
  caseNumber: string;
  payer: string;
}

const today = () => new Date().toLocaleDateString();
const inDays = (n: number) => dateFromToday(n).toLocaleDateString();

/** The rows that open every record: the patient, the case, and the stage's own two lines. */
const informationSection = (
  facts: RecordFacts,
  left: [RecordRow, RecordRow],
  right: [RecordRow, RecordRow],
): RecordSection => ({
  title: "Information",
  left: [{ label: "Patient", value: facts.patientName, isLink: true }, { label: "Case", value: facts.caseNumber, isLink: true }, ...left],
  right: [...right, { label: "No Status Change Needed", value: "—" }, { label: "Owner", value: "Product Owner" }],
});

const callDetails = (decisionLabel: string, decision: string): RecordSection => ({
  title: "Call Authorization Details",
  left: [
    { label: "Prior Authorization Fax #", value: "1-800-PA-RECEIVED" },
    { label: "Prior Authorization Phone #", value: "(407) 885-9999" },
  ],
  right: [{ label: decisionLabel, value: decision }],
});

/**
 * PA denied. Where the denial leads depends on the scenario: `cashPayPath` is a cash offer (CoAssist DTP and Copay),
 * otherwise an appeal. Only iAssist runs a real appeal, so every other flow keeps `appealStatus` at "none" and shows
 * the "recommended" copy.
 */
function paDenied(d: WorkflowData, facts: RecordFacts, cashPayPath: boolean): RecordContent {
  const appeal = d.appealStatus;
  const comment = cashPayPath
    ? "PA denied by payer; patient eligible for cash pay program"
    : appeal === "approved"
      ? "PA denied by payer; appeal filed and approved on review"
      : appeal === "initiated"
        ? "PA denied by payer; appeal filed and awaiting response"
        : "PA denied by payer; appeal recommended";
  const note: RecordNote = cashPayPath
    ? {
        tone: "warning",
        title: "Patient Eligibility Update",
        body: "Patient is eligible for cash pay program — proceed to Cash Offer stage to send offer and collect payment.",
      }
    : appeal === "approved"
      ? { tone: "success", title: "Appeal Approved", body: "The payer overturned this denial on appeal. See the Appeals stage for the full outcome." }
      : appeal === "initiated"
        ? {
            tone: "info",
            title: "Appeal Filed",
            body: "An appeal has been submitted on this denial. See the Appeals stage for status — fulfillment has moved forward while the payer reviews it.",
          }
        : {
            tone: "warning",
            title: "Appeal Recommended",
            body: "Prior authorization was denied. File an appeal from the Appeals stage to continue toward fulfillment.",
          };
  return {
    kicker: "Prior Authorization Denial",
    mark: "PA",
    id: "PA-14274",
    tone: "denied",
    pill: "✕ Denied",
    icon: "✕",
    sections: [
      informationSection(
        facts,
        [
          { label: "Denial Reason", value: "Medical necessity criteria not met" },
          { label: "Stage Age (Business Hours)", value: "1 hour, 45 minutes" },
        ],
        [
          { label: "Status", value: "Denied" },
          { label: "Sub-Status", value: appeal === "approved" ? "Denied — Appeal Approved" : appeal === "initiated" ? "Denied — Appeal Filed" : "Denied — Appeal Eligible" },
        ],
      ),
      {
        title: "Prior Authorization Information",
        left: [
          { label: "Authorization Number", value: "PA-2026-001234" },
          { label: "Call Reference Number", value: "REF-789456" },
          { label: "Initiation Source", value: "Fax" },
          { label: "External Comments", value: "Denied — medical necessity not established" },
          { label: "Internal Comments", value: comment },
          { label: "Payer Notes", value: "Appeal rights available within 60 days" },
        ],
        right: [
          { label: "Prior Authorization ID", value: "SELECTED_Template_51" },
          { label: "Last PA Fax Sent Date", value: inDays(-3) },
          { label: "Denial Date", value: today() },
          { label: "Appeal Deadline", value: inDays(57) },
          { label: "PA Requirements Communicated", value: "Yes" },
          { label: "PA Requirement Communicated Date/Time", value: `${today()}, 10:30 AM` },
        ],
      },
      callDetails("Auth Decision (Fax #)", "Denied"),
    ],
    note,
    rail: {
      title: "Denial Status",
      status: "Denied",
      rows: [
        { label: "Denied By", value: `Payer — ${facts.payer}` },
        { label: "Denial Date", value: today() },
        {
          label: appeal !== "none" ? "Appeal Status" : "Appeal Deadline",
          value: appeal === "approved" ? "Approved" : appeal === "initiated" ? "Filed — Awaiting Response" : inDays(57),
        },
      ],
    },
  };
}

function paApproved(d: WorkflowData, facts: RecordFacts): RecordContent {
  return {
    kicker: "Prior Authorization Approval",
    mark: "PA",
    id: "PA-14274",
    tone: "approved",
    pill: "✓ Approved",
    icon: "✓",
    sections: [
      informationSection(
        facts,
        [
          { label: "Prescriber Notes", value: "Requires prior authorization for coverage" },
          { label: "Stage Age (Business Hours)", value: "2 hours, 15 minutes" },
        ],
        [
          { label: "Status", value: "Approved" },
          { label: "Sub-Status", value: "Approved" },
        ],
      ),
      {
        title: "Prior Authorization Information",
        left: [
          { label: "Authorization Number", value: "PA-2026-001234" },
          { label: "Call Reference Number", value: "REF-789456" },
          { label: "Initiation Source", value: "Fax" },
          { label: "External Comments", value: "Approved for 12 months coverage" },
          { label: "Internal Comments", value: "Standard PA approved per medical necessity" },
          { label: "Payer Notes", value: "No specific restrictions noted" },
        ],
        right: [
          { label: "Prior Authorization ID", value: "SELECTED_Template_51" },
          { label: "Last PA Fax Sent Date", value: inDays(0) },
          { label: "Effective Date", value: inDays(0) },
          { label: "Expiration Date", value: inDays(365) },
          { label: "PA Requirements Communicated", value: "Yes" },
          { label: "PA Requirement Communicated Date/Time", value: `${inDays(0)}, 10:30 AM` },
        ],
      },
      // The label's missing ")" is how the page has always read. Kept so the text does not change.
      callDetails("Auth Approval (Fax #", "Approved"),
    ],
    rail: {
      title: "Approval Status",
      status: "Approved",
      rows: [
        { label: "Approved By", value: "Provider Portal" },
        { label: "Approval Date", value: d.paApprovedAt ? new Date(d.paApprovedAt).toLocaleDateString() : inDays(0) },
        { label: "Valid Until", value: inDays(365) },
      ],
    },
  };
}

function appealApproved(facts: RecordFacts): RecordContent {
  return {
    kicker: "Appeal Approval",
    mark: "A",
    id: "A-14275",
    tone: "approved",
    pill: "✓ Approved",
    icon: "✓",
    sections: [
      informationSection(
        facts,
        [
          { label: "Appeal Reason", value: "Prior authorization denial — medical necessity" },
          { label: "Stage Age (Business Hours)", value: "2 hours, 30 minutes" },
        ],
        [
          { label: "Status", value: "Approved" },
          { label: "Sub-Status", value: "Approved on Appeal" },
        ],
      ),
      {
        title: "Appeal Information",
        left: [
          { label: "Appeal Number", value: "APL-2026-000842" },
          { label: "Related Authorization", value: "PA-2026-001234", isLink: true },
          { label: "Submission Source", value: "Action Factory — Automated" },
          { label: "External Comments", value: "Appeal approved — original denial overturned" },
          { label: "Internal Comments", value: "Payer reversed decision on clinical review" },
        ],
        right: [
          { label: "Submitted Date", value: today() },
          { label: "Payer Response Date", value: today() },
          { label: "Payer", value: facts.payer },
          { label: "Coverage Effective", value: inDays(0) },
          { label: "Coverage Expiration", value: inDays(365) },
          // Cosmetic flavor text for the "Appeal result emailed to HCP" beat. No inbox UI exists for it.
          { label: "HCP Notified", value: "Sarah Chen, MD — notified via email" },
        ],
      },
    ],
    note: {
      tone: "success",
      title: "Appeal Approved — Fulfillment Continuing",
      body: "The payer reversed the original Prior Authorization denial on appeal. The prescriber has been notified by email, and dispatch to the patient's site of care already moved forward when the appeal was filed — no further action is needed on this stage.",
    },
    rail: {
      title: "Approval Status",
      status: "Approved",
      rows: [
        { label: "Approved By", value: `Payer — ${facts.payer}` },
        { label: "Decision Date", value: today() },
        { label: "Coverage Effective", value: inDays(0) },
      ],
    },
  };
}

/**
 * The record view for the open stage, or null when it has none (the generic stage view applies).
 * `cashPayPath` says a PA denial leads to a cash offer and not an appeal.
 */
export function stageRecord(stageId: string, d: WorkflowData, facts: RecordFacts, cashPayPath: boolean): RecordContent | null {
  if (stageId === "PA-14274" && d.paStatus === "denied") return paDenied(d, facts, cashPayPath);
  if (stageId === "PA-14274" && d.paStatus === "approved") return paApproved(d, facts);
  if (stageId === "A-14275" && d.appealStatus === "approved") return appealApproved(facts);
  return null;
}
