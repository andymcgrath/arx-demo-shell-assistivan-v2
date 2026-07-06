import { useDemoState } from "@/hooks/useDemoState";
import { Search, Plus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@/lib/portalRouter";

type DotState = "completed" | "pending" | "attention" | "disabled" | "skipped";

interface PatientRow {
  id: string;
  name: string;
  dob: string;
  medication: string;
  statusDots: DotState[];
  badge?: "remsRenewal";
  hasRepeat?: boolean;
}

interface RenewalItem {
  id: string;
  patient: string;
  reach: string;
  date: string;
  month: string;
}

const PATIENTS: PatientRow[] = [
  {
    id: "1",
    name: "Anna Schultz",
    dob: "DOB 04/10/1950",
    medication: "Aficamten",
    statusDots: ["completed", "completed", "completed", "skipped", "attention", "attention"],
    badge: "remsRenewal",
  },
  {
    id: "2",
    name: "Judy Lee",
    dob: "DOB 04/10/1950",
    medication: "Ramoni",
    statusDots: ["completed", "completed", "completed", "completed", "disabled", "disabled"],
  },
  {
    id: "3",
    name: "Bob Smith",
    dob: "DOB 04/10/1950",
    medication: "Voloxivan",
    statusDots: ["completed", "completed", "completed", "disabled", "disabled", "disabled"],
    hasRepeat: true,
  },
  {
    id: "4",
    name: "Jerry Hermiston",
    dob: "DOB 04/10/1950",
    medication: "Ramoni",
    statusDots: ["completed", "completed", "completed", "completed", "completed", "completed"],
  },
  {
    id: "5",
    name: "Lisa Rossman",
    dob: "DOB 04/10/1950",
    medication: "Voloxivan",
    statusDots: ["completed", "completed", "completed", "completed", "pending", "disabled"],
  },
  {
    id: "6",
    name: "Sandy Herr",
    dob: "DOB 04/10/1950",
    medication: "Assistivan",
    statusDots: ["completed", "completed", "completed", "completed", "disabled", "disabled"],
    hasRepeat: true,
  },
];

const RENEWALS: RenewalItem[] = [
  { id: "1", patient: "Teri Hatcher", reach: "Reauth: Volixivan", date: "28", month: "APR" },
  { id: "2", patient: "Dennis Johnson", reach: "Reauth: Assistimab", date: "29", month: "APR" },
  { id: "3", patient: "Mitch Gruemmer", reach: "Reauth: Assistimab", date: "02", month: "MAY" },
  { id: "4", patient: "Betty White", reach: "Reauth: Ramoni", date: "10", month: "MAY" },
  { id: "5", patient: "Nancy Blank", reach: "Reauth: Ramoni", date: "12", month: "MAY" },
  { id: "6", patient: "Steve Brown", reach: "Reauth: Ramoni", date: "13", month: "MAY" },
  { id: "7", patient: "Sherrie Park", reach: "Reauth: Ramoni", date: "14", month: "MAY" },
];

interface MedicationDosage {
  concentration: string;
  description: string;
  ndc: string;
}

interface Medication {
  name: string;
  type?: string;
  dosages?: MedicationDosage[];
}

const MEDICATIONS: Medication[] = [
  {
    name: "Assistivan",
    type: "Injection",
    dosages: [
      {
        concentration: "40MG/ML",
        description: "ASSISTIVAN 40MG/ML SUBCUTANEOUS SOLN PREF SRY 1ML",
        ndc: "123456755",
      },
      {
        concentration: "70MG/ML",
        description: "ASSISTIVAN 70MG/ML SUBCUTANEOUS SOLN PREF SRY 1ML",
        ndc: "123456746",
      },
    ],
  },
  { name: "Assistimab" },
  { name: "Assistivox" },
];

function StatusCircle({ state }: { state: DotState }) {
  if (state === "completed") {
    return <circle cx="6" cy="6" r="6" fill="#035257" />;
  }
  if (state === "pending") {
    return <circle cx="6" cy="6" r="6" fill="#9EC4C7" />;
  }
  if (state === "attention") {
    return <circle cx="6" cy="6" r="5" transform="matrix(-1 0 0 1 12 0)" stroke="#D8693A" strokeWidth="2" strokeLinecap="round" fill="none" />;
  }
  if (state === "disabled") {
    return <circle cx="6" cy="6" r="5" transform="matrix(-1 0 0 1 12 0)" stroke="#C4C4C4" strokeWidth="2" strokeLinecap="round" fill="none" />;
  }
  return null;
}

function PatientStatusBar({ dots }: { dots: DotState[] }) {
  const displayDots = dots.slice(0, 6);
  const paddedDots = [...displayDots, ...Array(Math.max(0, 6 - displayDots.length)).fill("disabled")];

  return (
    <div className="flex items-center gap-[12px] px-[7px] py-1 border-2 border-[#E8E8E8] rounded-full bg-white w-fit">
      {paddedDots.map((state, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <StatusCircle state={state} />
        </svg>
      ))}
    </div>
  );
}

function DateBadge({ date, month }: { date: string; month: string }) {
  return (
    <div
      className="w-10 h-10 rounded flex-shrink-0 bg-white overflow-hidden"
      style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.4)" }}
    >
      <div className="h-3 bg-[#007178] flex items-center justify-center rounded-t">
        <span className="text-white font-bold" style={{ fontSize: "8px" }}>
          {month}
        </span>
      </div>
      <div className="h-7 flex items-center justify-center">
        <span className="text-neutral-800 font-semibold text-lg leading-none">{date}</span>
      </div>
    </div>
  );
}

function RepeatIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <path
        d="M2.66667 3.33333H9.33333V5.33333L12 2.66667L9.33333 0V2H1.33333V6H2.66667V3.33333ZM9.33333 10H2.66667V8L0 10.6667L2.66667 13.3333V11.3333H10.6667V7.33333H9.33333V10Z"
        fill="#1D1D1D"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block ml-1 align-middle">
      <path
        d="M9.45 16.8H11.55V14.7H9.45V16.8ZM10.5 0C4.704 0 0 4.704 0 10.5C0 16.296 4.704 21 10.5 21C16.296 21 21 16.296 21 10.5C21 4.704 16.296 0 10.5 0ZM10.5 18.9C5.8695 18.9 2.1 15.1305 2.1 10.5C2.1 5.8695 5.8695 2.1 10.5 2.1C15.1305 2.1 18.9 5.8695 18.9 10.5C18.9 15.1305 15.1305 18.9 10.5 18.9ZM10.5 4.2C8.1795 4.2 6.3 6.0795 6.3 8.4H8.4C8.4 7.245 9.345 6.3 10.5 6.3C11.655 6.3 12.6 7.245 12.6 8.4C12.6 10.5 9.45 10.2375 9.45 13.65H11.55C11.55 11.2875 14.7 11.025 14.7 8.4C14.7 6.0795 12.8205 4.2 10.5 4.2Z"
        fill="#6F7276"
      />
    </svg>
  );
}

export default function Dashboard() {
  const { state } = useDemoState("iAssist");
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [remsTooltipVisible, setRemsTooltipVisible] = useState(false);
  const [expandedMedication, setExpandedMedication] = useState<string | null>(null);
  const searchBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [searchQuery]);

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      {/* Sidebar */}
      <div className="hidden sm:flex w-[354px] bg-[#007178] text-white flex-col flex-shrink-0 py-6 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F85024768bb364ddda8d2365469c3ce76?format=webp&width=800&height=1200"
            alt="iAssist Logo"
            className="h-8 w-auto"
          />
        </div>

        {/* High Five Card */}
        <div className="bg-[#1A7F85] rounded-lg p-5 mb-6 flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg width="86" height="86" viewBox="0 0 86 86" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="43" cy="43" r="43" fill="#007178"/>
              <mask id="hf-mask" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="0" y="0" width="86" height="86">
                <circle cx="43" cy="43" r="43" fill="#4D9CA1"/>
              </mask>
              <g mask="url(#hf-mask)">
                <path d="M90.0301 70.5431C87.5199 104.734 62.3373 107.898 41.9374 106.401C21.5375 104.903 6.28791 86.1486 7.87644 64.5116C9.46496 42.8747 17.0476 48.348 47.602 29.9553C85.6691 7.04021 91.7036 47.749 90.0301 70.5431Z" fill="#4D9CA1"/>
                <path d="M60.39 58.8213C58.1937 61.8765 58.2118 66.3923 59.483 67.6177L45.3574 67.8689C44.7984 67.1403 44.497 65.5091 43.9726 63.1435C43.3574 60.3689 42.1832 58.0057 41.651 56.449C41.9527 53.4611 40.5825 46.5618 40.8412 42.3016C41.1343 37.4737 41.3062 35.2794 41.521 34.3804C42.0265 32.2652 42.3731 27.6779 43.0604 26.0458C43.9773 23.8688 46.0692 23.324 46.4704 25.2738C46.6124 25.9643 46.6161 26.9153 46.5898 27.9251C46.6604 25.7476 47.9384 19.143 49.235 18.3024C51.5376 16.8096 52.3125 19.2283 52.0223 23.6882C52.6021 18.8529 53.5018 14.6683 56.0978 15.4358C57.7742 15.9314 57.2231 20.31 56.686 23.3981C56.6366 23.6824 56.5888 23.9231 56.5435 24.1299C57.0264 22.4446 57.8641 21.0957 58.4624 20.8079C60.8009 19.6832 60.9413 22.6534 60.8842 24.4166C60.8523 25.4024 60.2044 32.3378 60.5257 35.4372C60.9003 39.0516 61.6218 45.3207 61.438 46.499C62.357 45.1077 64.1298 41.7323 65.849 40.9054C68.2924 39.7303 69.6959 39.7062 70.4984 41.0561C70.8522 41.6512 71.0993 42.6953 70.4284 43.26C68.7504 44.8466 68.6806 44.9685 68.2437 45.3956C67.2434 46.3734 67.2963 47.5714 66.0017 49.2946C64.5055 51.2863 63.1354 55.0024 60.39 58.8213Z" fill="#CF9268"/>
                <path d="M25.4711 68.2762C26.2245 67.4267 27.0038 65.3638 27.3654 63.9076C27.8174 62.0874 27.8174 56.7761 26.4613 53.8637C25.1053 50.9514 24.5204 47.9822 22.3932 45.3783C21.3905 44.151 17.9668 38.6397 15.8574 37.1835C16.1588 36.4554 17.3943 35.2177 19.9256 36.0914C22.4569 36.9651 24.9546 41.4952 26.4613 42.466C26.4613 39.5536 25.1075 32.9158 24.7062 31.3105C24.2716 29.572 21.7851 21.4199 23.4023 20.5268C26.0611 19.0585 26.0101 23.8821 26.0101 22.1832C26.0101 20.4844 24.6826 17.2035 26.4613 16.5332C28.7861 15.6571 29.702 18.501 29.95 20.0715C30.2042 19.2214 31.1056 18.4589 32.0949 18.7063C33.3988 19.0323 33.7964 21.8364 34.268 23.4871C35.1373 26.5295 35.6165 24.1968 36.4412 23.9219C37.745 23.4871 38.6143 25.2257 38.6143 25.2257C38.6143 25.2257 40.3357 28.882 41.2221 31.3105C42.2533 34.1359 43.3952 38.6992 43.3952 38.6992C43.3952 38.6992 44.6991 45.5768 44.6991 48.261C44.6991 50.8031 44.6991 55.215 41.6361 62.8526C40.3555 66.0458 40.8222 68.1016 39.9182 69.5578L25.4711 68.2762Z" fill="#F3BFA1"/>
              </g>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl text-white mb-2">High five!</h3>
            <p className="text-sm font-semibold text-white leading-4">
              You've helped five patients start therapy in the last 30 days.
            </p>
          </div>
        </div>

        {/* To-Do List */}
        <div className="bg-[#03656B] rounded-lg flex-1 p-6">
          <h3 className="font-normal text-xl text-white mb-4">To-Do List</h3>
          <div className="border-b border-white/20 pb-3 mb-4">
            <p className="text-sm font-semibold text-white">Today (0)</p>
          </div>
          <p className="text-[#AEE1E3] text-base font-semibold text-center opacity-70">
            This feature is coming soon.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="relative bg-white border-b border-[#E8E8E8] h-14 flex items-center px-4 sm:px-6 gap-4 flex-shrink-0">
          <Search size={24} className="text-[#6F7276] flex-shrink-0" />
          <div className="flex-1 flex flex-col">
            <label htmlFor="search-input" className="sr-only">
              Search for patient or medication
            </label>
            <input
              ref={searchInputRef}
              id="search-input"
              type="text"
              placeholder="Search for patient or medication"
              className="flex-1 bg-transparent outline-none text-base placeholder:text-[#6F7276] focus:ring-2 focus:ring-[#007178] focus:ring-inset rounded px-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (!searchQuery) {
                  if (e.key === "Escape") setSearchOpen(false);
                  return;
                }
                const patientResults = PATIENTS.filter(
                  (p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.medication.toLowerCase().includes(searchQuery.toLowerCase())
                );
                const medResults = MEDICATIONS.filter((m) =>
                  m.name.toLowerCase().includes(searchQuery.toLowerCase())
                );
                const allResults = [
                  ...medResults.map((m) => ({ type: "med" as const, data: m })),
                  ...patientResults.map((p) => ({ type: "patient" as const, data: p })),
                ];
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSearchOpen(true);
                  setSelectedResultIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : prev));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSearchOpen(true);
                  setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (selectedResultIndex >= 0 && selectedResultIndex < allResults.length) {
                    const selected = allResults[selectedResultIndex];
                    setSearchQuery(selected.data.name);
                    setSearchOpen(false);
                    setSelectedResultIndex(-1);
                  }
                } else if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSelectedResultIndex(-1);
                }
              }}
              onBlur={() => {
                if (searchBlurTimeoutRef.current) clearTimeout(searchBlurTimeoutRef.current);
                searchBlurTimeoutRef.current = setTimeout(() => {
                  setSearchOpen(false);
                  setSelectedResultIndex(-1);
                }, 200);
              }}
              aria-label="Search patients and medications"
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? "search-results" : undefined}
              aria-autocomplete="list"
            />
          </div>

          {/* Add New Patient */}
          <button
            onClick={() => navigate("/new-case/patient")}
            className="text-[#007178] font-semibold text-sm sm:text-base flex items-center gap-1 whitespace-nowrap hover:text-[#03656B] focus:outline-none focus:ring-2 focus:ring-[#007178] rounded px-2 py-1"
            aria-label="Add new patient"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add New Patient</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Profile + Notification */}
          <div className="flex items-center gap-2 sm:gap-4 ml-auto border-l border-[#E8E8E8] pl-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#EEF9F9] flex items-center justify-center text-[#007178] font-normal text-base flex-shrink-0">
                SC
              </div>
              <span className="text-base font-normal text-[#1D1D1D]">Sarah Chen, MD</span>
              <ChevronDown size={18} className="text-[#1D1D1D]" />
            </div>
            <button
              className="relative text-[#007178] hover:text-[#03656B] focus:outline-none focus:ring-2 focus:ring-[#007178] rounded p-1"
              aria-label="Notifications"
            >
              <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12.3077 30C14 30 15.3846 28.6154 15.3846 26.9231H9.23077C9.23077 28.6154 10.6 30 12.3077 30ZM21.5385 20.7692V13.0769C21.5385 8.35385 19.0154 4.4 14.6154 3.35385V2.30769C14.6154 1.03077 13.5846 0 12.3077 0C11.0308 0 10 1.03077 10 2.30769V3.35385C5.58462 4.4 3.07692 8.33846 3.07692 13.0769V20.7692L0 23.8462V25.3846H24.6154V23.8462L21.5385 20.7692Z"
                  fill="#007178"
                />
              </svg>
              <span className="absolute top-1 right-1 w-[9px] h-[9px] bg-[#D02B20] rounded-full border border-white" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-[#F8F8F8]">

          {/* Medications */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-normal text-[#1D1D1D]">Medications</h2>
              <button className="flex items-center gap-1 text-[#007178] font-semibold text-base hover:text-[#03656B] focus:outline-none">
                <Plus size={14} />
                <span>Add Medication</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {MEDICATIONS.map((med) => (
                <div
                  key={med.name}
                  className="flex-1 min-w-[240px] bg-white rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 hover:shadow-md transition-shadow"
                  style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}
                >
                  <h3 className="text-xl font-semibold text-[#007178]">{med.name}</h3>
                  <button
                    onClick={() => navigate("/new-case/patient")}
                    className="flex items-center gap-2 bg-[#007178] text-white px-5 py-2 rounded-full font-semibold text-base hover:bg-[#03656B] flex-shrink-0 justify-center w-full sm:w-auto"
                  >
                    Start
                    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 14.5697L1.43026 16L9.43 8L1.43026 0L0 1.4303L6.56949 8L0 14.5697Z" fill="white" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Patients + Upcoming two-column */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">

            {/* Patients Table */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-normal text-[#1D1D1D] mb-4">Patients</h2>
              <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E8E8E8]">
                      <th className="text-left px-6 py-4 font-semibold text-[#6F7276] text-sm">Patient</th>
                      <th className="text-left px-4 py-4 font-semibold text-[#6F7276] text-sm">Medication</th>
                      <th className="text-left px-4 py-4 font-semibold text-[#6F7276] text-sm">
                        Status
                        <HelpIcon />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PATIENTS.map((patient) => (
                      <tr key={patient.id} className="border-b border-[#E8E8E8] last:border-b-0 hover:bg-neutral-50">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-sm text-[#1D1D1D]">{patient.name}</p>
                          <p className="text-xs text-[#999] mt-1 font-semibold">{patient.dob}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-[#1D1D1D]">{patient.medication}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <PatientStatusBar dots={patient.statusDots} />
                            {patient.hasRepeat && <RepeatIcon />}
                            {patient.badge === "remsRenewal" && (
                              <div className="relative">
                                <button
                                  className="px-3 py-1 rounded bg-[#FFEADE] text-[#D8693A] text-xs font-semibold hover:bg-orange-200 focus:outline-none"
                                  onMouseEnter={() => setRemsTooltipVisible(true)}
                                  onMouseLeave={() => setRemsTooltipVisible(false)}
                                  onClick={() => setRemsTooltipVisible((v) => !v)}
                                >
                                  Rems Renewal
                                </button>
                                {remsTooltipVisible && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-60">
                                    <div className="bg-[#4D9CA1] text-white text-xs font-semibold rounded p-3 leading-normal">
                                      REMS is expiring in 30 days. Click here to re-enroll the patient.
                                    </div>
                                    <div className="flex justify-center">
                                      <div
                                        className="w-0 h-0"
                                        style={{
                                          borderLeft: "5px solid transparent",
                                          borderRight: "5px solid transparent",
                                          borderTop: "5px solid #4D9CA1",
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-6 py-4 flex items-center justify-between text-sm text-[#007178]">
                  <button className="font-semibold hover:underline focus:outline-none">View All Patients</button>
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:text-[#03656B] focus:outline-none">
                      <ChevronLeft size={16} className="text-[#C4C4C4]" />
                    </button>
                    <button className="p-1 hover:text-[#03656B] focus:outline-none">
                      <ChevronRight size={16} className="text-[#1D1D1D]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Renewals */}
            <div className="lg:w-[258px] lg:flex-shrink-0">
              <h2 className="text-xl font-normal text-[#1D1D1D] mb-4">Upcoming</h2>
              <div
                className="bg-white rounded-lg overflow-hidden"
                style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}
              >
                <div className="border-b border-[#E8E8E8] px-6 py-4">
                  <p className="text-sm font-semibold text-[#6F7276]">Renewals</p>
                </div>
                <div className="overflow-auto max-h-[520px] divide-y divide-[#E8E8E8]">
                  {RENEWALS.map((renewal) => (
                    <div key={renewal.id} className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50">
                      <DateBadge date={renewal.date} month={renewal.month} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#1D1D1D] leading-tight">{renewal.patient}</p>
                        <p className="text-xs text-[#999] font-semibold mt-1">{renewal.reach}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Button */}
      <button
        className="fixed bottom-6 right-6 w-11 h-11 bg-[#007178] rounded-full flex items-center justify-center shadow-lg hover:bg-[#03656B] focus:outline-none focus:ring-2 focus:ring-[#007178] z-40"
        aria-label="Open chat"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21.9464 10.2874C21.9464 15.9668 17.0341 20.5747 10.9732 20.5747C9.38292 20.5747 7.87411 20.2575 6.51104 19.6874L1.43594 21.8649C1.03302 22.0364 0.570091 21.9378 0.274329 21.6163C-0.0214319 21.2948 -0.0857278 20.8233 0.120019 20.4375L2.21178 16.4855C0.822988 14.7581 0 12.6149 0 10.2874C0 4.60788 4.91221 0 10.9732 0C17.0341 0 21.9464 4.60788 21.9464 10.2874Z"
            fill="white"
          />
          <rect x="4" y="7" width="14" height="1.5" rx="1.5" fill="#007178" />
          <rect x="4" y="10" width="12" height="1.5" rx="1.5" fill="#007178" />
          <rect x="4" y="13" width="9" height="1.5" rx="1.5" fill="#007178" />
        </svg>
      </button>

      {/* Search Overlay */}
      {searchOpen && searchQuery && (
        <div
          id="search-results"
          className="fixed top-14 left-0 right-0 sm:left-[354px] bg-white border border-[#E8E8E8] border-t-0 shadow-lg max-h-96 overflow-auto z-50"
          role="listbox"
          aria-label="Search results"
        >
          <div>
            {(() => {
              const patientResults = PATIENTS.filter(
                (p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.medication.toLowerCase().includes(searchQuery.toLowerCase())
              );
              const medResults = MEDICATIONS.filter((m) =>
                m.name.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (patientResults.length === 0 && medResults.length === 0) {
                return (
                  <div className="p-4 text-center">
                    <p className="text-sm text-[#999]">No results found for "{searchQuery}"</p>
                  </div>
                );
              }

              let resultIndex = 0;

              return (
                <>
                  {medResults.length > 0 && (
                    <div role="group" aria-labelledby="med-group-label">
                      <div id="med-group-label" className="text-xs font-bold text-[#6F7276] px-4 py-3 bg-neutral-50 border-b border-[#E8E8E8] sticky top-0">
                        Medications
                      </div>
                      {medResults.map((med) => {
                        const isSelected = resultIndex === selectedResultIndex;
                        resultIndex++;
                        return (
                          <div
                            key={med.name}
                            role="option"
                            aria-selected={isSelected}
                            className={`px-4 py-3 cursor-pointer border-b border-[#E8E8E8] last:border-b-0 transition-colors ${
                              isSelected ? "bg-[#EEF9F9] ring-2 ring-inset ring-[#007178]" : "hover:bg-neutral-100"
                            }`}
                            onClick={() => {
                              setSearchQuery(med.name);
                              setSearchOpen(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <p className="font-semibold text-sm text-[#1D1D1D]">{med.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {patientResults.length > 0 && (
                    <div role="group" aria-labelledby="patient-group-label">
                      <div id="patient-group-label" className="text-xs font-bold text-[#6F7276] px-4 py-3 bg-neutral-50 border-b border-[#E8E8E8] sticky top-0">
                        Patients
                      </div>
                      {patientResults.map((patient) => {
                        const isSelected = resultIndex === selectedResultIndex;
                        resultIndex++;
                        return (
                          <div
                            key={patient.id}
                            role="option"
                            aria-selected={isSelected}
                            className={`px-4 py-3 cursor-pointer border-b border-[#E8E8E8] last:border-b-0 transition-colors ${
                              isSelected ? "bg-[#EEF9F9] ring-2 ring-inset ring-[#007178]" : "hover:bg-neutral-100"
                            }`}
                            onClick={() => {
                              setSearchQuery(patient.name);
                              setSearchOpen(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <p className="font-semibold text-sm text-[#1D1D1D]">{patient.name}</p>
                            <p className="text-xs text-[#999]">{patient.medication}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
