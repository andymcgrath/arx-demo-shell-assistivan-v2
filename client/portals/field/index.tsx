import { ChevronDown, Settings, ListTodo, ArrowLeft, Calendar, Users, AlertCircle, CheckSquare, Clock, Zap, Shield } from "lucide-react";
import { useState } from "react";
import { PATIENTS, FIELD_AGENTS, useDemoStore, FIELD_TASKS, FIELD_CASES, FIELD_PATIENTS, FIELD_HCPS } from "@/store/demoStore";
import { usePatientStore } from "@/store/patientStore";
import { useDemoState } from "@/hooks/useDemoState";

// Core data model
interface Case {
  id: number;
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
  dob?: string;
  gender?: string;
  subStatus?: string;
  createdBy?: string;
  completeDatetime?: string;
  priority?: string;
  description?: string;
}

interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: string;
  externalPatientId: string;
  accountStatus: string;
  allergies: string;
  territory: string;
  homePhone: string;
  mobilePhone: string;
  email: string;
  workPhone: string;
  workPhoneExtension: string;
  alternatePhone: string;
  preferredPhone: string;
  preferredMethodOfContact: string;
  bestTimeToContact: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export default function FieldPortal() {
  const { state } = useDemoState("Field");
  const demoState = useDemoStore();
  const patientState = usePatientStore();

  // Workflow state from actor (via useDemoState)
  const paStatus = state.pa_status;
  const consentStatus = state.consent_status;
  const [selectedTab, setSelectedTab] = useState("DASHBOARD");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientTab, setPatientTab] = useState("SUMMARY");
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));
  const [calendarView, setCalendarView] = useState<"Month" | "Week" | "Day" | "List">("Month");
  const [showQuickView, setShowQuickView] = useState<string | null>(null);
  const [taskOrigin, setTaskOrigin] = useState<"DASHBOARD" | "MY_TASKS" | "MY_PATIENTS">("DASHBOARD");

  const patients: Record<string, Patient> = {
    "AS-164542": {
      id: "AS-164542",
      name: "Takeda Laga Test",
      dob: "3/25/1997",
      gender: "Male",
      externalPatientId: "000007087",
      accountStatus: "Active",
      allergies: "Peanut",
      territory: "New York",
      homePhone: "8056252520",
      mobilePhone: "8056252521",
      email: "takedalogstest@yopmail.com",
      workPhone: "",
      workPhoneExtension: "044",
      alternatePhone: "8056252524",
      preferredPhone: "Mobile",
      preferredMethodOfContact: "Phone",
      bestTimeToContact: "Morning",
      address: "101 S Garland Ave Suite 110",
      city: "Orlando",
      state: "Florida",
      zip: "32801",
    },
    "AS-164543": {
      id: "AS-164543",
      name: "Keanu Dixon",
      dob: "5/10/1985",
      gender: "Male",
      externalPatientId: "000007088",
      accountStatus: "Active",
      allergies: "Latex",
      territory: "Texas",
      homePhone: patientState.phone,
      mobilePhone: patientState.phone,
      email: patientState.email,
      workPhone: "",
      workPhoneExtension: "101",
      alternatePhone: patientState.phone,
      preferredPhone: "Mobile",
      preferredMethodOfContact: patientState.preferredMethodOfContact,
      bestTimeToContact: "Afternoon",
      address: "456 Oak Ave",
      city: "Houston",
      state: "Texas",
      zip: "77001",
    },
    "AS-164544": {
      id: "AS-164544",
      name: "Jessica Williams",
      dob: "7/22/1992",
      gender: "Female",
      externalPatientId: "000007089",
      accountStatus: "Active",
      allergies: "Penicillin",
      territory: "California",
      homePhone: "4155551111",
      mobilePhone: "4155551112",
      email: "jessicaw@yopmail.com",
      workPhone: "4155551113",
      workPhoneExtension: "202",
      alternatePhone: "4155551114",
      preferredPhone: "Work",
      preferredMethodOfContact: "Phone",
      bestTimeToContact: "Morning",
      address: "789 Pine St",
      city: "San Francisco",
      state: "California",
      zip: "94105",
    },
    "AS-164545": {
      id: "AS-164545",
      name: "Robert Brown",
      dob: "11/3/1988",
      gender: "Male",
      externalPatientId: "000007090",
      accountStatus: "Active",
      allergies: "None",
      territory: "New Jersey",
      homePhone: "2015552222",
      mobilePhone: "2015552223",
      email: "robertb@yopmail.com",
      workPhone: "2015552224",
      workPhoneExtension: "303",
      alternatePhone: "2015552225",
      preferredPhone: "Mobile",
      preferredMethodOfContact: "Email",
      bestTimeToContact: "Evening",
      address: "321 Elm St",
      city: "Newark",
      state: "New Jersey",
      zip: "07101",
    },
    "AS-164546": {
      id: "AS-164546",
      name: "Lisa Anderson",
      dob: "2/14/1995",
      gender: "Female",
      externalPatientId: "000007091",
      accountStatus: "Active",
      allergies: "Sulfa",
      territory: "Pennsylvania",
      homePhone: "6105553333",
      mobilePhone: "6105553334",
      email: "lisaa@yopmail.com",
      workPhone: "6105553335",
      workPhoneExtension: "404",
      alternatePhone: "6105553336",
      preferredPhone: "Home",
      preferredMethodOfContact: "Phone",
      bestTimeToContact: "Morning",
      address: "654 Maple Dr",
      city: "Philadelphia",
      state: "Pennsylvania",
      zip: "19103",
    },
    "AS-164547": {
      id: "AS-164547",
      name: "David Martinez",
      dob: "9/8/1980",
      gender: "Male",
      externalPatientId: "000007092",
      accountStatus: "Active",
      allergies: "Aspirin",
      territory: "Texas",
      homePhone: "2125554444",
      mobilePhone: "2125554445",
      email: "davidm@yopmail.com",
      workPhone: "2125554446",
      workPhoneExtension: "505",
      alternatePhone: "2125554447",
      preferredPhone: "Mobile",
      preferredMethodOfContact: "Phone",
      bestTimeToContact: "Afternoon",
      address: "987 Cedar Ln",
      city: "Dallas",
      state: "Texas",
      zip: "75201",
    },
  };

  const currentDate = new Date();
  const daysUntilPADue = new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const dynamicCases: Case[] = [];

  // "Missing Information" task - created in the CRM on eRx submission,
  // closed once the patient completes enrollment (consentStatus flips to
  // "confirmed" — the same field the HUB's own EA-14272 stage uses to mark
  // "Enrollment Completed"). Not gated on biStatus, since iAssist can reach
  // full enrollment via the patient consent flow independent of BI.
  dynamicCases.push({
    id: 1,
    refId: "Missing Information",
    related: "Patient",
    status: consentStatus === "confirmed" ? "Closed" : "Open",
    date: "Jun 14, 2026",
    dueDate: "Jun 14, 2026",
    eid: "EI-56342",
    label: "New Patient Referral",
    assignedTo: "Sarah Mitchell",
    patientName: "Keanu Dixon",
    patientId: "AS-164543",
    dob: "5/10/1985",
    gender: "Male",
    subStatus: "--None--",
    createdBy: "CaseAssist Update",
    completeDatetime: consentStatus === "confirmed" ? "Jun 14, 2026" : "---",
    priority: "High",
    description: "Gather missing patient information for enrollment"
  });

  // "Prior Authorization Requested" task - created once PA has been
  // submitted (paStatus !== "none"), closed on Approval. Keyed off paStatus
  // rather than biStatus so iAssist's auto-submitted PA (which can happen
  // before BI ever runs) still surfaces this task.
  if (paStatus !== "none") {
    dynamicCases.push({
      id: 2,
      refId: "Prior Authorization Requested",
      related: "Patient",
      status: paStatus === "approved" ? "Closed" : "Open",
      date: "Jun 14, 2026",
      dueDate: daysUntilPADue,
      eid: "EI-56342",
      label: "PA Submission Required",
      assignedTo: "Sarah Mitchell",
      patientName: "Keanu Dixon",
      patientId: "AS-164543",
      dob: "5/10/1985",
      gender: "Male",
      subStatus: "--None--",
      createdBy: "CaseAssist Update",
      completeDatetime: paStatus === "approved" ? "Jun 14, 2026" : "---",
      priority: "High",
      description: "Submit Prior Authorization request to payer"
    });
  }

  // Add other static cases
  dynamicCases.push(
    { id: 3, refId: "Payer Outreach", related: "Stage", status: "Pending Patient Consent", date: "Jun 15, 2026", dueDate: "Jun 20, 2026", eid: "EI-56344", label: "Steroid Legs Test", assignedTo: "Maria Rodriguez", patientName: "Jessica Williams", patientId: "AS-164544", dob: "7/22/1992", gender: "Female", subStatus: "--None--", createdBy: "Takeda FRM Contact Test", completeDatetime: "---", priority: "High", description: "---" },
    { id: 4, refId: "Appeals Follow Up", related: "Patient", status: "Open", date: "Jun 8, 2026", dueDate: "Jun 14, 2026", eid: "EI-56345", label: "Steroid Legs Test", assignedTo: "James Chen", patientName: "Robert Brown", patientId: "AS-164545", dob: "11/3/1988", gender: "Male", subStatus: "--None--", createdBy: "Takeda FRM Contact Test", completeDatetime: "---", priority: "Medium", description: "---" },
    { id: 5, refId: "Adherence Call 3", related: "State", status: "Open", date: "Jun 14, 2026", dueDate: "Jun 14, 2026", eid: "EI-56346", label: "Steroid Legs Test", assignedTo: "James Chen", patientName: "Lisa Anderson", patientId: "AS-164546", dob: "2/14/1995", gender: "Female", subStatus: "--None--", createdBy: "Takeda FRM Contact Test", completeDatetime: "---", priority: "Low", description: "---" },
    { id: 6, refId: "Adherence Call 4", related: "Stage", status: "Idle", date: "Jun 12, 2026", dueDate: "Jun 16, 2026", eid: "EI-56347", label: "Steroid Legs Test", assignedTo: "Maria Rodriguez", patientName: "David Martinez", patientId: "AS-164547", dob: "9/8/1980", gender: "Male", subStatus: "--None--", createdBy: "Takeda FRM Contact Test", completeDatetime: "---", priority: "High", description: "---" }
  );

  const cases: Case[] = dynamicCases;

  const selectedCase = selectedTaskId !== null ? cases.find(c => c.id === selectedTaskId) : null;
  const selectedPatient = selectedPatientId !== null ? patients[selectedPatientId] : null;

  // Calculate stats
  const today = new Date(2026, 5, 14);
  const todayDateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const uniqueHCPs = 52;
  const idleCases = cases.filter(c => c.status === "Idle").length;
  const pendingConsents = 7;
  const todayCases = 14;
  const urgentTasks = 32;
  const createdTodayCount = 13;

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
        {selectedTab === "DASHBOARD" && (
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
                    className={`${stat.color} rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow`}
                    onClick={() => setShowQuickView(stat.label)}
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

              {/* Dynamic Quick View Modal */}
              {showQuickView && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto">
                    {/* Modal Header */}
                    <div className="bg-arx-primary text-white p-6 flex items-center justify-between sticky top-0">
                      <h2 className="text-xl font-semibold">{showQuickView}</h2>
                      <button
                        onClick={() => setShowQuickView(null)}
                        className="text-white hover:bg-arx-primary-dark rounded p-2 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6">
                      {/* Metrics */}
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Showing Page 1 of 2 | Total Records: 10</p>
                        </div>
                        <div className="flex gap-3">
                          <select className="px-3 py-2 border border-slate-300 rounded text-sm">
                            <option>5 Records</option>
                            <option>10 Records</option>
                            <option>25 Records</option>
                          </select>
                          <select className="px-3 py-2 border border-slate-300 rounded text-sm">
                            <option>Sort By</option>
                            <option>Due Date</option>
                            <option>Priority</option>
                            <option>Assigned To</option>
                          </select>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto border border-slate-200 rounded-lg mb-6">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Subject</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Patient ID</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Description</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Assigned To ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cases.filter(c => {
                              if (showQuickView === "Urgent Tasks") return c.priority === "High";
                              if (showQuickView === "Due Today") return c.dueDate === todayDateStr;
                              if (showQuickView === "Pending Consent") return c.status === "Pending Patient Consent";
                              if (showQuickView === "Created Today") return c.date === todayDateStr;
                              if (showQuickView === "Total HCPs") return true;
                              if (showQuickView === "Idle Cases") return c.status === "Idle";
                              return false;
                            }).map((caseItem) => (
                              <tr key={caseItem.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td
                                  onClick={() => {
                                    setTaskOrigin("DASHBOARD");
                                    setShowQuickView(null);
                                    setSelectedTaskId(caseItem.id);
                                  }}
                                  className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline"
                                >
                                  {caseItem.refId}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{caseItem.patientId || "---"}</td>
                                <td className="px-4 py-3 text-slate-700">{caseItem.description || "---"}</td>
                                <td className="px-4 py-3 text-slate-700">{caseItem.assignedTo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-center gap-2">
                        <button className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50">First</button>
                        <button className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50">Previous</button>
                        <span className="px-4 py-2 text-sm text-slate-700">Page 1 of 2</span>
                        <button className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50">Next</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks View */}
        {selectedTab === "MY_TASKS" && !selectedTaskId && (
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
                  {FIELD_TASKS.map((task) => (
                    <tr key={task.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline">{task.subject}</td>
                      <td className="px-4 py-3 text-slate-700">{task.prescriber}</td>
                      <td className="px-4 py-3 text-slate-700">{task.patient}</td>
                      <td className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline">{task.patientId}</td>
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

        {selectedTab === "MY_TASKS" && selectedTaskId && selectedCase && (
          <div className="flex-1 overflow-auto">
            <div className="p-6 bg-white min-h-full">
              {/* Breadcrumb Navigation */}
              <div className="mb-6 flex items-center gap-2 text-sm">
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="text-arx-primary hover:underline font-medium"
                >
                  My Tasks
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
                    <p className="text-sm font-medium text-arx-primary">{selectedCase.patientId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">DOB</p>
                    <p className="text-sm font-medium text-slate-800">{selectedCase.dob}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Gender</p>
                    <p className="text-sm font-medium text-slate-800">{selectedCase.gender}</p>
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

        {selectedTab === "MY_TASKS" && selectedPatientId && selectedPatient && !selectedTaskId && (
          <div className="flex-1 overflow-auto">
            <div className="p-6 bg-white min-h-full">
              {/* Breadcrumb Navigation */}
              <div className="mb-6 flex items-center gap-2 text-sm">
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="text-arx-primary hover:underline font-medium"
                >
                  My Tasks
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
        {selectedTab === "MY_CASES" && (
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
                  {FIELD_CASES.map((caseItem) => (
                    <tr key={caseItem.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline">{caseItem.caseNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.status}</td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.serviceType}</td>
                      <td className="px-4 py-3 text-slate-700">{caseItem.patient}</td>
                      <td className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline">{caseItem.patientId}</td>
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

        {selectedTab === "MY_PATIENTS" && (
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
                  {FIELD_PATIENTS.map((patient) => (
                    <tr key={patient.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{patient.patient}</td>
                      <td className="px-4 py-3 text-arx-primary font-medium cursor-pointer hover:underline">{patient.arbId}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.dob}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.primaryPrescriber}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.primarySOC}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.territory}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.region}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.consentExpi}</td>
                      <td className="px-4 py-3 text-slate-700">{patient.enrollmentDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === "MY_HCPS" && (
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
                  {FIELD_HCPS.map((hcp) => (
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
