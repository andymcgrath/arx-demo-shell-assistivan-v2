import { ChevronDown, Settings, ListTodo, ArrowLeft, Calendar, Users, AlertCircle, CheckSquare, Clock, Zap, Shield } from "lucide-react";
import { useState } from "react";
import { useDemoStore } from "@/store/demoStore";
import { useFieldStore, type FieldItem, type FieldPatientRecord } from "@/store/fieldStore";
import { usePatientStore } from "@/store/patientStore";
import { useDemoState } from "@/hooks/useDemoState";

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
  };
}

export default function FieldPortal() {
  const { state } = useDemoState("Field");
  const demoState = useDemoStore();
  const patientState = usePatientStore();

  // Workflow state from actor (via useDemoState)
  const paStatus = state.pa_status;
  const consentStatus = state.consent_status;
  const [selectedTab, setSelectedTab] = useState("DASHBOARD");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientTab, setPatientTab] = useState("SUMMARY");
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));
  const [calendarView, setCalendarView] = useState<"Month" | "Week" | "Day" | "List">("Month");
  const [showQuickView, setShowQuickView] = useState<string | null>(null);

  const currentDate = new Date();
  const daysUntilPADue = new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Field Portal's core dataset — seeded once, persisted to sessionStorage
  // (see client/store/fieldStore.ts). Does not vary by workflow.
  const { items: persistedItems, hcps: fieldHCPs, patients: storePatients } = useFieldStore();

  const liveItems: FieldItem[] = [];

  // "Missing Information" task - created in the CRM on eRx submission,
  // closed once the patient completes enrollment (consentStatus flips to
  // "confirmed" — the same field the HUB's own EA-14272 stage uses to mark
  // "Enrollment Completed"). Not gated on biStatus, since iAssist can reach
  // full enrollment via the patient consent flow independent of BI. Kept
  // live (computed every render from the actor) rather than persisted, so
  // it always reflects whichever workflow is actually active.
  liveItems.push({
    id: "LIVE-MISSING-INFO",
    kind: "Task",
    refId: "Missing Information",
    status: consentStatus === "confirmed" ? "Closed" : "Open",
    priority: "High",
    dueDate: "Jun 14, 2026",
    createdAt: "Jun 14, 2026",
    patient: patientState.patientName,
    patientId: "AS-164543",
    prescriber: "---",
    territory: "---",
    assignedTo: "Sarah Mitchell",
    subStatus: "--None--",
    description: "Gather missing patient information for enrollment",
  });

  // "Prior Authorization Requested" task - created once PA has been
  // submitted (paStatus !== "none"), closed on Approval. Keyed off paStatus
  // rather than biStatus so iAssist's auto-submitted PA (which can happen
  // before BI ever runs) still surfaces this task.
  if (paStatus !== "none") {
    liveItems.push({
      id: "LIVE-PA-REQUESTED",
      kind: "Task",
      refId: "Prior Authorization Requested",
      status: paStatus === "approved" ? "Closed" : "Open",
      priority: "High",
      dueDate: daysUntilPADue,
      createdAt: "Jun 14, 2026",
      patient: patientState.patientName,
      patientId: "AS-164543",
      prescriber: "---",
      territory: "---",
      assignedTo: "Sarah Mitchell",
      subStatus: "--None--",
      description: "Submit Prior Authorization request to payer",
    });
  }

  // Single source of truth for every task/case-shaped view on this portal —
  // the two live entries above plus the persisted seed. Dashboard KPI
  // cards, the quick-view modal, and the My Tasks/My Cases tabs all read
  // from this same list (filtered differently), so a given item's
  // priority/status/dueDate means the same thing everywhere it shows up.
  const allItems: FieldItem[] = [...liveItems, ...persistedItems];

  const cases: Case[] = allItems.map(toCase);

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
    primaryPrescriber: "---",
    primarySOC: "---",
    consentExpiration: "---",
    enrollmentDate: "Jun 14, 2026",
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
  const allPatients: FieldPatientRecord[] = [livePatient, ...storePatients];

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
  const today = new Date(2026, 5, 14);
  const todayDateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const uniqueHCPs = fieldHCPs.length;
  const idleCases = allItems.filter(i => i.kind === "Case" && i.status === "Idle").length;
  const pendingConsents = allItems.filter(i => i.status === "Pending Consent").length;
  const todayCases = allItems.filter(i => i.dueDate === todayDateStr && i.status !== "Closed").length;
  const urgentTasks = allItems.filter(i => i.kind === "Task" && i.priority === "High" && i.status !== "Closed").length;
  const createdTodayCount = allItems.filter(i => i.createdAt === todayDateStr).length;

  // Quick-view modal rows — same predicates as the stat cards above, so the
  // number on a card always matches what clicking it shows. "Total HCPs" is
  // a separate entity (fieldHCPs), rendered by its own branch below, so it's
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
  
  const getCaseDatesForMonth = (date: Date) => {
    const caseDates = new Set<number>();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString();
    cases.forEach(c => {
      const parts = c.dueDate.split(' ');
      if (parts[0] === monthName && parts[2] === year) {
        const dayNum = parseInt(parts[1], 10);
        if (Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31) {
          caseDates.add(dayNum);
        }
      }
    });
    return caseDates;
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const caseDates = getCaseDatesForMonth(currentMonth);
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });


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
              onClick={() => setSelectedTab(item.id)}
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
                      Total Records: {showQuickView === "Total HCPs" ? fieldHCPs.length : quickViewCases.length}
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
                              {fieldHCPs.map((hcp) => (
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
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient ID</th>
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
                                  <td
                                    onClick={() => {
                                      if (!caseItem.patientId) return;
                                      setShowQuickView(null);
                                      setSelectedTaskId(null);
                                      setSelectedPatientId(caseItem.patientId);
                                    }}
                                    className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                                  >
                                    {caseItem.patientId || "---"}
                                  </td>
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
                          return (
                            <div
                              key={idx}
                              className={`border-slate-300 p-3 min-h-20 ${
                                !isLastCol ? 'border-r' : ''
                              } ${
                                !isLastRow ? 'border-b' : ''
                              } ${
                                day === null ? 'bg-slate-50' : ''
                              }`}
                            >
                              {day && (
                                <div>
                                  <p className={`text-sm mb-2 ${
                                    day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear() ? 'text-slate-900' : 'font-medium text-slate-700'
                                  }`}>
                                    {day}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                        {[14, 15, 16, 17, 18, 19, 20].map((day) => (
                          <div key={day} className="border-slate-300 p-4 min-h-24 border-r border-b last:border-r-0">
                            <p className={`text-sm mb-2 ${
                              day === 14 ? 'text-slate-900' : 'font-medium text-slate-700'
                            }`}>
                              {day}
                            </p>
                            {day === 14 && (
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
                      <p className="text-center text-slate-500 text-sm mt-2">Showing June 14, 2026 (Today)</p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient ID</th>
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
                      <td className="px-4 py-3 text-slate-700">{task.patient}</td>
                      <td
                        onClick={() => { setSelectedTaskId(null); setSelectedPatientId(task.patientId); }}
                        className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                      >
                        {task.patientId}
                      </td>
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
                    <p
                      onClick={() => {
                        if (!selectedCase.patientId) return;
                        setSelectedTaskId(null);
                        setSelectedPatientId(selectedCase.patientId);
                      }}
                      className="text-sm font-medium text-arx-primary cursor-pointer hover:underline"
                    >
                      {selectedCase.patientId}
                    </p>
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

              {/* Task Description */}
              <div className="bg-white rounded-lg p-6 mb-6 border border-slate-200">
                <label className="text-xs font-semibold text-slate-700 mb-2 block">Task Description</label>
                <p className="text-sm text-slate-700 min-h-24">{selectedCase.description || "---"}</p>
              </div>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient ID</th>
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
                      <td className="px-4 py-3 text-slate-700">{caseItem.patient}</td>
                      <td
                        onClick={() => { setSelectedTaskId(null); setSelectedPatientId(caseItem.patientId); }}
                        className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                      >
                        {caseItem.patientId}
                      </td>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">ARx Id</th>
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
                      <td className="px-4 py-3 text-slate-700">{patient.name}</td>
                      <td
                        onClick={() => { setSelectedTaskId(null); setSelectedPatientId(patient.id); }}
                        className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                      >
                        {patient.id}
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
                  {fieldHCPs.map((hcp) => (
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
