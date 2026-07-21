import { ChevronDown, Settings, ListTodo, ArrowLeft, Calendar, Users, AlertCircle, CheckSquare, Clock, Zap, Shield, Mail } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDemoStore } from "@/store/demoStore";
import {
  useFieldStore,
  type FieldItem,
  type FieldPatientRecord,
  type FieldHCP,
  type FieldSOC,
  type FieldPatientSOCLink,
  type FieldPatientHCPLink,
  type FieldPrescription,
  type FieldInsurance,
  type FieldPatientAuthorization,
  type FieldSPShipment,
  type FieldComment,
} from "@/store/fieldStore";
import { usePatientStore } from "@/store/patientStore";
import { useDemoState } from "@/hooks/useDemoState";
import {
  getLiveWorkItems,
  getGeneratedEmails,
  LIVE_CASE_ID,
  LIVE_MISSING_INFO_TASK_ID,
  LIVE_PA_TASK_ID,
} from "@/engine/WorkflowEngine";
import { daysFromToday } from "@/lib/relativeDate";

// This patient's one prescriber everywhere else in the app (Provider portal,
// CRM's enrollment fax, iAssist, the live tasks above) — referenced by the
// generated email notifications below.
const PRESCRIBER_NAME = "Dr. Sarah Chen";
// The FRM working this patient's case — same name the dashboard's "Welcome
// Back" greeting and the live tasks' assignedTo already use. Every
// generated email is addressed to this FRM, since the email client is an
// internal notification inbox, not the patient's or prescriber's.
const FRM_NAME = "Sarah Mitchell";

// Core data model
// Legacy shape the dashboard quick-view modal and task detail drill-in were
// already built against. Rather than rewrite that (already-built) detail
// view, `cases` below is derived from the unified FieldItem list — see
// toCase() — so this stays a display-shape adapter, not a second source of
// truth. `kind` is threaded through so dashboard filters (Urgent Tasks =
// Task kind, Idle Cases = Case kind) can still tell the two apart.
interface Case {
  id: string;
  kind: "Task" | "Case";
  refId: string;
  related: string;
  status: string;
  date: string;
  dueDate: string;
  eid: string;
  label: string;
  assignedTo: string;
  patientName?: string;
  patientId?: string;
  subStatus?: string;
  createdBy?: string;
  completeDatetime?: string;
  priority?: string;
  description?: string;
  relatedCaseId?: string;
  stageName?: string;
  closedAt?: string;
}

function toCase(item: FieldItem): Case {
  return {
    id: item.id,
    kind: item.kind,
    refId: item.refId,
    related: item.kind === "Case" ? "Stage" : "Patient",
    status: item.status,
    date: item.createdAt,
    dueDate: item.dueDate,
    eid: item.id,
    label: item.description ?? item.refId,
    assignedTo: item.assignedTo,
    patientName: item.patient,
    patientId: item.patientId,
    subStatus: item.subStatus ?? "--None--",
    createdBy: "CaseAssist Update",
    completeDatetime: item.status === "Closed" ? item.dueDate : "---",
    priority: item.priority,
    description: item.description,
    relatedCaseId: item.relatedCaseId,
    stageName: item.stageName,
    closedAt: item.closedAt,
  };
}

// A patient's "Related" tab is eight small tables, each just a filtered
// slice of a store collection joined by patientId — this renders any of
// them from a title/columns/rows triple instead of repeating the same
// table chrome eight times.
function RelatedTable({
  title,
  count,
  columns,
  rows,
}: {
  title: string;
  count: number;
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">{title} ({count})</h3>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4 text-slate-400 text-center">No records</td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 text-slate-700 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Calendar item categorization ─────────────────────────────────────────────
// Same categories, checked in the same priority order, as the dashboard's
// filter cards/quick-view table — an item colored "Urgent" on the calendar
// is exactly the set of items the "Urgent Tasks" card would show. "Due
// Today" and "Created Today" aren't included here: every chip on a given
// day already IS that day's due items, so "Due Today" would just recolor
// whatever's on today's cell, and "Created Today" is a creation-date fact
// that has nothing to do with which day a due-date calendar groups it under.
type CalendarCategory = "urgent" | "pendingConsent" | "idle" | "other";

const CALENDAR_CATEGORY_STYLES: Record<CalendarCategory, { swatch: string; text: string; label: string }> = {
  urgent: { swatch: "bg-arx-orange", text: "text-slate-900", label: "Urgent Task" },
  pendingConsent: { swatch: "bg-arx-sky", text: "text-slate-900", label: "Pending Consent" },
  idle: { swatch: "bg-arx-primary-30", text: "text-slate-900", label: "Idle Case" },
  other: { swatch: "bg-slate-300", text: "text-slate-800", label: "Other" },
};

function getCalendarCategory(c: Case): CalendarCategory {
  if (c.kind === "Task" && c.priority === "High" && c.status !== "Closed") return "urgent";
  if (c.status === "Pending Consent") return "pendingConsent";
  if (c.kind === "Case" && c.status === "Idle") return "idle";
  return "other";
}

export default function FieldPortal() {
  const { state, events } = useDemoState("Field");
  const demoState = useDemoStore();
  const patientState = usePatientStore();

  // Workflow state from actor (via useDemoState)
  const paStatus = state.pa_status;
  const consentStatus = state.consent_status;
  const enrollmentStatus = state.enrollment_status;
  const biStatus = state.bi_status;
  const biResult = state.bi_result;
  const pharmacyStatus = state.pharmacy_status;
  // The Enrollment Application fax only exists for the two fax-intake
  // flows — same gate CRM's Related Documents tab uses (isFaxFlow there).
  const isFaxFlow = state.flow_type === "Fax_QS_PA_Approved" || state.flow_type === "Fax_PAP_Audit";
  const [selectedTab, setSelectedTab] = useState("DASHBOARD");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientTab, setPatientTab] = useState("SUMMARY");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"Month" | "Week" | "Day" | "List">("Month");
  const [showQuickView, setShowQuickView] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<Case | null>(null);
  const [showEnrollmentDoc, setShowEnrollmentDoc] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [alsoAddToRelated, setAlsoAddToRelated] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  // Field Portal opens directly into the standalone email client below —
  // no Field Portal chrome (sidebar/header) renders until this flips, the
  // same one-directional "step" shape Provider portal's EmailStep uses
  // (BrandSidebar is hidden while step === "email"). Not persisted: a
  // reload always lands back on the email client first.
  const [fieldPortalEntered, setFieldPortalEntered] = useState(false);

  // Clears the draft when navigating to a different task/case — otherwise
  // an unsent comment on one item would still be sitting in the box (and
  // could get posted to the wrong item) after clicking into another.
  useEffect(() => {
    setCommentDraft("");
    setAlsoAddToRelated(false);
  }, [selectedTaskId]);

  // Field Portal's core dataset — seeded once, persisted to sessionStorage
  // (see client/store/fieldStore.ts). Does not vary by workflow.
  const {
    items: persistedItems,
    hcps: fieldHCPs,
    patients: storePatients,
    socs: fieldSOCs,
    patientSOCLinks,
    patientHCPLinks,
    prescriptions: fieldPrescriptions,
    insurance: fieldInsurance,
    authorizations: fieldAuthorizations,
    shipments: fieldShipments,
    comments,
    addComment,
    readEmailIds,
    markEmailRead,
  } = useFieldStore();

  // Every generated email, newest first — derived straight from the actor's
  // event log (events, from useDemoState above), never a separately
  // maintained queue. A status change that happens while nobody's looking
  // at this tab still lands here the moment the tab is next opened; nothing
  // is lost, and nothing needs to be "generated" on click.
  const generatedEmails = getGeneratedEmails({
    events,
    patientName: patientState.patientName,
    prescriberName: PRESCRIBER_NAME,
    frmName: FRM_NAME,
    biResult,
  });
  const selectedEmail = selectedEmailId ? generatedEmails.find((e) => e.id === selectedEmailId) ?? null : null;

  // Jumps from the email client straight to the task/case a notification is
  // about — LIVE_CASE_ID (imported from WorkflowEngine.ts, along with the
  // two live task ids) is also what liveItems/liveCase below are keyed by,
  // so this always resolves to a real row once Field Portal renders.
  const openLinkedItem = (itemId: string) => {
    setSelectedPatientId(null);
    setSelectedTaskId(itemId);
    setFieldPortalEntered(true);
  };

  // "Missing Information" and "Prior Authorization Requested" — the same two
  // tasks CRM's Related Tasks case tab shows for this patient, computed by
  // the one shared function both portals call (client/engine/WorkflowEngine.ts)
  // so status/visibility can't drift between them again. Kept live (computed
  // every render from the actor) rather than persisted, so it always reflects
  // whichever workflow is actually active.
  const liveItems: FieldItem[] = getLiveWorkItems({
    enrollmentStatus,
    consentStatus,
    biStatus,
    paStatus,
    flowType: state.flow_type,
  }).map((item) => ({
    // Matches the ids getGeneratedEmails' notifications link back to
    // (LIVE_MISSING_INFO_TASK_ID / LIVE_PA_TASK_ID, imported from the same
    // WorkflowEngine.ts module) rather than recomputing an equivalent
    // string here, so the two can't quietly drift apart.
    id: item.id === "missing-information" ? LIVE_MISSING_INFO_TASK_ID : LIVE_PA_TASK_ID,
    kind: "Task",
    refId: item.refId,
    status: item.status,
    priority: item.priority,
    dueDate: item.dueDate,
    createdAt: daysFromToday(0),
    patient: patientState.patientName,
    patientId: "AS-164543",
    // "Dr. Sarah Chen" is the one prescriber the rest of the app already
    // established for this patient (Provider portal, CRM's enrollment fax,
    // iAssist) — these two live tasks were the only place still showing a
    // placeholder instead of that same fact. Territory matches livePatient
    // below (also this patient's real value, not a separate guess).
    prescriber: "Dr. Sarah Chen",
    territory: "Texas",
    assignedTo: item.assignedTo,
    subStatus: item.status === "Closed" ? "Complete" : item.id === "missing-information" ? "Awaiting Consent" : "Awaiting Submission",
    description: item.description,
    // Both live tasks belong to this patient's one live case, same "Stage"
    // pattern used on the seeded patients' tasks — matches the reference's
    // "Related Item: PA-25842, Stage: Prior Authorization" shape instead of
    // showing the bare patient id.
    relatedCaseId: LIVE_CASE_ID,
    stageName: item.id === "missing-information" ? "Enrollment" : "Prior Authorization",
  }));

  // The one case behind this patient's live tasks — same onboarding/PA
  // narrative CRM's own stage cards show for this patient, given a Field
  // Portal case shape so it can appear in My Cases / the Related tab like
  // any other case. Only exists once enrolled, same as the tasks above.
  const liveCase: FieldItem = {
    id: LIVE_CASE_ID,
    kind: "Case",
    refId: "00001310",
    status: consentStatus === "confirmed" ? "Open" : "Pending Consent",
    priority: "High",
    dueDate: daysFromToday(3),
    createdAt: daysFromToday(0),
    patient: patientState.patientName,
    patientId: "AS-164543",
    prescriber: "Dr. Sarah Chen",
    territory: "Texas",
    assignedTo: "Sarah Mitchell",
    serviceType: "Onboarding",
    frmContact: "---",
    description: "Onboarding case for new patient enrollment",
  };

  // Single source of truth for every task/case-shaped view on this portal —
  // the two live tasks (+ their case) above plus the persisted seed.
  // Dashboard KPI cards, the quick-view modal, and the My Tasks/My Cases
  // tabs all read from this same list (filtered differently), so a given
  // item's priority/status/dueDate means the same thing everywhere it
  // shows up.
  const allItems: FieldItem[] = [
    ...liveItems,
    ...(enrollmentStatus === "enrolled" ? [liveCase] : []),
    ...persistedItems,
  ];

  const cases: Case[] = allItems.map(toCase);

  // Same "live once enrolled" data this patient's tasks/case already
  // follow, extended to the rest of the Related tab's entities. Dr. Sarah
  // Chen isn't part of the seeded 18-name HCP roster (she's this specific
  // patient's real prescriber everywhere else in the app), so she's added
  // to the roster here rather than invented under a conflicting name.
  const isEnrolled = enrollmentStatus === "enrolled";

  const liveHCPs: FieldHCP[] = [
    { id: "NPI-CHEN", physician: "Dr. Sarah Chen", npi: "1234567890", preferredContact: "Phone", officePhone: "(713) 555-0199", officeFax: "(713) 555-0299", officeEmail: "sarah.chen@medical.com", zip: "77002" },
    { id: "NPI-REYES", physician: "Dr. Michael Reyes", npi: "1699009988", preferredContact: "Email", officePhone: "(713) 555-0399", officeFax: "(713) 555-0499", officeEmail: "michael.reyes@medical.com", zip: "77002" },
  ];
  const liveHCPLinks: FieldPatientHCPLink[] = isEnrolled ? [
    { id: "LIVE-PHCP-1", patientId: "AS-164543", hcpId: "NPI-CHEN", role: "Primary" },
    { id: "LIVE-PHCP-2", patientId: "AS-164543", hcpId: "NPI-REYES", role: "Secondary" },
  ] : [];

  const liveSOCs: FieldSOC[] = [
    { id: "SOC-HOU", facilityName: "Houston SOC", npi: "1699006677", contactName: "Priya Sandhu", contactPhone: "(713) 555-3006", address: "800 Bagby St", city: "Houston", state: "Texas", zip: "77002" },
  ];
  const liveSOCLinks: FieldPatientSOCLink[] = isEnrolled ? [
    { id: "LIVE-PSOC-1", patientId: "AS-164543", socId: "SOC-HOU", isPrimary: true },
  ] : [];

  const livePrescriptions: FieldPrescription[] = isEnrolled ? [
    { id: "PP-11307", patientId: "AS-164543", hcpId: "NPI-CHEN", prescriptionName: "PP-11307", hcpSignature: true, hcpSignatureDate: daysFromToday(0) },
  ] : [];

  // Plan type/status track the live BI outcome instead of a fixed guess —
  // "Pending Verification" until BI actually runs, then reflects bi_result.
  const liveInsurance: FieldInsurance[] = isEnrolled ? [
    {
      id: "IN-20607", patientId: "AS-164543", insuranceName: "IN-20607", rank: "Primary",
      effectiveDate: daysFromToday(0),
      insurancePlanType: biResult === "no_insurance" ? "Self-Pay" : biResult === "no_coverage" ? "Commercial (No Coverage)" : "Commercial",
      groupNumber: "331207", rxGroupNumber: "RXG-8807", rxMemberId: "MBR-77207",
      status: biStatus === "complete" ? "Active" : biStatus === "running" ? "Verifying" : "Pending Verification",
    },
  ] : [];

  // Status/dates track consentStatus instead of a fixed "Complete" — this
  // is the formal record behind livePatient's consentExpiration below.
  const liveAuthorizations: FieldPatientAuthorization[] = isEnrolled ? [
    {
      id: "CF-31507", patientId: "AS-164543", authType: "Electronic",
      status: consentStatus === "confirmed" ? "Complete" : consentStatus === "declined" ? "Declined" : "Pending",
      effectiveDate: consentStatus === "confirmed" ? daysFromToday(0) : "---",
      revocationDate: consentStatus === "confirmed" ? daysFromToday(700) : "---",
      attestationDate: consentStatus === "confirmed" ? daysFromToday(0) : "---",
      receivedDate: daysFromToday(0),
    },
  ] : [];

  // Doesn't exist until pharmacy actually starts working the order — no
  // "Processing" placeholder sitting there before that's true.
  const liveShipments: FieldSPShipment[] = isEnrolled && pharmacyStatus !== "none" ? [
    {
      id: "SHIP-407", patientId: "AS-164543", prescriptionId: "PP-11307",
      carrier: "FedEx", trackingNumber: "775801122307",
      shipDate: pharmacyStatus === "delivered" || pharmacyStatus === "shipped" ? daysFromToday(-1) : daysFromToday(2),
      estDelivery: pharmacyStatus === "delivered" ? daysFromToday(-1) : daysFromToday(2),
      deliveredDate: pharmacyStatus === "delivered" ? daysFromToday(-1) : null,
      status: pharmacyStatus === "delivered" ? "Delivered" : pharmacyStatus === "shipped" ? "In Transit" : "Processing",
    },
  ] : [];

  // Merged live + persisted — every place that reads these collections
  // (the Related tab, the task detail's Primary HCP block) uses these
  // instead of the raw store values, so Keanu's live rows show up
  // alongside the seeded patients' rows without duplicating lookup logic.
  const allHCPs: FieldHCP[] = [...fieldHCPs, ...liveHCPs];
  const allPatientHCPLinks: FieldPatientHCPLink[] = [...patientHCPLinks, ...liveHCPLinks];
  const allSOCs: FieldSOC[] = [...fieldSOCs, ...liveSOCs];
  const allPatientSOCLinks: FieldPatientSOCLink[] = [...patientSOCLinks, ...liveSOCLinks];
  const allPrescriptions: FieldPrescription[] = [...fieldPrescriptions, ...livePrescriptions];
  const allInsurance: FieldInsurance[] = [...fieldInsurance, ...liveInsurance];
  const allAuthorizations: FieldPatientAuthorization[] = [...fieldAuthorizations, ...liveAuthorizations];
  const allShipments: FieldSPShipment[] = [...fieldShipments, ...liveShipments];

  // A case has exactly one patient. The live items above reference the
  // active demo patient (AS-164543, driven by patientState) rather than one
  // of the seeded/persisted patients, so it needs its own live profile here
  // for the same reason liveItems exists — it has to reflect whichever
  // patient is actually active in the session, not a frozen seed value.
  const livePatient: FieldPatientRecord = {
    id: "AS-164543",
    name: patientState.patientName,
    dob: patientState.patientDob,
    gender: "Male",
    externalPatientId: "000007088",
    accountStatus: "Active",
    allergies: "Latex",
    territory: "Texas",
    region: "South",
    primaryPrescriber: "Dr. Sarah Chen",
    primarySOC: "Houston SOC",
    consentExpiration: consentStatus === "confirmed" ? daysFromToday(700) : "---",
    enrollmentDate: daysFromToday(0),
    homePhone: patientState.phone,
    mobilePhone: patientState.phone,
    workPhone: "",
    alternatePhone: patientState.phone,
    preferredPhone: "Mobile",
    email: patientState.email,
    preferredMethodOfContact: patientState.preferredMethodOfContact,
    bestTimeToContact: "Afternoon",
    address: "456 Oak Ave",
    city: "Houston",
    state: "Texas",
    zip: "77001",
  };

  // Same "one shared dataset, filtered differently" principle as allItems
  // above: My Patients, the patient detail screen, and a case's "Patient Id"
  // link all resolve against this same list instead of three different
  // patient shapes.
  //
  // The live patient only joins that list once actually enrolled — the
  // "Missing Information" task's whole point is that this patient isn't a
  // real, workable patient record yet. Showing a patient card for someone
  // who hasn't enrolled would be showing a record that doesn't exist yet.
  const allPatients: FieldPatientRecord[] =
    enrollmentStatus === "enrolled" ? [livePatient, ...storePatients] : [...storePatients];

  // Guards every patient link (My Tasks/My Cases patient cells, the case
  // detail's Patient Id field, etc.) — same reasoning as above: don't link
  // to a patient record that doesn't exist yet.
  const patientRecordExists = (id?: string) => !!id && allPatients.some(p => p.id === id);

  const selectedCase = selectedTaskId !== null ? cases.find(c => c.id === selectedTaskId) ?? null : null;
  const selectedPatient = selectedPatientId !== null ? allPatients.find(p => p.id === selectedPatientId) ?? null : null;

  // The case/task detail view's "PATIENT INFORMATION" card pulls dob/gender
  // from here instead of carrying its own copy — same 1:1 relationship, one
  // patient record behind both views.
  const linkedPatient = selectedCase?.patientId
    ? allPatients.find(p => p.id === selectedCase.patientId) ?? null
    : null;

  // Which detail screen (if any) takes over the main content area. Checked
  // ahead of selectedTab everywhere it's rendered below, so a row clicked
  // from Dashboard, My Tasks, My Cases, or My Patients all land on the same
  // detail views regardless of which tab is currently selected.
  const detailView: "TASK_CASE" | "PATIENT" | null = selectedCase
    ? "TASK_CASE"
    : selectedPatient
    ? "PATIENT"
    : null;

  // Calculate stats — each one filters allItems with the exact same
  // predicate the quick-view modal below uses, so the number on the card
  // always matches the row count you see after clicking it.
  const today = new Date();
  const todayDateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const uniqueHCPs = allHCPs.length;
  const idleCases = allItems.filter(i => i.kind === "Case" && i.status === "Idle").length;
  const pendingConsents = allItems.filter(i => i.status === "Pending Consent").length;
  const todayCases = allItems.filter(i => i.dueDate === todayDateStr && i.status !== "Closed").length;
  const urgentTasks = allItems.filter(i => i.kind === "Task" && i.priority === "High" && i.status !== "Closed").length;
  const createdTodayCount = allItems.filter(i => i.createdAt === todayDateStr).length;

  // Quick-view modal rows — same predicates as the stat cards above, so the
  // number on a card always matches what clicking it shows. "Total HCPs" is
  // a separate entity (allHCPs), rendered by its own branch below, so it's
  // excluded here rather than matching everything.
  const quickViewCases: Case[] = cases.filter(c => {
    if (showQuickView === "Urgent Tasks") return c.kind === "Task" && c.priority === "High" && c.status !== "Closed";
    if (showQuickView === "Due Today") return c.dueDate === todayDateStr && c.status !== "Closed";
    if (showQuickView === "Pending Consent") return c.status === "Pending Consent";
    if (showQuickView === "Created Today") return c.date === todayDateStr;
    if (showQuickView === "Idle Cases") return c.kind === "Case" && c.status === "Idle";
    return false;
  });

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  // Groups every non-Closed task/case onto the day of its due date, for
  // whichever month is currently showing — this is what puts colored items
  // on the calendar. Closed items are left off; a completed task isn't
  // really "on the calendar" anymore.
  const getItemsByDayForMonth = (date: Date): Map<number, Case[]> => {
    const itemsByDay = new Map<number, Case[]>();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString();
    cases.forEach(c => {
      if (c.status === "Closed") return;
      const parts = c.dueDate.split(' ');
      if (parts[0] === monthName && parts[2] === year) {
        const dayNum = parseInt(parts[1], 10);
        if (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31) {
          const existing = itemsByDay.get(dayNum) ?? [];
          existing.push(c);
          itemsByDay.set(dayNum, existing);
        }
      }
    });
    return itemsByDay;
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const itemsByDay = getItemsByDayForMonth(currentMonth);
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Standalone email client ─────────────────────────────────────────────
  // Field Portal opens directly into this — no sidebar, no header, none of
  // Field Portal's own chrome — the same way Provider portal's EmailStep
  // hides BrandSidebar entirely while step === "email". The list is exactly
  // the actor's event log (getGeneratedEmails), so nothing here is a queue
  // that can drift from real state; "Continue to Field Portal" is the one
  // link out, mirroring EmailStep's own single link forward.
  if (!fieldPortalEntered) {
    return (
      // "portal-field" is load-bearing here, not decorative — every
      // arx-primary/arx-sky/etc. color below is a CSS var scoped to this
      // class (client/global.css's ".portal-field" block). Without it here
      // (this root used to be a plain min-h-screen div with no such class)
      // those colors silently resolved against an undefined var, so the
      // header bar and "View Task"/"View Case" button were rendering with
      // no background/text color at all — invisible, not merely missing.
      <div className="portal-field min-h-screen bg-slate-100 flex flex-col">
        <div className="bg-arx-primary text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Mail size={18} />
            <span className="font-semibold text-sm">AssistRx Mail</span>
          </div>
          <button
            onClick={() => setFieldPortalEntered(true)}
            className="text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
          >
            Continue to Field Portal →
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Inbox list */}
          <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
            {generatedEmails.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10 px-4">No emails yet</p>
            ) : (
              generatedEmails.map((email) => {
                const isUnread = !readEmailIds.includes(email.id);
                const isSelected = selectedEmailId === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => {
                      markEmailRead(email.id);
                      setSelectedEmailId(email.id);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors ${
                      isSelected ? "bg-arx-primary-30/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isUnread ? "bg-arx-primary" : "bg-transparent"}`}
                        title={isUnread ? "Unread" : undefined}
                      />
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {email.subject}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{email.sentAt}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Reading pane — same visual structure as Provider portal's
              EmailStep (client/portals/provider/index.tsx + styles.css's
              .email-* classes), rebuilt in Tailwind since Field Portal has
              no custom stylesheet to import that from. */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
            {!selectedEmail ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Select an email to read
              </div>
            ) : (
              <div className="max-w-[800px] mx-auto bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-white px-6 py-3 border-b border-slate-200 space-y-1.5">
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold text-slate-500 min-w-[60px]">From:</span>
                    <span className="text-slate-800">no-reply@assistrx.com</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold text-slate-500 min-w-[60px]">Sent:</span>
                    <span className="text-slate-800">{selectedEmail.sentAt}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold text-slate-500 min-w-[60px]">To:</span>
                    <span className="text-slate-800">{selectedEmail.to}</span>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="font-semibold text-slate-500 min-w-[60px]">Subject:</span>
                    <span className="text-slate-800">{selectedEmail.subject}</span>
                  </div>
                </div>

                <div className="bg-white p-10">
                  <div className="flex justify-center mb-6">
                    <img
                      src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F3a7a98e156014cee98b701ac84c6fa2c?format=webp&width=800&height=1200"
                      alt="AssistRx Logo"
                      style={{ maxWidth: "200px", height: "auto" }}
                    />
                  </div>

                  <div className="text-sm leading-relaxed text-slate-700">
                    <div className="space-y-4">
                      {selectedEmail.bodyParagraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>

                    {/* Jumps straight to the task/case this notification is
                        about — the whole point of an FRM's inbox pointing
                        at their own portal instead of an outside form. */}
                    {selectedEmail.linkedItemId && (
                      <button
                        onClick={() => openLinkedItem(selectedEmail.linkedItemId!)}
                        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded bg-arx-primary text-white hover:bg-arx-primary-dark"
                      >
                        {selectedEmail.linkedItemLabel ?? "View in Field Portal"} →
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 text-xs text-slate-500 text-center border-t border-slate-200">
                  If you'd like to unsubscribe and stop receiving these emails{" "}
                  <span className="text-arx-primary underline cursor-pointer" title="Demo link — not a real destination">click here</span>.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-field min-h-screen bg-slate-50 flex">
      {/* Left Sidebar */}
      <div className="w-32 bg-arx-primary text-white flex flex-col">
        <div className="p-4 border-b border-arx-primary-dark">
          <div className="flex items-center justify-center">
            <Shield size={24} className="text-white" />
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { id: "DASHBOARD", label: "Dashboard", icon: ListTodo },
            { id: "MY_TASKS", label: "My Tasks", icon: ListTodo },
            { id: "MY_CASES", label: "My Cases", icon: AlertCircle },
            { id: "MY_PATIENTS", label: "My Patients", icon: Users },
            { id: "MY_HCPS", label: "My HCPs", icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                // Switching tabs must always escape a detail view — otherwise
                // detailView (which takes priority over selectedTab in every
                // render branch below) keeps whatever screen was open on
                // screen no matter which sidebar item you click next.
                setSelectedTab(item.id);
                setSelectedTaskId(null);
                setSelectedPatientId(null);
              }}
              aria-label={item.label}
              aria-current={item.id === selectedTab ? "page" : undefined}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-xs font-medium transition-colors ${
                item.id === selectedTab
                  ? "bg-arx-primary-dark text-white"
                  : "text-arx-primary-30 hover:bg-arx-primary-dark"
              }`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              <span className="text-left">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-arx-primary text-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Field Portal</h1>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-arx-primary-dark rounded">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard View */}
        {!detailView && selectedTab === "DASHBOARD" && (
          <div className="flex-1 overflow-auto">
            <div className="p-6 bg-white min-h-full">
              {/* Dashboard Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-800">Dashboard</h2>
                <p className="text-sm text-slate-600">Welcome Back, Sarah Mitchell</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Urgent Tasks", value: urgentTasks, icon: Zap, color: "bg-arx-orange" },
                  { label: "Due Today", value: todayCases, icon: Calendar, color: "bg-arx-orange" },
                  { label: "Pending Consent", value: pendingConsents, icon: CheckSquare, color: "bg-arx-sky" },
                  { label: "Created Today", value: createdTodayCount, icon: Clock, color: "bg-arx-primary-30" },
                  { label: "Total HCPs", value: uniqueHCPs, icon: Users, color: "bg-arx-primary-30" },
                  { label: "Idle Cases", value: idleCases, icon: AlertCircle, color: "bg-arx-primary-30" },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`${stat.color} rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                      showQuickView === stat.label ? "ring-2 ring-arx-primary" : ""
                    }`}
                    onClick={() => setShowQuickView(showQuickView === stat.label ? null : stat.label)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-slate-700 mb-2 font-medium">{stat.label}</p>
                        <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                      </div>
                      <div className="w-8 h-8 rounded flex items-center justify-center text-slate-700">
                        <stat.icon size={20} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick View Table — clicking a stat card above expands this
                  in place; clicking the same card again (or the ✕) collapses
                  it. When showQuickView is null this renders nothing at all,
                  not just a collapsed/hidden container. */}
              {showQuickView && (
                <div className="mb-6 rounded-lg border border-slate-300 overflow-hidden">
                  <div className="bg-arx-primary p-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{showQuickView}</h3>
                    <button
                      onClick={() => setShowQuickView(null)}
                      aria-label="Collapse"
                      className="text-white hover:bg-arx-primary-dark rounded p-2 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 bg-white">
                    <p className="text-sm text-slate-600 mb-4">
                      Total Records: {showQuickView === "Total HCPs" ? allHCPs.length : quickViewCases.length}
                    </p>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm">
                        {showQuickView === "Total HCPs" ? (
                          <>
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Physician</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">NPI</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Preferred Contact</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Office Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Office Email</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allHCPs.map((hcp) => (
                                <tr key={hcp.id} className="border-b border-slate-200 hover:bg-slate-50">
                                  <td className="px-4 py-3 text-slate-700">{hcp.physician}</td>
                                  <td className="px-4 py-3 text-slate-700">{hcp.npi}</td>
                                  <td className="px-4 py-3 text-slate-700">{hcp.preferredContact}</td>
                                  <td className="px-4 py-3 text-slate-700">{hcp.officePhone}</td>
                                  <td className="px-4 py-3 text-slate-700">{hcp.officeEmail}</td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        ) : (
                          <>
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Subject</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Description</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Assigned To</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quickViewCases.map((caseItem) => (
                                <tr key={caseItem.id} className="border-b border-slate-200 hover:bg-slate-50">
                                  <td
                                    onClick={() => {
                                      setShowQuickView(null);
                                      setSelectedPatientId(null);
                                      setSelectedTaskId(caseItem.id);
                                    }}
                                    className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                                  >
                                    {caseItem.refId}
                                  </td>
                                  {patientRecordExists(caseItem.patientId) ? (
                                    <td
                                      onClick={() => {
                                        setShowQuickView(null);
                                        setSelectedTaskId(null);
                                        setSelectedPatientId(caseItem.patientId!);
                                      }}
                                      className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                                    >
                                      {caseItem.patientName || "---"}
                                    </td>
                                  ) : (
                                    <td className="px-4 py-3 text-slate-700">{caseItem.patientName || "---"}</td>
                                  )}
                                  <td className="px-4 py-3 text-slate-700">{caseItem.description || "---"}</td>
                                  <td className="px-4 py-3 text-slate-700">{caseItem.assignedTo}</td>
                                </tr>
                              ))}
                            </tbody>
                          </>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Calendar Section */}
              <div className="rounded-lg border border-slate-300 overflow-hidden">
                <div className="bg-arx-primary p-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Calendar</h3>
                </div>

                <div className="p-6">
                  {/* Calendar Controls */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        aria-label="Previous month"
                        className="p-1.5 hover:bg-slate-100 rounded"
                      >
                        <ChevronDown size={16} className="rotate-90 text-slate-600" />
                      </button>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        aria-label="Next month"
                        className="p-1.5 hover:bg-slate-100 rounded"
                      >
                        <ChevronDown size={16} className="-rotate-90 text-slate-600" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{monthYear}</span>
                    <div className="relative w-48">
                      <select
                        value={calendarView}
                        onChange={(e) => setCalendarView(e.target.value as "Month" | "Week" | "Day" | "List")}
                        className="appearance-none w-full px-4 py-2 text-sm font-semibold text-slate-900 bg-white border-2 border-arx-primary rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-arx-primary-dark"
                      >
                        <option value="Month">Month</option>
                        <option value="Week">Week</option>
                        <option value="Day">Day</option>
                        <option value="List">List</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-600 pointer-events-none" />
                    </div>
                  </div>

                  {/* Calendar Views */}
                  {calendarView === "Month" && (
                    <div>
                      {/* Legend — same colors as the dashboard filter cards
                          above, so a chip's color tells you which filter
                          would surface it. */}
                      <div className="flex items-center gap-4 mb-3 text-xs text-slate-600 flex-wrap">
                        {(Object.keys(CALENDAR_CATEGORY_STYLES) as CalendarCategory[]).map((cat) => (
                          <span key={cat} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${CALENDAR_CATEGORY_STYLES[cat].swatch}`} />
                            {CALENDAR_CATEGORY_STYLES[cat].label}
                          </span>
                        ))}
                      </div>

                      <div className="border border-slate-300 rounded">
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 bg-arx-primary">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                            <div
                              key={day}
                              className={`text-center py-3 text-white text-xs font-semibold ${
                                idx < 6 ? 'border-r border-arx-primary-dark' : ''
                              }`}
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 bg-white">
                          {calendarDays.map((day, idx) => {
                            const isLastCol = (idx + 1) % 7 === 0;
                            const isLastRow = idx >= calendarDays.length - 7;
                            const dayItems = day ? itemsByDay.get(day) ?? [] : [];
                            const visibleItems = dayItems.slice(0, 3);
                            const overflowCount = dayItems.length - visibleItems.length;
                            return (
                              <div
                                key={idx}
                                className={`border-slate-300 p-2 min-h-24 ${
                                  !isLastCol ? 'border-r' : ''
                                } ${
                                  !isLastRow ? 'border-b' : ''
                                } ${
                                  day === null ? 'bg-slate-50' : ''
                                }`}
                              >
                                {day && (
                                  <div>
                                    <p className={`text-sm mb-1 px-0.5 ${
                                      day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear() ? 'text-slate-900' : 'font-medium text-slate-700'
                                    }`}>
                                      {day}
                                    </p>
                                    <div className="space-y-0.5">
                                      {visibleItems.map((item) => {
                                        const style = CALENDAR_CATEGORY_STYLES[getCalendarCategory(item)];
                                        return (
                                          <button
                                            key={item.id}
                                            onClick={() => setPreviewItem(item)}
                                            title={item.refId}
                                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate block ${style.swatch} ${style.text} hover:opacity-80 transition-opacity`}
                                          >
                                            {item.refId}
                                          </button>
                                        );
                                      })}
                                      {overflowCount > 0 && (
                                        <p className="text-[10px] text-slate-500 px-1.5">+{overflowCount} more</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {calendarView === "Week" && (
                    <div className="border border-slate-300 rounded">
                      {/* Week Day Headers */}
                      <div className="grid grid-cols-7 bg-arx-primary">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                          <div key={day} className="text-center py-3 text-white text-xs font-semibold">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Week Days */}
                      <div className="grid grid-cols-7 bg-white">
                        {Array.from({ length: 7 }, (_, i) => today.getDate() - 3 + i).map((day) => (
                          <div key={day} className="border-slate-300 p-4 min-h-24 border-r border-b last:border-r-0">
                            <p className={`text-sm mb-2 ${
                              day === today.getDate() ? 'text-slate-900' : 'font-medium text-slate-700'
                            }`}>
                              {day}
                            </p>
                            {day === today.getDate() && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-arx-primary rounded">
                                Today
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {calendarView === "Day" && (
                    <div className="border border-slate-300 rounded p-6">
                      <p className="text-center text-slate-600">Day view for {monthYear}</p>
                      <p className="text-center text-slate-500 text-sm mt-2">Showing {todayDateStr} (Today)</p>
                    </div>
                  )}

                  {calendarView === "List" && (
                    <div className="border border-slate-300 rounded p-6">
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-800 mb-4">Upcoming Tasks</p>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-700">Jun 14 - Due Today (3 cases)</span>
                          <span className="text-xs text-arx-primary font-medium">Today</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-700">Jun 17 - Due Date</span>
                          <span className="text-xs text-slate-500">3 days</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-700">Jun 20 - Payer Outreach</span>
                          <span className="text-xs text-slate-500">6 days</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Calendar item preview — clicking a chip opens this instead
                  of jumping straight to the full detail view. "Close"
                  dismisses it; "Open Details" hands off to the same
                  case/task detail screen every other entry point uses. */}
              {previewItem && createPortal(
                <div
                  className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                  onClick={() => setPreviewItem(null)}
                >
                  <div
                    className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={`px-5 py-4 flex items-center justify-between ${CALENDAR_CATEGORY_STYLES[getCalendarCategory(previewItem)].swatch}`}>
                      <h3 className={`text-sm font-semibold ${CALENDAR_CATEGORY_STYLES[getCalendarCategory(previewItem)].text}`}>
                        {previewItem.refId}
                      </h3>
                      <button
                        onClick={() => setPreviewItem(null)}
                        aria-label="Close"
                        className={`rounded p-1 hover:opacity-70 ${CALENDAR_CATEGORY_STYLES[getCalendarCategory(previewItem)].text}`}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Patient</span>
                        <span className="font-medium text-slate-800">{previewItem.patientName || "---"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className="font-medium text-slate-800">{previewItem.status}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Priority</span>
                        <span className="font-medium text-slate-800">{previewItem.priority}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Due Date</span>
                        <span className="font-medium text-slate-800">{previewItem.dueDate}</span>
                      </div>
                      {previewItem.description && (
                        <p className="text-sm text-slate-600 pt-2 border-t border-slate-100">
                          {previewItem.description}
                        </p>
                      )}
                    </div>

                    <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                      <button
                        onClick={() => setPreviewItem(null)}
                        className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPatientId(null);
                          setSelectedTaskId(previewItem.id);
                          setPreviewItem(null);
                        }}
                        className="px-4 py-2 text-sm rounded bg-arx-primary text-white hover:bg-arx-primary-dark"
                      >
                        Open Details
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}

            </div>
          </div>
        )}

        {/* Tasks View */}
        {!detailView && selectedTab === "MY_TASKS" && (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">My Tasks</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Prescriber</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Sub Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Territory</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Assigned To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.filter((i) => i.kind === "Task").map((task) => (
                    <tr key={task.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td
                        onClick={() => { setSelectedPatientId(null); setSelectedTaskId(task.id); }}
                        className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                      >
                        {task.refId}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{task.prescriber}</td>
                      {patientRecordExists(task.patientId) ? (
                        <td
                          onClick={() => { setSelectedTaskId(null); setSelectedPatientId(task.patientId); }}
                          className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                        >
                          {task.patient}
                        </td>
                      ) : (
                        <td className="px-4 py-3 text-slate-700">{task.patient}</td>
                      )}
                      <td className="px-4 py-3 text-slate-700">{task.status}</td>
                      <td className="px-4 py-3 text-slate-700">{task.subStatus}</td>
                      <td className="px-4 py-3 text-slate-700">{task.dueDate}</td>
                      <td className="px-4 py-3 text-slate-700">{task.territory}</td>
                      <td className="px-4 py-3 text-slate-700">{task.assignedTo}</td>
                      <td className="px-4 py-3 text-slate-700">{task.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {detailView === "TASK_CASE" && selectedCase && (
          <div className="flex-1 overflow-auto">
            <div className="p-6 bg-white min-h-full">
              {/* Breadcrumb Navigation — label follows the item's own kind
                  (Task vs Case) rather than whichever tab you clicked from,
                  so it's correct whether you got here from Dashboard, My
                  Tasks, or My Cases. */}
              <div className="mb-6 flex items-center gap-2 text-sm">
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="text-arx-primary hover:underline font-medium"
                >
                  {selectedCase.kind === "Case" ? "My Cases" : "My Tasks"}
                </button>
                <span className="text-slate-400">/</span>
                <span className="text-slate-700 font-medium">{selectedCase.refId}</span>
              </div>

              {/* Task Title */}
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-arx-primary-30 rounded flex items-center justify-center">
                    <ListTodo size={18} className="text-arx-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800">
                    {selectedCase.refId} | {selectedCase.eid}
                  </h2>
                </div>
              </div>

              {/* Patient Info Card */}
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">PATIENT INFORMATION</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Patient Name</p>
                    <p className="text-sm font-medium text-slate-800">{selectedCase.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Patient Id</p>
                    {patientRecordExists(selectedCase.patientId) ? (
                      <p
                        onClick={() => {
                          setSelectedTaskId(null);
                          setSelectedPatientId(selectedCase.patientId!);
                        }}
                        className="text-sm font-medium text-arx-primary cursor-pointer hover:underline"
                      >
                        {selectedCase.patientId}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{selectedCase.patientId}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">DOB</p>
                    <p className="text-sm font-medium text-slate-800">{linkedPatient?.dob ?? "---"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Gender</p>
                    <p className="text-sm font-medium text-slate-800">{linkedPatient?.gender ?? "---"}</p>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="bg-white rounded-lg p-6 mb-6 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">SUMMARY</h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Related To</p>
                      <p className="text-sm text-slate-800">{selectedCase.related}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Due Date</p>
                      <p className="text-sm text-slate-800">{selectedCase.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <p className="text-sm text-slate-800">{selectedCase.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Sub Status</p>
                      <p className="text-sm text-slate-800">{selectedCase.subStatus}</p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                      <p className="text-sm text-slate-800">{selectedCase.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Created By</p>
                      <p className="text-sm text-slate-800">{selectedCase.createdBy}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Complete Date Time</p>
                      <p className="text-sm text-slate-800">{selectedCase.completeDatetime}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Priority</p>
                      <p className={`text-sm font-medium ${selectedCase.priority === "High" ? "text-red-600" : selectedCase.priority === "Medium" ? "text-orange-600" : "text-green-600"}`}>
                        {selectedCase.priority}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Case / Primary HCP — only for tasks tied to one of
                  the patient's cases (relatedCaseId set); direct-to-patient
                  tasks and Case-kind items themselves don't get this block. */}
              {selectedCase.kind === "Task" && selectedCase.relatedCaseId && (() => {
                const relatedCase = allItems.find((i) => i.id === selectedCase.relatedCaseId);
                const primaryHCPLink = selectedCase.patientId
                  ? allPatientHCPLinks.find((l) => l.patientId === selectedCase.patientId && l.role === "Primary")
                  : undefined;
                const primaryHCP = primaryHCPLink ? allHCPs.find((h) => h.id === primaryHCPLink.hcpId) : undefined;
                return (
                  <div className="bg-white rounded-lg p-6 mb-6 border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">RELATED CASE</h3>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Case Number</p>
                        {relatedCase ? (
                          <p
                            onClick={() => setSelectedTaskId(relatedCase.id)}
                            className="text-sm font-medium text-arx-primary cursor-pointer hover:underline"
                          >
                            {relatedCase.refId}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-800">---</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Stage</p>
                        <p className="text-sm text-slate-800">{selectedCase.stageName ?? "---"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Service Type</p>
                        <p className="text-sm text-slate-800">{relatedCase?.serviceType ?? "---"}</p>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-700 mb-4">PRIMARY HCP INFORMATION</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Physician Name</p>
                        <p className="text-sm text-slate-800">{primaryHCP?.physician ?? "---"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">NPI</p>
                        <p className="text-sm text-slate-800">{primaryHCP?.npi ?? "---"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Office Phone</p>
                        <p className="text-sm text-slate-800">{primaryHCP?.officePhone ?? "---"}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Task Description — in the reference app this field is
                  really a running notes log, not a single static blurb, so
                  it's one card: the original description (if any) shown as
                  the first entry, FRM-added notes appended below it, and
                  the same Add/Cancel input that used to be its own separate
                  "Comments" card. addComment/FieldComment still model each
                  entry the same way (itemId-keyed, not nested on FieldItem)
                  — only the label and layout changed, not the data shape. */}
              {(() => {
                const itemComments = comments.filter((c) => c.itemId === selectedCase.id);
                const relatedCase = selectedCase.kind === "Task" && selectedCase.relatedCaseId
                  ? allItems.find((i) => i.id === selectedCase.relatedCaseId)
                  : undefined;
                const relatedTasksForCase = selectedCase.kind === "Case"
                  ? allItems.filter((i) => i.kind === "Task" && i.relatedCaseId === selectedCase.id)
                  : [];
                const hasRelatedTarget = !!relatedCase || relatedTasksForCase.length > 0;

                const handleAdd = () => {
                  const text = commentDraft.trim();
                  if (!text) return;
                  addComment(selectedCase.id, text);
                  if (alsoAddToRelated) {
                    if (relatedCase) addComment(relatedCase.id, text);
                    relatedTasksForCase.forEach((t) => addComment(t.id, text));
                  }
                  setCommentDraft("");
                  setAlsoAddToRelated(false);
                };

                return (
                  <div className="bg-white rounded-lg p-6 mb-6 border border-slate-200">
                    <label className="text-xs font-semibold text-slate-700 mb-4 block">Task Description</label>

                    <div className="space-y-3 mb-4">
                      {selectedCase.description && (
                        <div className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">{selectedCase.createdBy}</span>
                            <span className="text-xs text-slate-400">{selectedCase.date}</span>
                          </div>
                          <p className="text-sm text-slate-700">{selectedCase.description}</p>
                        </div>
                      )}
                      {itemComments.map((c) => (
                        <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                            <span className="text-xs text-slate-400">{c.createdAt}</span>
                          </div>
                          <p className="text-sm text-slate-700">{c.text}</p>
                        </div>
                      ))}
                      {!selectedCase.description && itemComments.length === 0 && (
                        <p className="text-sm text-slate-400">No notes yet</p>
                      )}
                    </div>

                    <textarea
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      placeholder="Add a note..."
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-arx-primary"
                    />

                    {hasRelatedTarget && (
                      <label className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                        <input
                          type="checkbox"
                          checked={alsoAddToRelated}
                          onChange={(e) => setAlsoAddToRelated(e.target.checked)}
                        />
                        {relatedCase
                          ? `Also add to Case ${relatedCase.refId}`
                          : `Also add to related task${relatedTasksForCase.length > 1 ? "s" : ""} (${relatedTasksForCase.map((t) => t.refId).join(", ")})`}
                      </label>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleAdd}
                        disabled={!commentDraft.trim()}
                        className="px-4 py-2 text-sm rounded bg-arx-primary text-white hover:bg-arx-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setCommentDraft(""); setAlsoAddToRelated(false); }}
                        className="px-4 py-2 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {detailView === "PATIENT" && selectedPatient && (
          <div className="flex-1 overflow-auto">
            <div className="p-6 bg-white min-h-full">
              {/* Breadcrumb Navigation */}
              <div className="mb-6 flex items-center gap-2 text-sm">
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="text-arx-primary hover:underline font-medium"
                >
                  My Patients
                </button>
                <span className="text-slate-400">/</span>
                <span className="text-slate-700 font-medium">{selectedPatient.name}</span>
              </div>

              {/* Patient Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-arx-primary-30 rounded flex items-center justify-center">
                      <span className="text-arx-primary font-semibold">👤</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Patient</p>
                      <h2 className="text-xl font-semibold text-slate-800">{selectedPatient.name} | {selectedPatient.id}</h2>
                    </div>
                  </div>
                </div>

                {/* Patient Info Grid */}
                <div className="grid grid-cols-4 gap-4 bg-slate-50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Patient Name</p>
                    <p className="text-sm font-medium text-slate-800">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Patient Id</p>
                    <p className="text-sm font-medium text-arx-primary">{selectedPatient.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">DOB</p>
                    <p className="text-sm font-medium text-slate-800">{selectedPatient.dob}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Gender</p>
                    <p className="text-sm font-medium text-slate-800">{selectedPatient.gender}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-slate-200 mb-6">
                <div className="flex gap-8">
                  {["SUMMARY", "RELATED", "RELATED DOCS"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setPatientTab(tab)}
                      className={`py-3 text-sm font-medium transition-colors border-b-2 ${
                        tab === patientTab
                          ? "text-arx-primary border-arx-primary"
                          : "text-slate-500 border-transparent hover:text-slate-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Tab Content */}
              {patientTab === "SUMMARY" && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-2">External Patient Id</p>
                    <p className="text-sm text-slate-800">{selectedPatient.externalPatientId}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-2">Account Status</p>
                    <p className="text-sm text-slate-800">{selectedPatient.accountStatus}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-2">Territory</p>
                    <p className="text-sm text-slate-800">{selectedPatient.territory}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-2">Allergies</p>
                    <p className="text-sm text-slate-800">{selectedPatient.allergies}</p>
                  </div>
                </div>
              )}

              {/* Related Tab Content — eight tables, each a filtered slice
                  of a store collection joined on this patient's id. Tasks
                  and Cases reuse the same unified allItems list every other
                  view reads from; the rest come from the new relationship
                  tables in fieldStore.ts. */}
              {patientTab === "RELATED" && (() => {
                const pid = selectedPatient.id;
                const patientTasks = allItems.filter((i) => i.kind === "Task" && i.patientId === pid);
                const patientCases = allItems.filter((i) => i.kind === "Case" && i.patientId === pid);
                const patientSOCRows = allPatientSOCLinks.filter((l) => l.patientId === pid);
                const patientHCPRows = allPatientHCPLinks.filter((l) => l.patientId === pid);
                const patientRx = allPrescriptions.filter((p) => p.patientId === pid);
                const patientIns = allInsurance.filter((i) => i.patientId === pid);
                const patientAuths = allAuthorizations.filter((a) => a.patientId === pid);
                const patientShipments = allShipments.filter((s) => s.patientId === pid);

                return (
                  <div>
                    <RelatedTable
                      title="Tasks"
                      count={patientTasks.length}
                      columns={["Subject", "Related Item", "Status", "Due Date", "Assigned To"]}
                      rows={patientTasks.map((t) => {
                        const relatedCase = t.relatedCaseId ? allItems.find((c) => c.id === t.relatedCaseId) : null;
                        return [
                          <button key="s" onClick={() => { setSelectedPatientId(null); setSelectedTaskId(t.id); }} className="text-arx-primary font-medium hover:underline">
                            {t.refId}
                          </button>,
                          relatedCase ? (
                            <button key="r" onClick={() => { setSelectedPatientId(null); setSelectedTaskId(relatedCase.id); }} className="text-arx-primary hover:underline">
                              {relatedCase.refId} (Stage: {t.stageName})
                            </button>
                          ) : (
                            <span key="r">{pid}</span>
                          ),
                          t.status,
                          t.dueDate,
                          t.assignedTo,
                        ];
                      })}
                    />

                    <RelatedTable
                      title="SOC"
                      count={patientSOCRows.length}
                      columns={["Facility Name", "NPI", "Contact Name", "Contact Phone", "City", "State", "Zip", "Primary"]}
                      rows={patientSOCRows.map((link) => {
                        const soc = allSOCs.find((s) => s.id === link.socId);
                        return [
                          soc?.facilityName ?? "---",
                          soc?.npi ?? "---",
                          soc?.contactName ?? "---",
                          soc?.contactPhone ?? "---",
                          soc?.city ?? "---",
                          soc?.state ?? "---",
                          soc?.zip ?? "---",
                          link.isPrimary ? "✓" : "",
                        ];
                      })}
                    />

                    <RelatedTable
                      title="HCP"
                      count={patientHCPRows.length}
                      columns={["Physician Name", "NPI", "Office Phone", "Office Email", "Role"]}
                      rows={patientHCPRows.map((link) => {
                        const hcp = allHCPs.find((h) => h.id === link.hcpId);
                        return [
                          hcp?.physician ?? "---",
                          hcp?.npi ?? "---",
                          hcp?.officePhone ?? "---",
                          hcp?.officeEmail ?? "---",
                          link.role,
                        ];
                      })}
                    />

                    <RelatedTable
                      title="Prescription"
                      count={patientRx.length}
                      columns={["Prescription Name", "HCP Affiliation", "HCP Signature", "HCP Signature Date"]}
                      rows={patientRx.map((rx) => {
                        const hcp = allHCPs.find((h) => h.id === rx.hcpId);
                        return [
                          rx.prescriptionName,
                          hcp?.physician ?? "---",
                          rx.hcpSignature ? "✓" : "—",
                          rx.hcpSignatureDate,
                        ];
                      })}
                    />

                    <RelatedTable
                      title="Cases"
                      count={patientCases.length}
                      columns={["Case", "Date/Time Opened", "Date/Time Closed", "Service Type"]}
                      rows={patientCases.map((c) => [
                        <button key="c" onClick={() => { setSelectedPatientId(null); setSelectedTaskId(c.id); }} className="text-arx-primary font-medium hover:underline">
                          {c.refId}
                        </button>,
                        c.createdAt,
                        c.closedAt ?? "---",
                        c.serviceType ?? "---",
                      ])}
                    />

                    <RelatedTable
                      title="Insurance"
                      count={patientIns.length}
                      columns={["Insurance Name", "Rank", "Effective Date", "Plan Type", "Group Number", "Rx Group Number", "Rx Member Id", "Status"]}
                      rows={patientIns.map((ins) => [
                        ins.insuranceName,
                        ins.rank,
                        ins.effectiveDate,
                        ins.insurancePlanType,
                        ins.groupNumber,
                        ins.rxGroupNumber,
                        ins.rxMemberId,
                        ins.status,
                      ])}
                    />

                    <RelatedTable
                      title="Patient Authorizations"
                      count={patientAuths.length}
                      columns={["Authorization Id", "Type", "Status", "Effective Date", "Revocation Date", "Attestation Date", "Received Date"]}
                      rows={patientAuths.map((a) => [
                        a.id,
                        a.authType,
                        a.status,
                        a.effectiveDate,
                        a.revocationDate,
                        a.attestationDate,
                        a.receivedDate,
                      ])}
                    />

                    <RelatedTable
                      title="SP Shipment"
                      count={patientShipments.length}
                      columns={["Shipment Id", "Prescription", "Carrier", "Tracking #", "Ship Date", "Est. Delivery", "Delivered", "Status"]}
                      rows={patientShipments.map((s) => {
                        const rx = allPrescriptions.find((p) => p.id === s.prescriptionId);
                        return [
                          s.id,
                          rx?.prescriptionName ?? "---",
                          s.carrier,
                          s.trackingNumber,
                          s.shipDate,
                          s.estDelivery,
                          s.deliveredDate ?? "---",
                          s.status,
                        ];
                      })}
                    />
                  </div>
                );
              })()}

              {/* Related Docs — the seeded patients have no document
                  records (nothing to show, same as before). The live
                  patient's Enrollment Application fax exists once enrolled
                  on a fax-intake flow, same gate as CRM's Related
                  Documents tab (isFaxFlow) and the same file both portals
                  point at, so dropping a real PDF into public/ lights up
                  the preview in both places at once. */}
              {patientTab === "RELATED DOCS" && (() => {
                const hasEnrollmentDoc = selectedPatient.id === "AS-164543" && enrollmentStatus === "enrolled" && isFaxFlow;
                if (!hasEnrollmentDoc) {
                  return <p className="text-sm text-slate-400 text-center py-10">No documents</p>;
                }
                return (
                  <div>
                    <RelatedTable
                      title="Documents"
                      count={1}
                      columns={["File ID", "File Name", "Type", "Pages", "Date Received"]}
                      rows={[[
                        <button key="f" onClick={() => setShowEnrollmentDoc(true)} className="text-arx-primary font-medium hover:underline">
                          FAX-2026-00431
                        </button>,
                        <button key="n" onClick={() => setShowEnrollmentDoc(true)} className="text-arx-primary hover:underline">
                          Enrollment_Form_KReeves_051526.pdf
                        </button>,
                        "Enrollment Form",
                        "3",
                        daysFromToday(-4),
                      ]]}
                    />

                    {showEnrollmentDoc && createPortal(
                      <div
                        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                        onClick={() => setShowEnrollmentDoc(false)}
                      >
                        <div
                          className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col"
                          style={{ height: "80vh" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                            <span className="text-sm font-semibold text-slate-700">Enrollment_Form_KReeves_051526.pdf</span>
                            <div className="flex items-center gap-2">
                              <a
                                href="/enrollment-form.pdf"
                                download="Enrollment_Form_KReeves_051526.pdf"
                                className="text-xs px-2 py-1 rounded border border-slate-300 text-arx-primary hover:bg-slate-100"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => setShowEnrollmentDoc(false)}
                                aria-label="Close"
                                className="rounded p-1 text-slate-500 hover:opacity-70"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <object data="/enrollment-form.pdf" type="application/pdf" className="flex-1 w-full">
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 bg-slate-50">
                              <span className="text-sm font-medium">PDF preview not available</span>
                              <span className="text-xs">
                                Place <code className="bg-slate-200 px-1 rounded">enrollment-form.pdf</code> in the <code className="bg-slate-200 px-1 rounded">public/</code> folder to enable preview
                              </span>
                            </div>
                          </object>
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Cases View */}
        {!detailView && selectedTab === "MY_CASES" && (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">My Cases</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Case Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Service Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Prescriber</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Territory</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">FRM Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.filter((i) => i.kind === "Case").map((caseItem) => (
                    <tr key={caseItem.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td
                        onClick={() => { setSelectedPatientId(null); setSelectedTaskId(caseItem.id); }}
                        className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                      >
                        {caseItem.refId}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.status}</td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.serviceType}</td>
                      {patientRecordExists(caseItem.patientId) ? (
                        <td
                          onClick={() => { setSelectedTaskId(null); setSelectedPatientId(caseItem.patientId); }}
                          className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                        >
                          {caseItem.patient}
                        </td>
                      ) : (
                        <td className="px-4 py-3 text-slate-700">{caseItem.patient}</td>
                      )}
                      <td className="px-4 py-3 text-slate-700">{caseItem.prescriber}</td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.territory}</td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.frmContact}</td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!detailView && selectedTab === "MY_PATIENTS" && (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">My Patients</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">DOB</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Primary Prescriber</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Primary SOC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Territory</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Region</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Consent Expiration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Enrollment</th>
                  </tr>
                </thead>
                <tbody>
                  {allPatients.map((patient) => (
                    <tr key={patient.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td
                        onClick={() => { setSelectedTaskId(null); setSelectedPatientId(patient.id); }}
                        className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                      >
                        {patient.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{patient.dob}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.primaryPrescriber}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.primarySOC}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.territory}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.region}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.consentExpiration}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.enrollmentDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!detailView && selectedTab === "MY_HCPS" && (
          <div className="flex-1 overflow-auto p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">My HCPs</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Physician</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">NPI</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Preferred Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Office Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Office Fax</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Office Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Zip</th>
                  </tr>
                </thead>
                <tbody>
                  {allHCPs.map((hcp) => (
                    <tr key={hcp.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{hcp.physician}</td>
                      <td className="px-4 py-3 text-slate-700">{hcp.npi}</td>
                      <td className="px-4 py-3 text-slate-700">{hcp.preferredContact}</td>
                      <td className="px-4 py-3 text-slate-700">{hcp.officePhone}</td>
                      <td className="px-4 py-3 text-slate-700">{hcp.officeFax}</td>
                      <td className="px-4 py-3 text-slate-700">{hcp.officeEmail}</td>
                      <td className="px-4 py-3 text-slate-700">{hcp.zip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
