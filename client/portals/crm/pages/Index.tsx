import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { useDemoStore } from "@/store/demoStore";
import { usePatientStore } from "@/store/patientStore";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { useSelector } from "@xstate/react";
import { getWorkflowActor } from "@/engine/actorSingleton";
import { SAMPLE_COA_CASES } from "@/store/sampleCoaCases";
import { FileText } from "lucide-react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  User,
  X,
  Zap,
  Loader2,
  Settings,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  Search,
  Star,
  Plus,
  Bell,
} from "lucide-react";

const SF_BLUE = "#0070d2";
const FC_BLUE = "#0176d3";
const SF_BORDER = "#dddbda";
const SF_SECTION_BG = "#f3f3f3";

// ─── Shared SF components ────────────────────────────────────────────────────

function SfButton({
  children,
  split,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  split?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`flex items-stretch border border-[#dddbda] rounded ${className}`} style={{ borderRadius: 4 }}>
      <button
        onClick={onClick}
        className="px-3 py-1 text-[13px] text-[#3e3e3c] bg-white hover:bg-[#f3f3f3] transition-colors whitespace-nowrap"
        style={{ borderRadius: split ? "4px 0 0 4px" : 4 }}
      >
        {children}
      </button>
      {split && (
        <button
          className="px-2 py-1 bg-white hover:bg-[#f3f3f3] border-l border-[#dddbda] transition-colors"
          style={{ borderRadius: "0 4px 4px 0" }}
        >
          <ChevronDown size={12} className="text-[#3e3e3c]" />
        </button>
      )}
    </div>
  );
}

function Signature({ name, width = 160 }: { name: string; width?: number }) {
  return (
    <span className="flex flex-col gap-0.5" style={{ display: "inline-flex", flexDirection: "column" }}>
      <span
        style={{
          fontFamily: "Brush Script MT, Segoe Script, cursive",
          fontSize: 22,
          color: "#1a3560",
          letterSpacing: "-0.5px",
          lineHeight: 1.1,
          display: "block",
        }}
      >
        {name}
      </span>
      <span
        style={{
          display: "block",
          width,
          height: 1,
          background: "linear-gradient(to right, #1a3560aa, transparent)",
          marginTop: 2,
        }}
      />
    </span>
  );
}

function SfLink({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <span className={`cursor-pointer hover:underline ${className}`} style={{ color: SF_BLUE }} onClick={onClick}>
      {children}
    </span>
  );
}

function FieldRow({ label, value, isLink, onEdit }: { label: string; value?: React.ReactNode; isLink?: boolean; onEdit?: () => void }) {
  return (
    <div className="group relative flex flex-col px-3 py-2 border-b border-[#dddbda] pr-6 min-h-[44px]">
      <span className="text-[11px] text-[#706e6b] mb-0.5 uppercase tracking-wide font-medium leading-tight">{label}</span>
      {isLink ? (
        <SfLink className="text-[13px]">{value}</SfLink>
      ) : (
        <span className="text-[13px] text-[#3e3e3c]">{value || "\u00a0"}</span>
      )}
      {onEdit && (
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          onClick={onEdit}
        >
          <Pencil size={12} className="text-[#706e6b]" />
        </button>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  collapsed,
  onToggle,
  rightContent,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  rightContent?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 cursor-pointer select-none border-b border-[#dddbda]"
      style={{ background: SF_SECTION_BG, minHeight: 32 }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        {collapsed ? (
          <ChevronRight size={14} className="text-[#706e6b]" />
        ) : (
          <ChevronDown size={14} className="text-[#706e6b]" />
        )}
        <span className="text-[13px] font-semibold text-[#3e3e3c]">{title}</span>
      </div>
      {rightContent}
    </div>
  );
}

// ─── Stage data ──────────────────────────────────────────────────────────────

interface StageField {
  label: string;
  value: string | null;
}

interface Stage {
  id: string;
  name: string;
  statusLabel: string;
  statusDetail: string;
  isComplete: boolean;
  isNotStarted: boolean;
  fields: StageField[];
  lastUpdated: string | null;
  lastUpdatedAgo: string | null;
}

const STAGES_PAP_AUDIT: Stage[] = [
  {
    id: "EA-14272",
    name: "Enrollment Assistance",
    statusLabel: "Complete",
    statusDetail: "Enrollment Completed",
    isComplete: true,
    isNotStarted: false,
    fields: [],
    lastUpdated: "5/15/2026",
    lastUpdatedAgo: "4 days ago",
  },
  {
    id: "BI-14273",
    name: "Benefits Investigation",
    statusLabel: "Complete",
    statusDetail: "No Insurance Found; Free Goods Eligible",
    isComplete: true,
    isNotStarted: false,
    fields: [],
    lastUpdated: "5/19/2026",
    lastUpdatedAgo: "today",
  },
  {
    id: "PAP-14279",
    name: "PAP Enrollment",
    statusLabel: "Stage not started",
    statusDetail: "Pending income verification",
    isComplete: false,
    isNotStarted: true,
    fields: [
      { label: "Program", value: "Free Goods" },
      { label: "Income Status", value: null },
    ],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
  {
    id: "TP-14277",
    name: "Dispatch to Triage",
    statusLabel: "Stage not started",
    statusDetail: "Awaiting PAP enrollment",
    isComplete: false,
    isNotStarted: true,
    fields: [
      { label: "Pharmacy Name", value: "Biologics" },
      { label: "First Dispense Date", value: null },
    ],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
  {
    id: "AUDIT-14280",
    name: "PAP Audit",
    statusLabel: "Stage not started",
    statusDetail: "Scheduled — 90 days post-enrollment",
    isComplete: false,
    isNotStarted: true,
    fields: [
      { label: "Audit Type", value: "ABV Insurance Check" },
      { label: "Scheduled Date", value: null },
    ],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
  {
    id: "PA-14274",
    name: "Prior Authorization",
    statusLabel: "Stage not started",
    statusDetail: "Pending audit result",
    isComplete: false,
    isNotStarted: true,
    fields: [],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
  {
    id: "A-14275",
    name: "Appeals",
    statusLabel: "Stage not started",
    statusDetail: "No Status available",
    isComplete: false,
    isNotStarted: true,
    fields: [
      { label: "Pharmacy Notes", value: null },
      { label: "Shipment Date", value: null },
    ],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
];

const STAGES: Stage[] = [
  {
    id: "EA-14272",
    name: "Enrollment Assistance",
    statusLabel: "Complete",
    statusDetail: "Enrollment Completed",
    isComplete: true,
    isNotStarted: false,
    fields: [
      { label: "Prescriber Notes", value: null },
      { label: "Patient Notes", value: null },
    ],
    lastUpdated: "5/15/2026",
    lastUpdatedAgo: "4 days ago",
  },
  {
    id: "BI-14273",
    name: "Benefits Investigation",
    statusLabel: "Complete",
    statusDetail: "Patient Has Coverage; Prior Authorization Required",
    isComplete: true,
    isNotStarted: false,
    fields: [],
    lastUpdated: "5/19/2026",
    lastUpdatedAgo: "1 days ago",
  },
  {
    id: "PA-14274",
    name: "Prior Authorization",
    statusLabel: "Submitted",
    statusDetail: "Awaiting Approval",
    isComplete: false,
    isNotStarted: false,
    fields: [],
    lastUpdated: "5/19/2026",
    lastUpdatedAgo: "1 days ago",
  },
  {
    id: "A-14275",
    name: "Appeals",
    statusLabel: "Stage not started",
    statusDetail: "No Status available",
    isComplete: false,
    isNotStarted: true,
    fields: [
      { label: "Pharmacy Notes", value: null },
      { label: "Shipment Date", value: null },
    ],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
  {
    id: "FA-14276",
    name: "Financial Assistance",
    statusLabel: "Stage not started",
    statusDetail: "No Status available",
    isComplete: false,
    isNotStarted: true,
    fields: [
      { label: "Financial Program", value: null },
      { label: "Effective Date", value: null },
      { label: "Program Approval Date", value: null },
      { label: "Expiration Date", value: null },
      { label: "Program Denial Reason", value: null },
    ],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
  {
    id: "TP-14277",
    name: "Dispatch to Triage",
    statusLabel: "Stage not started",
    statusDetail: "No Status available",
    isComplete: false,
    isNotStarted: true,
    fields: [
      { label: "Pharmacy Name", value: null },
      { label: "Pharmacy Phone", value: null },
      { label: "Completed By", value: null },
    ],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
  {
    id: "PS-14278",
    name: "Pharmacy Status",
    statusLabel: "Stage not started",
    statusDetail: "No Status available",
    isComplete: false,
    isNotStarted: true,
    fields: [],
    lastUpdated: null,
    lastUpdatedAgo: null,
  },
];

// ─── Stage Card ──────────────────────────────────────────────────────────────

function StageCard({ stage, onHeaderClick }: { stage: Stage; onHeaderClick?: (stage: Stage) => void }) {
  const isRunning = stage.statusLabel === "Running";
  const isInProgress = stage.statusLabel === "In Progress";
  const isSubmitted = stage.statusLabel === "Submitted";
  const iconBg = stage.isNotStarted ? "#9a9a9a" : FC_BLUE;
  const statusColor = stage.isComplete
    ? "#2e844a"
    : stage.isNotStarted
    ? "#706e6b"
    : (isRunning || isInProgress || isSubmitted)
    ? "#0176d3"
    : "#3e3e3c";

  return (
    <div
      className="py-3 border-b border-[#dddbda] last:border-b-0"
      style={(isRunning || isInProgress || isSubmitted) ? { background: "linear-gradient(90deg, #f0f7ff 0%, #fff 100%)" } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 28, height: 28, background: iconBg, borderRadius: 6 }}
        >
          {isRunning
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <Zap size={14} className="text-white" fill="white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-semibold mb-1 cursor-pointer hover:underline"
            style={{ color: SF_BLUE }}
            onClick={() => onHeaderClick?.(stage)}
          >
            {stage.name} - {stage.id}
          </div>
          <div className="text-[12px] mb-1">
            <span className="font-medium text-[#3e3e3c]">What is the Status: </span>
            <span style={{ color: statusColor }}>
              {stage.statusLabel} - {stage.statusDetail}
            </span>
          </div>
          <div className="text-[11px] text-[#706e6b] mt-1">
            Last updated:{" "}
            {stage.lastUpdated
              ? `${stage.lastUpdated} ${stage.lastUpdatedAgo}`
              : "No Data Available"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main CRM Record Page ────────────────────────────────────────────────────

const CASE_TABS = [
  { id: "summary", label: "Case Summary" },
  { id: "documents", label: "Related Documents" },
  { id: "doc-mgmt", label: "Document Management" },
  { id: "tasks", label: "Related Tasks" },
  { id: "file-drop", label: "File Drop" },
  { id: "relations", label: "Case Relations" },
];

const RIGHT_TABS = [
  { id: "quick-answers", label: "Quick Answers" },
  { id: "missing-info", label: "Missing Information" },
];

const FAX_DOCUMENTS = [
  {
    fileId: "FAX-2026-00431",
    fileName: "Enrollment_Form_KDixon_051526.pdf",
    dateReceived: "May 15, 2026",
    type: "Enrollment Form",
    pages: 3,
  },
];

interface PharmacyOption {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const SPECIALTY_PHARMACIES: PharmacyOption[] = [
  { name: "Biologics", address: "456 Specialty Lane", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-1234" },
  { name: "Accredo Health Group Inc.", address: "789 Pharma Ave", city: "Tampa", state: "FL", zip: "33602", phone: "(813) 555-5678" },
  { name: "CVS Specialty", address: "321 Medication Blvd", city: "Jacksonville", state: "FL", zip: "32099", phone: "(904) 555-9012" },
  { name: "Walgreens Specialty", address: "654 Drug St", city: "Miami", state: "FL", zip: "33101", phone: "(305) 555-3456" },
  { name: "AllianceRx Walgreens Prime", address: "987 Medicine Way", city: "Fort Lauderdale", state: "FL", zip: "33301", phone: "(954) 555-7890" },
  { name: "Optum Specialty Pharmacy", address: "111 Health Lane", city: "Clearwater", state: "FL", zip: "33755", phone: "(727) 555-2345" },
  { name: "Shields Health Solutions", address: "222 Care Dr", city: "St. Petersburg", state: "FL", zip: "33701", phone: "(727) 555-6789" },
  { name: "PharMerica Specialty", address: "333 Wellness Ave", city: "Sarasota", state: "FL", zip: "34236", phone: "(941) 555-0123" },
];

// ─── My Cases list (CoA_DTP default screen) ─────────────────────────────────
//
// Mimics a Salesforce Service Console "My Cases" list view. This is what the
// CoA_DTP CRM/HUB shows before Keanu's eRx is submitted — a realistic-looking
// caseload with no active case yet. Once ENROLL fires, his row appears at
// the top; clicking it opens the existing case-detail tab strip (unchanged).
// Gated entirely behind isCoaFlow in Index() below — WF1/WF2/WF4 keep their
// current always-detail-view behavior.

function CaseListView({
  keanuCaseNumber,
  onOpenKeanuCase,
}: {
  keanuCaseNumber: string | null;
  onOpenKeanuCase: () => void;
}) {
  const patientName = usePatientStore((s) => s.patientName);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US");
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const nowStr = `${dateStr} ${timeStr}`;

  const columns = [
    "Case Number",
    "Account Name",
    "Date/Time Opened",
    "Service Type",
    "Case Status",
    "Case Sub-Status",
    "Case Owner Alias",
    "Last Modified Date",
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Salesforce Sans', Arial, sans-serif", fontSize: 13 }}>
      {/* App bar */}
      <div className="flex items-center gap-4 px-3 border-b border-[#dddbda]" style={{ height: 44, background: "#032d60" }}>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 bg-white/10 rounded px-3 py-1 w-full max-w-sm">
            <Search size={13} className="text-white/70" />
            <span className="text-white/70 text-[12px]">Search...</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-white/80">
          <Star size={15} />
          <Plus size={15} />
          <Bell size={15} />
        </div>
      </div>

      {/* Cases tab */}
      <div className="border-b border-[#dddbda] flex items-end px-2" style={{ background: "#f3f2f2", minHeight: 40 }}>
        <div
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#dddbda] border-b-0"
          style={{ borderRadius: "4px 4px 0 0", marginBottom: -1, boxShadow: "0 -1px 3px rgba(0,0,0,0.08)" }}
        >
          <span className="text-[12px] font-semibold text-[#3e3e3c]">Cases</span>
        </div>
      </div>

      <div className="p-4">
        {/* List header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] text-[#706e6b] mb-0.5">Cases</div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold text-[#3e3e3c]">My Cases</h1>
              <ChevronDown size={16} className="text-[#706e6b]" />
              <Pencil size={13} className="text-[#706e6b]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SfButton>Change Owner</SfButton>
            <SfButton>Printable View</SfButton>
          </div>
        </div>

        {/* List toolbar */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[#706e6b]">
            {SAMPLE_COA_CASES.length + (keanuCaseNumber ? 1 : 0)} items • Sorted by Case Number • Updated a few seconds ago
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-[#dddbda] rounded px-2 py-1 w-56">
              <Search size={12} className="text-[#706e6b]" />
              <span className="text-[12px] text-[#706e6b]">Search this list...</span>
            </div>
            <button className="p-1.5 hover:bg-[#f3f3f3] rounded border border-[#dddbda]">
              <Settings size={13} className="text-[#706e6b]" />
            </button>
            <button className="p-1.5 hover:bg-[#f3f3f3] rounded border border-[#dddbda]">
              <RefreshCw size={13} className="text-[#706e6b]" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-[#dddbda] rounded overflow-x-auto">
          <table className="w-full text-[12px]" style={{ minWidth: 900 }}>
            <thead>
              <tr style={{ background: SF_SECTION_BG }}>
                <th className="px-3 py-2 border-b border-[#dddbda] w-8">
                  <input type="checkbox" />
                </th>
                {columns.map((col) => (
                  <th key={col} className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium border-b border-[#dddbda] whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {col}
                      <ArrowUpDown size={10} className="text-[#706e6b]" />
                    </div>
                  </th>
                ))}
                <th className="border-b border-[#dddbda] w-8" />
              </tr>
            </thead>
            <tbody>
              {keanuCaseNumber && (
                <tr
                  onClick={onOpenKeanuCase}
                  className="cursor-pointer hover:bg-teal-50 transition-colors"
                  style={{ background: "#e8f6f6" }}
                >
                  <td className="px-3 py-2 border-b border-[#dddbda]">
                    <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>{keanuCaseNumber}</SfLink></td>
                  <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>{patientName}</SfLink></td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">{nowStr}</td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">Onboarding</td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">Initiated</td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">Initiated</td>
                  <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>rosborne</SfLink></td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">{nowStr}</td>
                  <td className="px-3 py-2 border-b border-[#dddbda]">
                    <ChevronDown size={13} className="text-[#706e6b]" />
                  </td>
                </tr>
              )}
              {SAMPLE_COA_CASES.map((c) => (
                <tr key={c.caseNumber} className="hover:bg-[#f3f3f3] transition-colors">
                  <td className="px-3 py-2 border-b border-[#dddbda]">
                    <input type="checkbox" />
                  </td>
                  <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>{c.caseNumber}</SfLink></td>
                  <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>{c.accountName}</SfLink></td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">{c.dateOpened}</td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">{c.serviceType}</td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">{c.caseStatus}</td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">{c.caseSubStatus}</td>
                  <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>{c.ownerAlias}</SfLink></td>
                  <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">{c.lastModified}</td>
                  <td className="px-3 py-2 border-b border-[#dddbda]">
                    <ChevronDown size={13} className="text-[#706e6b]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('crm');
  const dispatch = useWorkflowDispatch();

  const actor = getWorkflowActor();
  const enrollmentStatus = useSelector(
    actor,
    (snapshot) => snapshot.context.workflowData.enrollmentStatus
  );

  // WF3's default screen — a "My Cases" list (mirrors a real Salesforce
  // Service Console) rather than jumping straight into a case-detail view.
  // Keanu's case appears in that list once his eRx is submitted, but the
  // operator still has to click it to open the detail tabs below.
  const [hubView, setHubView] = useState<"list" | "detail">(() =>
    useDemoStore.getState().flowType === "CoA_DTP" ? "list" : "detail"
  );

  useEffect(() => {
    if (enrollmentStatus === 'none') {
      navigate('/');
      if (useDemoStore.getState().flowType === "CoA_DTP") {
        setHubView("list");
      }
    }
  }, [enrollmentStatus, navigate]);

  // Once the patient confirms consent there's real work to look at — jump
  // straight into Keanu's case detail instead of leaving the operator on
  // the case list. Guarded by a ref so it only fires on that transition,
  // not every time hubView happens to be "list" while consent is confirmed
  // (otherwise clicking "Back to Cases" afterward would just get overridden).
  const autoOpenedOnConsentRef = useRef(false);
  useEffect(() => {
    if (workflowData.flowType !== "CoA_DTP") return;
    if (workflowData.consentStatus === "confirmed") {
      if (!autoOpenedOnConsentRef.current) {
        autoOpenedOnConsentRef.current = true;
        setHubView("detail");
      }
    } else {
      autoOpenedOnConsentRef.current = false;
    }
  }, [workflowData.flowType, workflowData.consentStatus]);

  const patientName = usePatientStore((s) => s.patientName);
  const drugName = usePatientStore((s) => s.drugName);
  const phone = usePatientStore((s) => s.phone);
  const payer = usePatientStore((s) => s.payer);
  const caseNumber = usePatientStore((s) => s.caseNumber);
  const deliveryAddress = usePatientStore((s) => s.deliveryAddress);

  const flowType = workflowData.flowType;
  const consentStatus = workflowData.consentStatus;
  const biStatus = workflowData.biStatus;
  const paStatus = workflowData.paStatus;
  const paApprovedAt = workflowData.paApprovedAt;
  const papStatus = workflowData.papStatus;
  const dispatchStatus = workflowData.dispatchStatus;
  const pharmacyStatus = workflowData.pharmacyStatus;
  const selectedPharmacy = workflowData.selectedPharmacy;
  const cashOfferStatus = workflowData.cashOfferStatus;
  const paymentVerified = workflowData.paymentVerified;
  const patientShipDate = workflowData.patientShipDate;
  const pricingOption = workflowData.pricingOption;

  const isFaxFlow = flowType === "Fax_QS_PA_Approved" || flowType === "Fax_PAP_Audit";
  const enrollmentFormTabOpen = useDemoStore((s) => s.enrollmentFormTabOpen);
  const closeEnrollmentFormTab = useDemoStore((s) => s.closeEnrollmentFormTab);
  const openEnrollmentFormTab = useDemoStore((s) => s.openEnrollmentFormTab);
  const isPapFlow = flowType === "Fax_PAP_Audit";
  const isCoaFlow = flowType === "CoA_DTP";
  // CoA_DTP auto-assigns a pharmacy the moment pricing is chosen (see
  // coaDtp.ts) — well before dispatchStatus itself flips to "selected"
  // (that only happens once the patient confirms their delivery address).
  // WF1 has no such head start: dispatchStatus === "selected" only once HUB
  // staff manually pick a pharmacy via the Choose Pharmacy modal. So CoA can
  // dispatch to pharmacy as soon as one is known; WF1 still needs the
  // explicit "selected" status.
  const canDispatchToPharmacy = !!selectedPharmacy && pharmacyStatus === "none" && dispatchStatus !== "dispatched" &&
    (isCoaFlow || dispatchStatus === "selected");
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [productDetailModalOpen, setProductDetailModalOpen] = useState(false);
  const [selectedPharmacyType, setSelectedPharmacyType] = useState<"preferred" | "payer" | "program" | "dispenser" | null>(null);
  const [preferredPharmacy, setPreferredPharmacy] = useState<PharmacyOption | null>(null);
  const [payerPharmacy, setPayerPharmacy] = useState<PharmacyOption | null>(null);
  const [programPharmacy, setProgramPharmacy] = useState<PharmacyOption | null>(null);
  const [dispenserPharmacy, setDispenserPharmacy] = useState<PharmacyOption | null>(null);
  const [activeCaseTab, setActiveCaseTab] = useState("summary");
  const [activeRightTab, setActiveRightTab] = useState("quick-answers");
  const [caseSummaryCollapsed, setCaseSummaryCollapsed] = useState(false);
  const [stagesCollapsed, setStagesCollapsed] = useState(false);
  const [openStageTabs, setOpenStageTabs] = useState<Stage[]>([]);
  const [openBipcTabs, setOpenBipcTabs] = useState<string[]>([]);
  const [bipcParentTabs, setBipcParentTabs] = useState<Record<string, string>>({});
  const [activeTopTab, setActiveTopTab] = useState<string>("keanu");
  const [activePatientSubTab, setActivePatientSubTab] = useState<"onboarding" | "enrollment-form">(
    () => enrollmentFormTabOpen ? "enrollment-form" : "onboarding"
  );
  const openSubTabs: Array<"onboarding" | "enrollment-form"> = ["onboarding", ...(enrollmentFormTabOpen ? ["enrollment-form" as const] : [])];

  const biCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const biCompletionScheduledRef = useRef(false);
  const paCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paCompletionScheduledRef = useRef(false);

  const scrollToTop = () => {
    const scrollable = document.querySelector(".overflow-y-auto");
    if (scrollable) {
      scrollable.scrollTop = 0;
    }
  };


  const handleOpenBipcTab = (bipcId: string) => {
    if (!openBipcTabs.includes(bipcId)) {
      setBipcParentTabs((prev) => ({ ...prev, [bipcId]: activeTopTab }));
      setOpenBipcTabs([...openBipcTabs, bipcId]);
    }
    setActiveTopTab(bipcId);
    scrollToTop();
  };

  const handleCloseBipcTab = (bipcId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const parentTab = bipcParentTabs[bipcId];
    setOpenBipcTabs((prev) => prev.filter((id) => id !== bipcId));
    setBipcParentTabs((prev) => {
      const newMap = { ...prev };
      delete newMap[bipcId];
      return newMap;
    });
    if (activeTopTab === bipcId && parentTab) {
      setActiveTopTab(parentTab);
    }
  };

  useEffect(() => {
    if (!enrollmentFormTabOpen && activePatientSubTab === "enrollment-form") {
      setActivePatientSubTab("onboarding");
    }
  }, [enrollmentFormTabOpen]);

  useEffect(() => {
    if (isPapFlow) return;
    if (consentStatus !== "confirmed") return;
    if (biStatus !== "none") return;
    dispatch('RUN_BI', { portal: 'crm' });
  }, [consentStatus, biStatus, isPapFlow, dispatch]);

  // Auto-complete BI when agent opens the BI stage tab
  useEffect(() => {
    if (activeTopTab !== 'BI-14273') return;
    if (biStatus !== 'running') return;

    const timer = setTimeout(() => {
      dispatch('COMPLETE_BI', { portal: 'crm', result: isPapFlow ? 'no_insurance' : 'coverage_found' });
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeTopTab, biStatus, dispatch, isPapFlow]);

  // COA BI auto-complete: RUN_BI → COMPLETE_BI. PA submission is no longer
  // automatic here — BI completing surfaces "PA Required" on the provider's
  // CoaDashboard, and the provider manually starts PA from there (mirrors
  // WF1's questions flow, minus the email/login hop).
  useEffect(() => {
    if (!isCoaFlow) return;
    if (activeTopTab !== 'BI-14273') return;

    if (biStatus === 'none' || biStatus === 'running') {
      const runTimer = biStatus === 'none' ? setTimeout(() => {
        dispatch('RUN_BI', { portal: 'crm' });
      }, 1000) : null;

      const completeTimer = biStatus === 'running' ? setTimeout(() => {
        dispatch('COMPLETE_BI', { portal: 'crm' });
      }, 3000) : null;

      return () => {
        if (runTimer) clearTimeout(runTimer);
        if (completeTimer) clearTimeout(completeTimer);
      };
    }
  }, [activeTopTab, biStatus, isCoaFlow, dispatch]);

  // Auto-approve PA when agent opens the PA stage tab
  useEffect(() => {
    if (activeTopTab !== 'PA-14274') return;
    if (paStatus !== 'submitted') return;

    const timer = setTimeout(() => {
      dispatch('APPROVE_PA', { portal: 'crm' });
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeTopTab, paStatus, dispatch]);

  // CoA_DTP's PA always approves (CoAssist is an insurance-covered flow, not
  // a denial → cash-pay one) — the generic auto-approve effect above already
  // covers this since it isn't gated to a specific flowType.

  // Visual-only: show "Transferring to pharmacy..." for 3 seconds
  // after dispatch, then show "Dispatched" badge.
  // Does not update any store state.
  useEffect(() => {
    if (dispatchStatus !== 'dispatched') {
      setTriageDispatched(false);
      return;
    }
    const timer = setTimeout(() => {
      setTriageDispatched(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [dispatchStatus]);

  const paStage: Stage =
    paStatus === "none" && biStatus === "complete" && !isPapFlow
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Letter sent", statusDetail: "HCP letter mailed for Prior Authorization", isComplete: false, isNotStarted: false, fields: [], lastUpdated: new Date().toLocaleDateString(), lastUpdatedAgo: "just now" }
      : paStatus === "none"
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
      : paStatus === "submitted"
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Submitted", statusDetail: "Awaiting Approval", isComplete: false, isNotStarted: false, fields: [], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
      : paStatus === "approved"
      ? { id: "PA-14274", name: "Prior Authorization", statusLabel: "Complete", statusDetail: "PA Approved", isComplete: true, isNotStarted: false, fields: [], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
      : { id: "PA-14274", name: "Prior Authorization", statusLabel: "Denied", statusDetail: "PA Denied — Appeal initiated", isComplete: false, isNotStarted: false, fields: [], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" };

  const eaStage: Stage = consentStatus !== "confirmed"
    ? { id: "EA-14272", name: "Enrollment Assistance", statusLabel: "Pending", statusDetail: "Awaiting patient consent", isComplete: false, isNotStarted: false, fields: [], lastUpdated: "5/15/2026", lastUpdatedAgo: "4 days ago" }
    : { id: "EA-14272", name: "Enrollment Assistance", statusLabel: "Complete", statusDetail: "Enrollment Completed", isComplete: true, isNotStarted: false, fields: [], lastUpdated: "5/15/2026", lastUpdatedAgo: "4 days ago" };

  const biCompleteDetail = isPapFlow
    ? "No Insurance Found; Free Goods Assessment Initiated"
    : "Patient Has Coverage; Prior Authorization Required";

  const biStage: Stage = biStatus === "none"
    ? { id: "BI-14273", name: "Benefits Investigation", statusLabel: "Not Started", statusDetail: "Waiting for patient consent", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : biStatus === "running"
    ? { id: "BI-14273", name: "Benefits Investigation", statusLabel: "Running", statusDetail: "Investigating patient benefits...", isComplete: false, isNotStarted: false, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : { id: "BI-14273", name: "Benefits Investigation", statusLabel: "Complete", statusDetail: biCompleteDetail, isComplete: true, isNotStarted: false, fields: [], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" };

  const papStage: Stage = papStatus === "none"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Pending", statusDetail: "Awaiting income verification", isComplete: false, isNotStarted: true, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: null }], lastUpdated: null, lastUpdatedAgo: null }
    : papStatus === "active"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Complete", statusDetail: "Patient enrolled — Free Goods approved", isComplete: true, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: "Verified" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : papStatus === "audit_pending"
    ? { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Audit Pending", statusDetail: "Insurance audit initiated", isComplete: false, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }, { label: "Income Status", value: "Verified" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : { id: "PAP-14279", name: "PAP Enrollment", statusLabel: "Discontinued", statusDetail: "Patient has insurance — PAP discontinued", isComplete: false, isNotStarted: false, fields: [{ label: "Program", value: "Free Goods" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" };

  const tpStage: Stage =
    dispatchStatus === "pending_selection" || dispatchStatus === "none"
    ? { id: "TP-14277", name: "Dispatch to Triage", statusLabel: "Pending", statusDetail: "Awaiting pharmacy selection", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null }
    : dispatchStatus === "selected"
    ? { id: "TP-14277", name: "Dispatch to Triage", statusLabel: "In Progress", statusDetail: "Pharmacy selected — awaiting dispatch", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "Status", value: "Pharmacy Selected" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : pharmacyStatus === "processing"
    ? { id: "TP-14277", name: "Dispatch to Triage", statusLabel: "In Progress", statusDetail: "First dispense processing", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "First Dispense", value: "Initiated" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : pharmacyStatus === "ready"
    ? { id: "TP-14277", name: "Dispatch to Triage", statusLabel: "In Progress", statusDetail: "Ready for delivery", isComplete: false, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "First Dispense", value: "Ready" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : { id: "TP-14277", name: "Dispatch to Triage", statusLabel: "Complete", statusDetail: "First dispense shipped", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy", value: selectedPharmacy?.name || null }, { label: "First Dispense", value: "Shipped" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" };

  const psStage: Stage = pharmacyStatus === "shipped"
    ? { id: "PS-14278", name: "Pharmacy Status", statusLabel: "In Transit", statusDetail: "First dispense shipped — in transit to patient", isComplete: false, isNotStarted: false, fields: [{ label: "Carrier", value: "FedEx" }, { label: "Tracking #", value: "775899987245" }, { label: "Est. Delivery", value: "May 26, 2026" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : pharmacyStatus === "delivered"
    ? { id: "PS-14278", name: "Pharmacy Status", statusLabel: "Complete", statusDetail: "First dispense delivered", isComplete: true, isNotStarted: false, fields: [{ label: "Carrier", value: "FedEx" }, { label: "Tracking #", value: "775899987245" }, { label: "Delivered", value: "May 26, 2026" }], lastUpdated: "5/26/2026", lastUpdatedAgo: "today" }
    : { id: "PS-14278", name: "Pharmacy Status", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null };

  const auditStage: Stage = papStatus !== "audit_pending" && paStatus === "none"
    ? { id: "AUDIT-14280", name: "PAP Audit", statusLabel: "Scheduled", statusDetail: "ABV audit — 90 days post-enrollment", isComplete: false, isNotStarted: true, fields: [{ label: "Audit Type", value: "ABV Insurance Check" }], lastUpdated: null, lastUpdatedAgo: null }
    : papStatus === "audit_pending"
    ? { id: "AUDIT-14280", name: "PAP Audit", statusLabel: "In Progress", statusDetail: "Conducting ABV audit — insurance found", isComplete: false, isNotStarted: false, fields: [{ label: "Audit Type", value: "ABV Insurance Check" }, { label: "Result", value: "Insurance Identified" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : { id: "AUDIT-14280", name: "PAP Audit", statusLabel: "Complete", statusDetail: "Insurance found — PA required", isComplete: true, isNotStarted: false, fields: [{ label: "Audit Type", value: "ABV Insurance Check" }, { label: "Result", value: "Insurance Identified" }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" };

  const appealStage: Stage = paStatus === "approved"
    ? { id: "A-14275", name: "Appeals", statusLabel: "Not needed", statusDetail: "PA Approved", isComplete: true, isNotStarted: false, fields: [{ label: "Pharmacy Notes", value: null }, { label: "Shipment Date", value: null }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : { id: "A-14275", name: "Appeals", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [{ label: "Pharmacy Notes", value: null }, { label: "Shipment Date", value: null }], lastUpdated: null, lastUpdatedAgo: null };

  const faStage: Stage = biStatus === "complete" && !isPapFlow && paStatus === "approved"
    ? { id: "FA-14276", name: "Financial Assistance", statusLabel: "Not needed", statusDetail: "Commercial Insurance", isComplete: true, isNotStarted: false, fields: [{ label: "Financial Program", value: null }, { label: "Effective Date", value: null }, { label: "Program Approval Date", value: null }, { label: "Expiration Date", value: null }, { label: "Program Denial Reason", value: null }], lastUpdated: "5/19/2026", lastUpdatedAgo: "today" }
    : { id: "FA-14276", name: "Financial Assistance", statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [{ label: "Financial Program", value: null }, { label: "Effective Date", value: null }, { label: "Program Approval Date", value: null }, { label: "Expiration Date", value: null }, { label: "Program Denial Reason", value: null }], lastUpdated: null, lastUpdatedAgo: null };

  const STAGES_LIVE: Stage[] = isCoaFlow
    ? [
        {
          id: "BI-14273",
          name: "Benefits Investigation",
          statusLabel: biStatus === "none" ? "Not Started" : biStatus === "running" ? "Running" : "Complete",
          statusDetail: biStatus === "none" ? "Awaiting case creation" : biStatus === "running" ? "Investigating patient benefits..." : "Complete",
          isComplete: biStatus === "complete",
          isNotStarted: biStatus === "none",
          fields: [],
          lastUpdated: biStatus === "complete" ? new Date().toLocaleDateString() : null,
          lastUpdatedAgo: biStatus === "complete" ? "today" : null,
        },
        {
          id: "PA-14274",
          name: "Prior Authorization",
          statusLabel: paStatus === 'none' ? "Stage not started"
            : paStatus === 'submitted' ? "Submitted"
            : paStatus === 'approved' ? "Approved"
            : "Denied",
          statusDetail: paStatus === 'none' ? "Awaiting BI completion"
            : paStatus === 'submitted' ? "Awaiting payer decision"
            : paStatus === 'approved' ? "PA Approved — pricing options sent to patient"
            : "PA Denied — Patient eligible for cash offer",
          isComplete: paStatus === 'denied' || paStatus === 'approved',
          isNotStarted: paStatus === 'none',
          fields: [
            { label: "PA Status", value: paStatus === 'none' ? null : paStatus === 'submitted' ? "Submitted" : paStatus === 'approved' ? "Approved" : "Denied" },
          ],
          lastUpdated: paStatus !== 'none' ? new Date().toLocaleDateString() : null,
          lastUpdatedAgo: paStatus !== 'none' ? "today" : null,
        },
        {
          id: "CO-14281",
          name: "Cash Offer",
          // "Not Applicable" only holds while PA is approved AND the patient
          // hasn't touched the self-pay/assistance-program option (Retail or
          // Mail Order chosen instead, or still deciding on Benefit Pricing).
          // Once cashOfferStatus moves off "none" — patient selected the
          // CoAssist Self-Pay option on Copay Enroll — this reflects the real
          // cash-offer/payment progress instead, same as the PA-denied path.
          statusLabel: paStatus === 'approved' && cashOfferStatus === "none" ? "Not Applicable"
            : cashOfferStatus === "none" ? "Stage not started" : cashOfferStatus === "sent" ? "Offer Sent" : "Paid",
          statusDetail: paStatus === 'approved' && cashOfferStatus === "none" ? "Not applicable — Retail or Mail Order selected"
            : cashOfferStatus === "none" ? "Awaiting PA denial" : cashOfferStatus === "sent" ? "Payment link sent to patient" : paymentVerified ? "Payment verified — Complete" : "Payment received — pending verification",
          isComplete: paymentVerified,
          isNotStarted: paStatus === 'approved' && cashOfferStatus === "none" ? true : cashOfferStatus === "none",
          fields: [
            { label: "Offer Status", value: cashOfferStatus === "none" ? null : cashOfferStatus === "sent" ? "Sent" : "Paid" },
            { label: "Payment Verified", value: paymentVerified ? "Yes" : "No" },
            { label: "Ship Date", value: patientShipDate ? new Date(patientShipDate).toLocaleDateString() : null },
          ],
          lastUpdated: cashOfferStatus !== "none" ? new Date().toLocaleDateString() : null,
          lastUpdatedAgo: cashOfferStatus !== "none" ? "today" : null,
        },
        // Dispatch to Triage / Pharmacy Status — reused verbatim from WF1
        // (tpStage/psStage, computed above) instead of a bespoke CoA-only
        // "Dispense" stage, so HUB staff see the exact same dispensing UI
        // regardless of flow.
        tpStage,
        psStage,
      ]
    : isPapFlow
    ? STAGES_PAP_AUDIT.map((s) =>
        s.id === "EA-14272" ? eaStage
        : s.id === "BI-14273" ? biStage
        : s.id === "PAP-14279" ? papStage
        : s.id === "TP-14277" ? tpStage
        : s.id === "AUDIT-14280" ? auditStage
        : s.id === "PA-14274" ? paStage
        : s.id === "A-14275" ? appealStage
        : s.id === "FA-14276" ? faStage
        : s
      )
    : STAGES.map((s) =>
        s.id === "EA-14272" ? eaStage
        : s.id === "BI-14273" ? biStage
        : s.id === "PA-14274" ? paStage
        : s.id === "TP-14277" ? tpStage
        : s.id === "PS-14278" ? psStage
        : s.id === "A-14275" ? appealStage
        : s.id === "FA-14276" ? faStage
        : s
      );

  const [patientAccountCollapsed, setPatientAccountCollapsed] = useState(false);
  const [patientContactCollapsed, setPatientContactCollapsed] = useState(false);
  const [triageDispatched, setTriageDispatched] = useState(false);

  // Schedule BI auto-completion 3 seconds after opening the tab

  const handleOpenStage = (stage: Stage) => {
    setOpenStageTabs((prev) =>
      prev.some((s) => s.id === stage.id) ? prev : [...prev, stage]
    );
    setActiveTopTab(stage.id);
    scrollToTop();
  };

  const handleCloseStageTab = (stageId: string, e: React.MouseEvent) => {
    // Closing BI tab while timer is pending should cancel it
    if (stageId === "BI-14273" && biCompletionTimerRef.current !== null) {
      clearTimeout(biCompletionTimerRef.current);
      biCompletionTimerRef.current = null;
      biCompletionScheduledRef.current = false;
    }
    // Closing PA tab while timer is pending should cancel it
    if (stageId === "PA-14274" && paCompletionTimerRef.current !== null) {
      clearTimeout(paCompletionTimerRef.current);
      paCompletionTimerRef.current = null;
      paCompletionScheduledRef.current = false;
    }
    e.stopPropagation();
    setOpenStageTabs((prev) => prev.filter((s) => s.id !== stageId));
    if (activeTopTab === stageId) setActiveTopTab("keanu");
  };

  const activeStage = STAGES_LIVE.find((s) => s.id === activeTopTab);

  if (isCoaFlow && hubView === "list") {
    return (
      <CaseListView
        keanuCaseNumber={enrollmentStatus !== "none" ? caseNumber : null}
        onOpenKeanuCase={() => setHubView("detail")}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Salesforce Sans', Arial, sans-serif", fontSize: 13 }}
    >
      {isCoaFlow && (
        <div className="px-3 py-1.5 border-b border-[#dddbda] bg-[#f3f3f3]">
          <SfLink onClick={() => setHubView("list")}>← Back to Cases</SfLink>
        </div>
      )}
      {/* ── Row 1: Patient Tab Strip ─────────────────────────────────────────── */}
      <div
        className="border-b border-[#dddbda] flex items-end px-2 overflow-x-auto gap-1 overflow-y-hidden"
        style={{ background: "#f3f2f2", minHeight: 42 }}
      >
        {/* Keanu Dixon tab */}
        <div
          className="flex items-center gap-2 px-3 py-2 border border-[#dddbda] cursor-pointer select-none shrink-0 transition-colors"
          style={{
            borderRadius: "4px 4px 0 0",
            marginBottom: -1,
            background: activeTopTab === "keanu" ? "#fff" : "#ebe9e9",
            borderBottomColor: activeTopTab === "keanu" ? "#fff" : "#dddbda",
            boxShadow: activeTopTab === "keanu" ? "0 -1px 3px rgba(0,0,0,0.08)" : "none",
          }}
          onClick={() => {
            setActiveTopTab("keanu");
            scrollToTop();
          }}
        >
          <div
            className="flex items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
            style={{ width: 20, height: 20, background: "linear-gradient(135deg, #2dbcbb 0%, #16818a 100%)" }}
          >
            KD
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[12px] font-semibold text-[#3e3e3c] whitespace-nowrap">Keanu Dixon</span>
            <span className="text-[10px] text-[#706e6b]">DOB: 09/19/1981</span>
          </div>
          <button className="ml-1 p-0.5 rounded hover:bg-[#e5e5e5] transition-colors">
            <X size={11} className="text-[#706e6b]" />
          </button>
        </div>

        {/* Dynamic stage tabs */}
        {openStageTabs.map((stage) => {
          const isActive = activeTopTab === stage.id;
          const stageIconBg = stage.isNotStarted ? "#9a9a9a" : FC_BLUE;
          return (
            <div
              key={stage.id}
              className="flex items-center gap-2 px-3 py-2 border border-[#dddbda] cursor-pointer select-none shrink-0 transition-colors"
              style={{
                borderRadius: "4px 4px 0 0",
                marginBottom: -1,
                background: isActive ? "#fff" : "#ebe9e9",
                borderBottomColor: isActive ? "#fff" : "#dddbda",
                boxShadow: isActive ? "0 -1px 3px rgba(0,0,0,0.08)" : "none",
              }}
              onClick={() => {
                setActiveTopTab(stage.id);
                scrollToTop();
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 18, height: 18, background: stageIconBg, borderRadius: 4 }}
              >
                <Zap size={10} className="text-white" fill="white" />
              </div>
              <span className="text-[12px] font-semibold text-[#3e3e3c] whitespace-nowrap max-w-[160px] truncate">
                {stage.name} - {stage.id}
              </span>
              <button
                className="ml-1 p-0.5 rounded hover:bg-[#e5e5e5] transition-colors"
                onClick={(e) => handleCloseStageTab(stage.id, e)}
              >
                <X size={11} className="text-[#706e6b]" />
              </button>
            </div>
          );
        })}

        {/* Dynamic BIPC tabs */}
        {openBipcTabs.map((bipcId) => {
          const isActive = activeTopTab === bipcId;
          return (
            <div
              key={bipcId}
              className="flex items-center gap-2 px-3 py-2 border border-[#dddbda] cursor-pointer select-none shrink-0 transition-colors"
              style={{
                borderRadius: "4px 4px 0 0",
                marginBottom: -1,
                background: isActive ? "#fff" : "#ebe9e9",
                borderBottomColor: isActive ? "#fff" : "#dddbda",
                boxShadow: isActive ? "0 -1px 3px rgba(0,0,0,0.08)" : "none",
              }}
              onClick={() => {
                setActiveTopTab(bipcId);
                scrollToTop();
              }}
            >
              <span className="text-[12px] font-semibold text-[#3e3e3c] whitespace-nowrap">
                {bipcId}
              </span>
              <button
                className="ml-1 p-0.5 rounded hover:bg-[#e5e5e5] transition-colors"
                onClick={(e) => handleCloseBipcTab(bipcId, e)}
              >
                <X size={11} className="text-[#706e6b]" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Content area (conditional on active Row 1 tab) ──────────────────── */}
      {activeTopTab === "keanu" ? (
        /* ── Patient view with sub-tabs */
        <>
          {/* Sub-tab strip: Onboarding | FAX-2026-00431 */}
          <div className="border-b border-[#dddbda] flex items-end px-2 gap-0 bg-white">
            {openSubTabs.includes("onboarding") && (
              <button
                onClick={() => setActivePatientSubTab("onboarding")}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] whitespace-nowrap relative shrink-0 transition-colors ${
                  activePatientSubTab === "onboarding" ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
                }`}
                style={{ color: activePatientSubTab === "onboarding" ? SF_BLUE : undefined }}
              >
                <div
                  className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                  style={{ width: 16, height: 16, background: "linear-gradient(135deg, #0176d3 0%, #014486 100%)", borderRadius: 3 }}
                >C</div>
                Onboarding
                <span
                  role="button"
                  className="ml-1 flex items-center justify-center rounded hover:bg-[#e5e5e5] transition-colors"
                  style={{ width: 16, height: 16 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activePatientSubTab === "onboarding") setActivePatientSubTab("enrollment-form");
                  }}
                >
                  <X size={10} className="text-[#706e6b]" />
                </span>
                {activePatientSubTab === "onboarding" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: SF_BLUE }} />
                )}
              </button>
            )}
            {openSubTabs.includes("enrollment-form") && (
              <button
                onClick={() => setActivePatientSubTab("enrollment-form")}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] whitespace-nowrap relative shrink-0 transition-colors ${
                  activePatientSubTab === "enrollment-form" ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
                }`}
                style={{ color: activePatientSubTab === "enrollment-form" ? SF_BLUE : undefined }}
              >
                <div
                  className="flex items-center justify-center rounded shrink-0"
                  style={{ width: 16, height: 16, background: "#6b5ecd", borderRadius: 3 }}
                >
                  <FileText size={9} className="text-white" />
                </div>
                <span className="flex flex-col leading-none text-left gap-0">
                  <span>FAX-2026-00431</span>
                  <span className="text-[10px] text-[#706e6b] font-normal">Enrollment Form</span>
                </span>
                <span
                  role="button"
                  className="ml-1 flex items-center justify-center rounded hover:bg-[#e5e5e5] transition-colors"
                  style={{ width: 16, height: 16 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeEnrollmentFormTab();
                    if (activePatientSubTab === "enrollment-form") setActivePatientSubTab("onboarding");
                  }}
                >
                  <X size={10} className="text-[#706e6b]" />
                </span>
                {activePatientSubTab === "enrollment-form" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: SF_BLUE }} />
                )}
              </button>
            )}
          </div>

          {/* Sub-tab content */}
          {activePatientSubTab === "enrollment-form" ? (
        /* ── Enrollment Form View ──────────────────────────────────────────── */
        <div className="bg-white">
          {/* Doc header */}
          <div className="border-b border-[#dddbda] px-6 py-3 flex items-center justify-between" style={{ background: "#f9f9f9" }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded" style={{ width: 36, height: 36, background: "#6b5ecd" }}>
                <FileText size={18} className="text-white" />
              </div>
              <div>
                <div className="text-[11px] text-[#706e6b]">Related Document</div>
                <div className="text-[16px] font-bold text-[#3e3e3c]">FAX-2026-00431</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-[#706e6b]">
              <span>Enrollment_Form_KDixon_051526.pdf</span>
              <span>·</span>
              <span>5 pages</span>
              <span>·</span>
              <span>Received May 15, 2026</span>
              <span>·</span>
              <span>Fax: 866-725-7218</span>
            </div>
          </div>

          {/* Side-by-side body: parsed data left, PDF right */}
          <div className="flex overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>

            {/* Left panel — extracted form data */}
            <div className="overflow-y-auto p-5 space-y-4 border-r border-[#dddbda]" style={{ width: "45%", minWidth: 320, background: "#fafafa" }}>

              {/* Section 1 — Patient Authorization */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "#6b5ecd" }}>1</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Patient Authorization</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: "#e8f4ef", color: "#2e844a" }}>Signed</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Patient Signature" value="Keanu Dixon" />
                  <FieldRow label="Relationship to Patient" value="Self" />
                  <FieldRow label="Date Signed" value="05/20/2026" />
                </div>
              </div>

              {/* Section 2 — Patient Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "#6b5ecd" }}>2</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Patient Information</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="First Name" value="Keanu" />
                  <FieldRow label="Last Name" value="Dixon" />
                  <FieldRow label="Date of Birth" value="09/19/1981" />
                  <FieldRow label="Sex" value="M" />
                  <FieldRow label="Mobile Phone" value="(555) 867-5309" />
                  <FieldRow label="Preferred Contact" value="Mobile" />
                  <FieldRow label="Shipping Address" value="742 Lakewood Drive" />
                  <FieldRow label="City, State, ZIP" value="Orlando, FL 32801" />
                  <FieldRow label="Email" value="keanu.dixon@gmail.com" isLink />
                  <FieldRow label="OK to Leave Voicemail" value="Yes" />
                  <FieldRow label="Best Time" value="Morning" />
                  <FieldRow label="Preferred Language" value="English" />
                </div>
                <div className="px-4 pb-2">
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-1">Alternate Contact</div>
                  <div className="grid grid-cols-2 gap-x-4">
                    <FieldRow label="Name" value="Maria Dixon" />
                    <FieldRow label="Relationship" value="Spouse" />
                    <FieldRow label="Phone" value="(555) 867-5310" />
                    <FieldRow label="Email" value="maria.dixon@gmail.com" isLink />
                    <FieldRow label="OK to Discuss" value="Yes" />
                  </div>
                </div>
              </div>

              {/* Section 3 — Insurance Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "#6b5ecd" }}>3</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Insurance Information</span>
                </div>
                <div className="px-4 pb-2">
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-1">Prescription Drug Insurance</div>
                  <div className="grid grid-cols-2 gap-x-4">
                    <FieldRow label="Payer" value="BlueCross BlueShield of Florida" />
                    <FieldRow label="Phone" value="(800) 477-3736" />
                    <FieldRow label="Policy / Member ID" value="BCB-KD-298341" />
                    <FieldRow label="Rx BIN" value="610415" />
                    <FieldRow label="Rx PCN" value="ADV" />
                  </div>
                  <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1 mt-2">Medical Insurance</div>
                  <div className="grid grid-cols-2 gap-x-4">
                    <FieldRow label="Payer" value="BlueCross BlueShield of Florida" />
                    <FieldRow label="Phone" value="(800) 477-3736" />
                    <FieldRow label="Policy / Member ID" value="BCB-KD-298341" />
                  </div>
                </div>
              </div>

              {/* Section 4 — Prescription */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "#6b5ecd" }}>4</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescription for {drugName} tablets</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Drug" value={drugName} />
                  <FieldRow label="Strength" value="18 mg" />
                  <FieldRow label="Sig" value="Take one tablet by mouth twice per day" />
                  <FieldRow label="Quantity" value="30-day supply" />
                  <FieldRow label="Refills" value="0" />
                  <FieldRow label="Preferred Pharmacy" value="Accredo Health Group Inc." />
                </div>
              </div>

              {/* Section 5 — Clinical Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "#6b5ecd" }}>5</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Clinical Information</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Diagnosis (ICD-10)" value="J84.112" />
                  <FieldRow label="Diagnosis Description" value="Idiopathic Pulmonary Fibrosis (IPF)" />
                  <FieldRow label="Allergies" value="Penicillin" />
                  <FieldRow label="Prior Therapies" value="Ofev (nintedanib) — discontinued 02/15/20" />
                  <FieldRow label="Concurrent Therapies" value="None" />
                </div>
              </div>

              {/* Section 6 — Prescriber Information */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "#6b5ecd" }}>6</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescriber Information</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Prescriber Name" value="Sarah Chen, MD" />
                  <FieldRow label="Facility" value="Orlando Pulmonology Associates" />
                  <FieldRow label="Address" value="1800 Medical Park Dr, Orlando, FL 32803" />
                  <FieldRow label="Phone" value="(407) 885-9999" />
                  <FieldRow label="Fax" value="(407) 885-9998" />
                  <FieldRow label="NPI" value="1245378901" />
                  <FieldRow label="State License #" value="ME78901" />
                  <FieldRow label="Office Contact" value="Jennifer Torres" />
                  <FieldRow label="Email" value="scheduling@orlandopulm.com" isLink />
                </div>
              </div>

              {/* Section 7 — Prescriber Certification */}
              <div className="border border-[#dddbda] rounded overflow-hidden bg-white">
                <div className="px-4 py-2 flex items-center gap-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold" style={{ background: "#6b5ecd" }}>7</span>
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Prescriber Certification</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: "#e8f4ef", color: "#2e844a" }}>Signed</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 px-4 pt-1 pb-2">
                  <FieldRow label="Prescriber Signature" value="Sarah Chen, MD" />
                  <FieldRow label="Dispense As Written" value="Yes" />
                  <FieldRow label="Date" value="05/20/2026" />
                </div>
              </div>

            </div>

            {/* Right panel — original PDF */}
            <div className="flex flex-col" style={{ flex: 1 }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#dddbda]" style={{ background: "#f3f3f3" }}>
                <span className="text-[12px] font-semibold text-[#3e3e3c]">Original Fax — Enrollment_Form_KDixon_051526.pdf</span>
                <a
                  href="/enrollment-form.pdf"
                  download="Enrollment_Form_KDixon_051526.pdf"
                  className="text-[11px] px-2 py-1 rounded border border-[#dddbda] bg-white text-[#0176d3] hover:bg-[#f0f7ff] transition-colors"
                >
                  Download
                </a>
              </div>
              <object
                data="/enrollment-form.pdf"
                type="application/pdf"
                className="flex-1 w-full"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[#706e6b]" style={{ background: "#f9f9f9" }}>
                  <FileText size={40} className="opacity-30" />
                  <div className="text-[13px] font-medium">PDF preview not available</div>
                  <div className="text-[11px]">Place <code className="bg-[#f0f0f0] px-1 rounded">enrollment-form.pdf</code> in the <code className="bg-[#f0f0f0] px-1 rounded">public/</code> folder to enable preview</div>
                </div>
              </object>
            </div>

          </div>
        </div>
          ) : null}
        </>
      ) : activeStage ? (
        activeStage.id === "CO-14281" ? (
          /* ── Cash Offer Detail View (COA flow) ────────────────────────── */
          <div className="p-4 max-w-5xl">
            <div className="border border-[#dddbda] rounded">
              <div
                className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
                style={{ background: SF_SECTION_BG, minHeight: 36 }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 24, height: 24, background: paymentVerified ? "#2e844a" : FC_BLUE, borderRadius: 5 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M7 12.5l3 3 7-7"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#3e3e3c]">
                  Cash Offer — {activeStage.id}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Cash Offer Details */}
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-2 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Cash Offer Details</span>
                  </div>
                  <div className="space-y-0">
                    <FieldRow label="Offer Status" value={cashOfferStatus === "none" ? "Not Started" : cashOfferStatus === "sent" ? "Sent" : "Paid"} />
                    <FieldRow label="Payment Status" value={paymentVerified ? "Verified" : "Pending Verification"} />
                    <FieldRow label="Ship Date" value={patientShipDate ? new Date(patientShipDate).toLocaleDateString() : "Not set"} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => dispatch('SEND_CASH_OFFER', { portal: 'crm' })}
                    disabled={cashOfferStatus !== "none" || paStatus !== "denied"}
                    className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: cashOfferStatus !== "none" || paStatus !== "denied" ? "#ccc" : FC_BLUE }}
                  >
                    Send Cash Offer
                  </button>
                  <button
                    onClick={() => dispatch('VERIFY_PAYMENT', { portal: 'crm' })}
                    disabled={cashOfferStatus !== "paid" || paymentVerified}
                    className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: cashOfferStatus !== "paid" || paymentVerified ? "#ccc" : FC_BLUE }}
                  >
                    Verify Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : isCoaFlow && activeStage.id === "PA-14274" && paStatus === "denied" ? (
          /* ── COA PA Denial Detail View (mirrors approval structure) ──────── */
          <div className="overflow-y-auto" style={{ height: "calc(100vh - 130px)" }}>
            {/* PA Record Header */}
            <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
              <div className="text-[11px] text-[#706e6b] mb-0.5">Prior Authorization Denial</div>
              <div className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                  >
                    PA
                  </div>
                  <h1 className="text-[20px] font-bold text-[#3e3e3c]">PA-14274</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold px-3 py-1 rounded" style={{ background: "#fee2e2", color: "#dc2626" }}>
                    ✕ Denied
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information section */}
              <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
                {/* Information section */}
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <ChevronDown size={14} className="text-[#706e6b]" />
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Patient" value={patientName} isLink />
                      <FieldRow label="Case" value="00056249" isLink />
                      <FieldRow label="Denial Reason" value="Medical necessity criteria not met" />
                      <FieldRow label="Stage Age (Business Hours)" value="1 hour, 45 minutes" />
                    </div>
                    <div>
                      <FieldRow label="Status" value="Denied" />
                      <FieldRow label="Sub-Status" value="Denied — Appeal Eligible" />
                      <FieldRow label="No Status Change Needed" value="—" />
                      <FieldRow label="Owner" value="Product Owner" />
                    </div>
                  </div>
                </div>

                {/* Prior Authorization Information section */}
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <ChevronDown size={14} className="text-[#706e6b]" />
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Prior Authorization Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Authorization Number" value="PA-2026-001234" />
                      <FieldRow label="Call Reference Number" value="REF-789456" />
                      <FieldRow label="Initiation Source" value="Fax" />
                      <FieldRow label="External Comments" value="Denied — medical necessity not established" />
                      <FieldRow label="Internal Comments" value="PA denied by payer; patient eligible for cash pay program" />
                      <FieldRow label="Payer Notes" value="Appeal rights available within 60 days" />
                    </div>
                    <div>
                      <FieldRow label="Prior Authorization ID" value="SELECTED_Template_51" />
                      <FieldRow label="Last PA Fax Sent Date" value="6/28/2026" />
                      <FieldRow label="Denial Date" value={new Date().toLocaleDateString()} />
                      <FieldRow label="Appeal Deadline" value="8/28/2026" />
                      <FieldRow label="PA Requirements Communicated" value="Yes" />
                      <FieldRow label="PA Requirement Communicated Date/Time" value={`${new Date().toLocaleDateString()}, 10:30 AM`} />
                    </div>
                  </div>
                </div>

                {/* Call Details section */}
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <ChevronDown size={14} className="text-[#706e6b]" />
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Call Authorization Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Prior Authorization Fax #" value="1-800-PA-RECEIVED" />
                      <FieldRow label="Prior Authorization Phone #" value="(407) 885-9999" />
                    </div>
                    <div>
                      <FieldRow label="Auth Decision (Fax #)" value="Denied" />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="border-l-4 p-4 rounded" style={{ borderColor: "#F59E0B", background: "#FEF3C7" }}>
                  <p className="text-[13px] font-semibold mb-2" style={{ color: "#92400E" }}>Patient Eligibility Update</p>
                  <p className="text-[12px]" style={{ color: "#92400E" }}>
                    Patient is eligible for cash pay program — proceed to Cash Offer stage to send offer and collect payment.
                  </p>
                </div>
              </div>

              {/* Right: Denial Status Panel */}
              <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Denial Status</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#dc2626" }}>
                        ✕
                      </div>
                      <div>
                        <div className="text-[11px] text-[#706e6b]">Status</div>
                        <div className="text-[13px] font-semibold text-[#3e3e3c]">Denied</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Denied By</div>
                      <div className="text-[13px] text-[#3e3e3c]">Payer — BlueCross BlueShield</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Denial Date</div>
                      <div className="text-[13px] text-[#3e3e3c]">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Appeal Deadline</div>
                      <div className="text-[13px] text-[#3e3e3c]">8/28/2026</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeStage.id === "PA-14274" && paStatus === "approved" ? (
          /* ── PA Approval Detail View (post-approval) ──────────────────────── */
          <div className="overflow-y-auto" style={{ height: "calc(100vh - 130px)" }}>
            {/* PA Record Header */}
            <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
              <div className="text-[11px] text-[#706e6b] mb-0.5">Prior Authorization Approval</div>
              <div className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg, #2e844a 0%, #1a4d2a 100%)" }}
                  >
                    PA
                  </div>
                  <h1 className="text-[20px] font-bold text-[#3e3e3c]">PA-14274</h1>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] font-semibold px-3 py-1 rounded" style={{ background: "#e8f4ef", color: "#2e844a" }}>
                    ✓ Approved
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information section */}
              <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
                {/* Information section */}
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <ChevronDown size={14} className="text-[#706e6b]" />
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Patient" value="Keanu Reeves" isLink />
                      <FieldRow label="Case" value="00056249" isLink />
                      <FieldRow label="Prescriber Notes" value="Requires prior authorization for coverage" />
                      <FieldRow label="Stage Age (Business Hours)" value="2 hours, 15 minutes" />
                    </div>
                    <div>
                      <FieldRow label="Status" value="Approved" />
                      <FieldRow label="Sub-Status" value="Approved" />
                      <FieldRow label="No Status Change Needed" value="—" />
                      <FieldRow label="Owner" value="Product Owner" />
                    </div>
                  </div>
                </div>

                {/* Prior Authorization Information section */}
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <ChevronDown size={14} className="text-[#706e6b]" />
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Prior Authorization Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Authorization Number" value="PA-2026-001234" />
                      <FieldRow label="Call Reference Number" value="REF-789456" />
                      <FieldRow label="Initiation Source" value="Fax" />
                      <FieldRow label="External Comments" value="Approved for 12 months coverage" />
                      <FieldRow label="Internal Comments" value="Standard PA approved per medical necessity" />
                      <FieldRow label="Payer Notes" value="No specific restrictions noted" />
                    </div>
                    <div>
                      <FieldRow label="Prior Authorization ID" value="SELECTED_Template_51" />
                      <FieldRow label="Last PA Fax Sent Date" value="5/19/2026" />
                      <FieldRow label="Effective Date" value="5/19/2026" />
                      <FieldRow label="Expiration Date" value="5/19/2027" />
                      <FieldRow label="PA Requirements Communicated" value="Yes" />
                      <FieldRow label="PA Requirement Communicated Date/Time" value="5/19/2026, 10:30 AM" />
                    </div>
                  </div>
                </div>

                {/* Call Details section (if applicable) */}
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <ChevronDown size={14} className="text-[#706e6b]" />
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Call Authorization Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
                    <div>
                      <FieldRow label="Prior Authorization Fax #" value="1-800-PA-RECEIVED" />
                      <FieldRow label="Prior Authorization Phone #" value="(407) 885-9999" />
                    </div>
                    <div>
                      <FieldRow label="Auth Approval (Fax #" value="Approved" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Approval Status Panel */}
              <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Approval Status</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#2e844a" }}>
                        ✓
                      </div>
                      <div>
                        <div className="text-[11px] text-[#706e6b]">Status</div>
                        <div className="text-[13px] font-semibold text-[#3e3e3c]">Approved</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Approved By</div>
                      <div className="text-[13px] text-[#3e3e3c]">Provider Portal</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Approval Date</div>
                      <div className="text-[13px] text-[#3e3e3c]">{paApprovedAt ? new Date(paApprovedAt).toLocaleDateString() : "5/19/2026"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#706e6b] mb-1">Valid Until</div>
                      <div className="text-[13px] text-[#3e3e3c]">5/19/2027</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeStage.id === "BI-14273" && biStatus === "complete" ? (
          /* ── BIR Detail View (post-BI completion) ──────────────────────── */
          <div className="overflow-y-auto" style={{ height: "calc(100vh - 130px)" }}>
            {/* BIR Record Header */}
            <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
              <div className="text-[11px] text-[#706e6b] mb-0.5">Benefit Investigation Result</div>
              <div className="flex items-center justify-between py-2 gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg, #0176d3 0%, #014486 100%)" }}
                  >
                    BIR
                  </div>
                  <h1 className="text-[20px] font-bold text-[#3e3e3c]">BIR-0431</h1>
                </div>
              </div>
            </div>

            <div className="flex gap-0 overflow-hidden">
              {/* Left: Information + tables */}
              <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">

                {/* Information section */}
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <ChevronDown size={14} className="text-[#706e6b]" />
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Information</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                    <div>
                      <FieldRow label="Patient" value={patientName} isLink />
                      <FieldRow label="Product" value={drugName} isLink />
                      <FieldRow label="Record Type" value="Pharmacy" />
                      <FieldRow label="Care" value={caseNumber} isLink />
                      <FieldRow label="Benefit Type" value="Pharmacy" />
                      <FieldRow label="Rank" value="Primary" />
                      <FieldRow label="Benefit Source" value="BI" />
                      <FieldRow label="Status" value="Active" />
                      <FieldRow label="Reimbursement Plan" value="" />
                      <FieldRow label="Sub-Status" value="" />
                      <FieldRow label="Insured?" value={isPapFlow ? "No" : "Yes"} />
                      <FieldRow label="Prior Authorization Phone #" value={phone} />
                      <FieldRow label="Subscriber Name" value="Dr. Sarah Chen" />
                      <FieldRow label="Internal Comments" value="" />
                      <FieldRow label="External Comments" value="" />
                    </div>
                    <div>
                      <FieldRow label="Benefit Investigation Result Name" value="BIR-0431" />
                      <FieldRow label="Stage" value="BI-14273" isLink />
                      <FieldRow label="Selected Product Coverage" value="Pharmacy" />
                      <FieldRow label="Payer" value={payer} />
                      <FieldRow label="Payer Type" value={isPapFlow ? "No Insurance" : "Commercial"} />
                      <FieldRow label="Benefit Source" value="BI" />
                      <FieldRow label="External Comments" value="" />
                      <FieldRow label="Subscriber Tax #" value="" />
                      <FieldRow label="Additional Benefit Information" value="" />
                      <FieldRow label="Internal Comments Long" value="" />
                      <FieldRow label="External Comments Long" value="" />
                    </div>
                  </div>
                </div>

                {/* BI Referral Pharmacies table — shown only after Triage stage starts */}
                {pharmacyStatus !== "none" && (
                <div className="border border-[#dddbda] rounded">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">BI Referral Pharmacies (1)</span>
                  </div>
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr style={{ background: SF_SECTION_BG }}>
                        <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Referral Pharmacy Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Pharmacy Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Record Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Network Status</th>
                        <th className="w-8 border-b border-[#dddbda]" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-[#f3f3f3]">
                        <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>PREF-0675</SfLink></td>
                        <td className="px-3 py-2 border-b border-[#dddbda]">Biologics</td>
                        <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>Program Mandated</SfLink></td>
                        <td className="px-3 py-2 border-b border-[#dddbda]">In Network</td>
                        <td className="px-3 py-2 border-b border-[#dddbda]">
                          <button className="border border-[#dddbda] rounded px-1 py-0.5 bg-white hover:bg-[#f3f3f3]">
                            <ChevronDown size={11} className="text-[#706e6b]" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="px-3 py-2">
                    <SfLink className="text-[12px]">View All</SfLink>
                  </div>
                </div>
                )}

              </div>

              {/* Right: BI Product Coverage panel */}
              <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">BI Product Coverage Name</span>
                  </div>
                  <div className="space-y-0">
                    <div className="px-3 py-2 border-b border-[#dddbda]">
                      <SfLink onClick={() => setProductDetailModalOpen(true)}>BIPC-0455</SfLink>
                    </div>
                    <div className="px-3 py-2 border-b border-[#dddbda]">
                      <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Product</div>
                      <SfLink>Assistivan</SfLink>
                    </div>
                    <div className="px-3 py-2 border-b border-[#dddbda]">
                      <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Status</div>
                      <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No Coverage" : "Covered"}</div>
                    </div>
                    <div className="px-3 py-2 border-b border-[#dddbda]">
                      <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">PA Required?</div>
                      <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No" : "Yes"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeStage.id === "TP-14277" ? (
        /* ── Dispatch to Triage Detail View ─────────────────────────────── */
        <div className="p-4 max-w-5xl">
          <div className="border border-[#dddbda] rounded">
            <div
              className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
              style={{ background: SF_SECTION_BG, minHeight: 36 }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 24, height: 24, background: dispatchStatus === "none" || dispatchStatus === "pending_selection" ? "#9a9a9a" : FC_BLUE, borderRadius: 5 }}
              >
                <Zap size={12} className="text-white" fill="white" />
              </div>
              <span className="text-[13px] font-semibold text-[#3e3e3c]">
                {activeStage.name} {activeStage.id}
              </span>
              {canDispatchToPharmacy && (
                <button
                  onClick={() => dispatch('FILL_RX', { portal: 'crm' })}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  Dispatch to Pharmacy
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-6 px-4 pt-4 pb-4">
              {/* Left column: Address and Pharmacy Details */}
              <div className="col-span-2 space-y-4">
                {/* Address Dropdown */}
                <div>
                  <label className="text-[11px] text-[#706e6b] mb-2 block uppercase tracking-wide font-medium">Shipping TO Address</label>
                  <div className="relative">
                    <select className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] text-[#3e3e3c] bg-white hover:bg-[#f3f3f3]">
                      <option value="default">{deliveryAddress || "Select an address"}</option>
                    </select>
                  </div>
                </div>

                {/* Pharmacy Details Section */}
                <div className="border border-[#dddbda] rounded">
                  <div className="px-3 py-2 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Triage Pharmacy Details</span>
                  </div>
                  <div className="space-y-0">
                    <FieldRow label="Pharmacy Name" value={selectedPharmacy?.name || ""} />
                    <FieldRow label="Address" value={selectedPharmacy?.address || ""} />
                    <FieldRow label="City" value={selectedPharmacy?.city || ""} />
                    <FieldRow label="State" value={selectedPharmacy?.state || ""} />
                    <FieldRow label="Zip" value={selectedPharmacy?.zip || ""} />
                    <FieldRow label="Phone" value={selectedPharmacy?.phone || ""} />
                  </div>
                </div>
              </div>

              {/* Right column: Pharmacy Selection Card */}
              <div>
                <div className="border border-[#dddbda] rounded flex flex-col">
                  <div className="px-4 py-3 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                    <span className="text-[12px] font-semibold text-[#3e3e3c]">Select Triage Pharmacy</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 gap-4">
                    {(pharmacyStatus === "shipped" || pharmacyStatus === "delivered" || triageDispatched) ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "#e8f4ef" }}>
                        <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                          Dispatched
                        </span>
                      </div>
                    ) : dispatchStatus === "dispatched" ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "#e8f0fa" }}>
                        <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                          Transferring to pharmacy…
                        </span>
                      </div>
                    ) : pharmacyStatus === "processing" ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "#e8f0fa" }}>
                        <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                          Processing…
                        </span>
                      </div>
                    ) : pharmacyStatus === "ready" ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "#e8f0fa" }}>
                        <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                          Shipping…
                        </span>
                      </div>
                    ) : isCoaFlow ? (
                      // CoA_DTP's pharmacy is auto-assigned at pricing selection
                      // (see coaDtp.ts) — there's nothing to choose here, so no
                      // CTA. Dispatching is done from the "Dispatch to Pharmacy"
                      // button in the header above instead.
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "#f5f5f5" }}>
                        <span className="text-[12px] font-semibold text-[#706e6b]">
                          Pharmacy assigned — ready to dispatch
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPharmacyModalOpen(true)}
                        className="w-full px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: FC_BLUE }}
                      >
                        Choose Pharmacy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata in footer */}
            <div className="grid grid-cols-2 gap-x-6 px-4 pt-2 pb-2 border-t border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <FieldRow label="Status" value={`${activeStage.statusLabel} – ${activeStage.statusDetail}`} />
              <FieldRow
                label="Last Updated"
                value={
                  activeStage.lastUpdated
                    ? `${activeStage.lastUpdated} ${activeStage.lastUpdatedAgo}`
                    : ""
                }
              />
            </div>
          </div>

          {/* Pharmacy Selection Modal */}
          {pharmacyModalOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/50" onClick={() => {
                setPharmacyModalOpen(false);
                setSelectedPharmacyType(null);
                setPreferredPharmacy(null);
                setPayerPharmacy(null);
                setProgramPharmacy(null);
                setDispenserPharmacy(null);
              }} />
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="bg-white border border-[#dddbda] rounded shadow-xl" style={{ width: 600, maxHeight: "80vh" }}>
                  <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
                    <h2 className="text-[16px] font-semibold text-[#3e3e3c]">Select Triage Pharmacy</h2>
                    <button onClick={() => {
                      setPharmacyModalOpen(false);
                      setSelectedPharmacyType(null);
                      setPreferredPharmacy(null);
                      setPayerPharmacy(null);
                      setProgramPharmacy(null);
                      setDispenserPharmacy(null);
                    }} className="p-1 hover:bg-[#f3f3f3] rounded">
                      <X size={18} className="text-[#706e6b]" />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: "calc(80vh - 80px)" }}>
                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Patient Preferred Pharmacy</label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "preferred"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = SPECIALTY_PHARMACIES.find(p => p.name === e.target.value);
                            if (pharm) {
                              setPreferredPharmacy(pharm);
                              setPayerPharmacy(null);
                              setProgramPharmacy(null);
                              setDispenserPharmacy(null);
                              setSelectedPharmacyType("preferred");
                            }
                          } else {
                            setPreferredPharmacy(null);
                            if (selectedPharmacyType === "preferred") setSelectedPharmacyType(null);
                          }
                        }}
                        value={preferredPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {SPECIALTY_PHARMACIES.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Payer Mandated Pharmacy</label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "payer"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = SPECIALTY_PHARMACIES.find(p => p.name === e.target.value);
                            if (pharm) {
                              setPayerPharmacy(pharm);
                              setPreferredPharmacy(null);
                              setProgramPharmacy(null);
                              setDispenserPharmacy(null);
                              setSelectedPharmacyType("payer");
                            }
                          } else {
                            setPayerPharmacy(null);
                            if (selectedPharmacyType === "payer") setSelectedPharmacyType(null);
                          }
                        }}
                        value={payerPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {SPECIALTY_PHARMACIES.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Program Mandated Pharmacy</label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "program"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = SPECIALTY_PHARMACIES.find(p => p.name === e.target.value);
                            if (pharm) {
                              setProgramPharmacy(pharm);
                              setPreferredPharmacy(null);
                              setPayerPharmacy(null);
                              setDispenserPharmacy(null);
                              setSelectedPharmacyType("program");
                            }
                          } else {
                            setProgramPharmacy(null);
                            if (selectedPharmacyType === "program") setSelectedPharmacyType(null);
                          }
                        }}
                        value={programPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {SPECIALTY_PHARMACIES.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#3e3e3c] mb-2">Office Dispense</label>
                      <select
                        className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] bg-white"
                        disabled={selectedPharmacyType !== null && selectedPharmacyType !== "dispenser"}
                        onChange={(e) => {
                          if (e.target.value) {
                            const pharm = SPECIALTY_PHARMACIES.find(p => p.name === e.target.value);
                            if (pharm) {
                              setDispenserPharmacy(pharm);
                              setPreferredPharmacy(null);
                              setPayerPharmacy(null);
                              setProgramPharmacy(null);
                              setSelectedPharmacyType("dispenser");
                            }
                          } else {
                            setDispenserPharmacy(null);
                            if (selectedPharmacyType === "dispenser") setSelectedPharmacyType(null);
                          }
                        }}
                        value={dispenserPharmacy?.name || ""}
                      >
                        <option value="">Select...</option>
                        {SPECIALTY_PHARMACIES.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
                    <button
                      onClick={() => {
                        setPharmacyModalOpen(false);
                        setSelectedPharmacyType(null);
                        setPreferredPharmacy(null);
                        setPayerPharmacy(null);
                        setProgramPharmacy(null);
                        setDispenserPharmacy(null);
                      }}
                      className="px-4 py-2 border border-[#dddbda] rounded text-[13px] font-semibold text-[#3e3e3c] hover:bg-[#f3f3f3] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const selected = preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy;
                        if (selected) {
                          dispatch('SELECT_PHARMACY', { portal: 'crm', pharmacy: selected });
                          setPharmacyModalOpen(false);
                          setSelectedPharmacyType(null);
                          setPreferredPharmacy(null);
                          setPayerPharmacy(null);
                          setProgramPharmacy(null);
                          setDispenserPharmacy(null);
                        }
                      }}
                      className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: FC_BLUE, opacity: (preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy) ? 1 : 0.5 }}
                      disabled={!(preferredPharmacy || payerPharmacy || programPharmacy || dispenserPharmacy)}
                    >
                      Save Selection
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
        ) : activeStage?.id === "PS-14278" ? (
        /* ── Pharmacy Status Tab (PS-14278) ──────────────────────────────── */
        <div className="p-4 max-w-3xl">
          <div className="border border-[#dddbda] rounded">
            <div
              className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
              style={{ background: SF_SECTION_BG, minHeight: 36 }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 24, height: 24, background: FC_BLUE, borderRadius: 5 }}
              >
                <Zap size={12} className="text-white" fill="white" />
              </div>
              <span className="text-[13px] font-semibold text-[#3e3e3c]">
                Pharmacy Status PS-14278
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
              <div>
                <FieldRow label="Pharmacy" value={selectedPharmacy?.name ?? "Not yet selected"} />
                <FieldRow
                  label="Status"
                  value={
                    pharmacyStatus === "none" ? "Awaiting dispatch" :
                    pharmacyStatus === "processing" ? "Preparing medication" :
                    pharmacyStatus === "shipped" ? "In transit" :
                    pharmacyStatus === "delivered" ? "Delivered" :
                    pharmacyStatus
                  }
                />
              </div>
              <div>
                <FieldRow label="Stage Type" value="Pharmacy Status" />
                <FieldRow label="Stage ID" value="PS-14278" />
              </div>
            </div>

            <div
              className="px-4 pb-4 border-t border-[#dddbda] pt-3"
              style={{ background: SF_SECTION_BG }}
            >
              <p className="text-[11px] text-[#706e6b] mb-2 font-medium">
                ADVANCE PHARMACY STATUS
              </p>

              {(pharmacyStatus === "none" || pharmacyStatus === "processing") && (
                <div className="flex items-center gap-2 py-2">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: "#e8a900" }}
                  />
                  <span className="text-[12px] text-[#706e6b]">
                    {pharmacyStatus === "none"
                      ? "Awaiting pharmacy dispatch from Triage tab"
                      : "Rx in transit to triage pharmacy…"}
                  </span>
                </div>
              )}

              {pharmacyStatus === "processing" && (
                <button
                  onClick={() => dispatch('READY_RX', { portal: 'crm' })}
                  className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-2"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark as Received at Pharmacy
                </button>
              )}

              {pharmacyStatus === "ready" && (
                <button
                  onClick={() => dispatch('SHIP_RX', { portal: 'crm' })}
                  className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  Mark as Shipped
                </button>
              )}

              {pharmacyStatus === "shipped" && (
                <button
                  onClick={() => dispatch('DELIVER_RX', { portal: 'crm' })}
                  className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#2e844a" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Mark as Delivered
                </button>
              )}

              {pharmacyStatus === "delivered" && (
                <div className="flex items-center gap-2 py-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#e8f4ef" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2e844a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                    Medication delivered
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        ) : (
        /* ── Stage Detail View (generic) ─────────────────────────────────── */
        <div className="p-4 max-w-3xl">
          <div className="border border-[#dddbda] rounded">
            <div
              className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
              style={{ background: SF_SECTION_BG, minHeight: 36 }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{ width: 24, height: 24, background: activeStage.isNotStarted ? "#9a9a9a" : FC_BLUE, borderRadius: 5 }}
              >
                <Zap size={12} className="text-white" fill="white" />
              </div>
              <span className="text-[13px] font-semibold text-[#3e3e3c]">
                {activeStage.id === "BI-14273" ? "Benefit Investigation Result" : activeStage.name} {activeStage.id}
              </span>
              {activeStage.id === "BI-14273" && biStatus === "running" && (
                <button
                  onClick={() => dispatch('COMPLETE_BI', { portal: 'crm', result: isPapFlow ? "no_insurance" : "coverage_found" })}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Check Status
                </button>
              )}
              {activeStage.id === "PA-14274" && paStatus === "approved" && (
                <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded" style={{ background: "#e8f4ef", color: "#2e844a" }}>
                  Approved
                </span>
              )}
              {activeStage.id === "TP-14277" && canDispatchToPharmacy && (
                <button
                  onClick={() => dispatch('FILL_RX', { portal: 'crm' })}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: FC_BLUE }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  Dispatch to Pharmacy
                </button>
              )}
              {activeStage.id === "TP-14277" && dispatchStatus === "dispatched" && pharmacyStatus !== "processing" && pharmacyStatus !== "ready" && (
                <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded animate-pulse" style={{ background: "#e8f0fa", color: FC_BLUE }}>
                  Processing…
                </span>
              )}
              {activeStage.id === "TP-14277" && pharmacyStatus === "ready" && (
                <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded animate-pulse" style={{ background: "#e8f0fa", color: FC_BLUE }}>
                  Shipping…
                </span>
              )}
              {activeStage.id === "TP-14277" && (pharmacyStatus === "shipped" || pharmacyStatus === "delivered") && (
                <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded" style={{ background: "#e8f4ef", color: "#2e844a" }}>
                  Dispatched
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
              <div>
                <FieldRow label="Status" value={`${activeStage.statusLabel} – ${activeStage.statusDetail}`} />
                {activeStage.fields.map((f) => (
                  <FieldRow key={f.label} label={f.label} value={f.value ?? "No Data Available"} />
                ))}
              </div>
              <div>
                <FieldRow label="Stage Type" value={activeStage.name} />
                <FieldRow label="Stage ID" value={activeStage.id} />
                <FieldRow label="Service Type" value="Onboarding" />
                <FieldRow label="Sequence" value="1" />
                <FieldRow
                  label="Last Updated"
                  value={
                    activeStage.lastUpdated
                      ? `${activeStage.lastUpdated} ${activeStage.lastUpdatedAgo}`
                      : "No Data Available"
                  }
                />
              </div>
            </div>
          </div>
        </div>
        )
      ) : openBipcTabs.includes(activeTopTab) ? (
        /* ── BIPC Detail View ──────────────────────────────────────────────── */
        <div className="overflow-y-auto" style={{ height: "calc(100vh - 130px)" }}>
          {/* BIPC Record Header */}
          <div className="border-b border-[#dddbda] bg-white px-4 pt-2 pb-0">
            <div className="text-[11px] text-[#706e6b] mb-0.5">Product Coverage</div>
            <div className="flex items-center justify-between py-2 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                  style={{ width: 36, height: 36, background: "linear-gradient(135deg, #0176d3 0%, #014486 100%)" }}
                >
                  PC
                </div>
                <h1 className="text-[20px] font-bold text-[#3e3e3c]">{activeTopTab}</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SfButton>Edit</SfButton>
                <SfButton>Delete</SfButton>
              </div>
            </div>
          </div>

          <div className="flex gap-0 overflow-hidden">
            {/* Left: Information */}
            <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
              {/* Information section */}
              <div className="border border-[#dddbda] rounded">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                  <ChevronDown size={14} className="text-[#706e6b]" />
                  <span className="text-[12px] font-semibold text-[#3e3e3c]">Information</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                  <div>
                    <FieldRow label="Product" value={drugName} isLink />
                    <FieldRow label="Product Coverage Status" value={isPapFlow ? "No Coverage" : "Covered"} />
                    <FieldRow label="PA Required?" value={isPapFlow ? "No" : "Yes"} />
                    <FieldRow label="Care" value="00001740" isLink />
                    <FieldRow label="Benefit Type" value="Pharmacy" />
                    <FieldRow label="Rank" value="Primary" />
                  </div>
                  <div>
                    <FieldRow label="BI Product Coverage Name" value={activeTopTab} />
                    <FieldRow label="Benefit Investigation Result" value="BIR-0431" isLink />
                    <FieldRow label="Payer" value="United Healthcare" />
                    <FieldRow label="Payer Type" value={isPapFlow ? "No Insurance" : "Commercial"} />
                    <FieldRow label="Status" value="Active" />
                    <FieldRow label="Internal Comments" value="" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick Info Panel */}
            <div className="shrink-0 border-l border-[#dddbda] p-4" style={{ width: 260 }}>
              <div className="border border-[#dddbda] rounded">
                <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                  <span className="text-[12px] font-semibold text-[#3e3e3c]">Quick Info</span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="text-[11px] text-[#706e6b] mb-1">Last Updated</div>
                    <div className="text-[13px] text-[#3e3e3c]">Today</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] mb-1">Created Date</div>
                    <div className="text-[13px] text-[#3e3e3c]">5/19/2026</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] mb-1">Related Benefit Investigation</div>
                    <div className="text-[13px] text-[#3e3e3c]"><SfLink>BIR-0431</SfLink></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {/* ── Onboarding Case Record (shown when keanu + onboarding sub-tab) ─ */}
      {activeTopTab === "keanu" && activePatientSubTab === "onboarding" && (
        <>
          {/* Case Record Header */}
          <div className="border-b border-[#dddbda] bg-white">
            <div className="px-4 pt-2 pb-0">
              <span className="text-[11px] text-[#706e6b]">Case</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center rounded text-white font-bold text-[10px] shrink-0"
                  style={{ width: 36, height: 36, background: "linear-gradient(135deg, #0176d3 0%, #014486 100%)" }}
                >
                  Case
                </div>
                <h1 className="text-[20px] font-bold text-[#3e3e3c] truncate">Onboarding</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <SfButton>Edit</SfButton>
                <SfButton>Delete</SfButton>
                <SfButton split>Change Owner</SfButton>
              </div>
            </div>
          </div>
          {/* Case Quick-Info Bar */}
          <div className="border-b border-[#dddbda] bg-white px-4 py-3 flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex flex-col min-w-[70px]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Case Status</span>
              <span className="text-[13px] text-[#3e3e3c]">Open</span>
            </div>
            <div className="flex flex-col min-w-[90px]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Case Number</span>
              <span className="text-[13px] text-[#3e3e3c]">{caseNumber}</span>
            </div>
            <div className="flex flex-col min-w-[150px]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Date/Time Opened</span>
              <span className="text-[13px] text-[#3e3e3c]">5/15/2026 2:31 PM</span>
            </div>
            <div className="flex flex-col min-w-[150px]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Date/Time Closed</span>
              <span className="text-[13px] text-[#3e3e3c]">&nbsp;</span>
            </div>
            <div className="flex flex-col min-w-[80px]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Case Origin</span>
              <span className="text-[13px] text-[#3e3e3c]">Fax</span>
            </div>
            <div className="flex flex-col min-w-[100px]">
              <span className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium">Referral Source</span>
              <span className="text-[13px] text-[#3e3e3c]">HCP</span>
            </div>
          </div>
          {/* Row 2: Case Navigation Tabs */}
          <div className="border-b border-[#dddbda] flex bg-white overflow-x-auto">
            {CASE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCaseTab(tab.id)}
                className={`px-4 py-3 text-[13px] whitespace-nowrap transition-colors relative shrink-0 ${
                  activeCaseTab === tab.id ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
                }`}
                style={{ color: activeCaseTab === tab.id ? SF_BLUE : undefined }}
              >
                {tab.label}
                {activeCaseTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: SF_BLUE }} />
                )}
              </button>
            ))}
          </div>
          {activeCaseTab === "summary" ? (
        <div className="flex" style={{ minHeight: "calc(100vh - 210px)" }}>
          {/* ── Left Panel (68%) ───────────────────────────────────────────── */}
          <div
            className="min-w-0 border-r border-[#dddbda]"
            style={{ flexBasis: "68%" }}
          >
            <div className="p-4">
              {/* Case Summary accordion */}
              <div className="border border-[#dddbda] rounded mb-4">
                <SectionHeader
                  title="Case Summary"
                  collapsed={caseSummaryCollapsed}
                  onToggle={() => setCaseSummaryCollapsed(!caseSummaryCollapsed)}
                />
                {!caseSummaryCollapsed && (
                  <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                    <div>
                      <FieldRow label="Account Name" value="Keanu Dixon" isLink />
                      <FieldRow label="Service Type" value="Patient Solutions" isLink />
                      <FieldRow label="Case Type" value="Onboarding" />
                      <FieldRow label="Referral Source" value="HCP" />
                      <FieldRow label="Interaction" value="HCP241205" />
                      <FieldRow label="Product" value="PP-27305" isLink />
                    </div>
                    <div>
                      <FieldRow label="Case Date" value="Not Started" />
                      <FieldRow label="Case Record Type" value="Patient Solutions" />
                      <FieldRow label="Program Type" />
                      <div className="group relative flex flex-col py-2 border-b border-[#dddbda] pr-6 min-h-[44px]">
                        <span className="text-[11px] text-[#706e6b] mb-0.5 uppercase tracking-wide font-medium leading-tight">
                          Case Owner
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex items-center justify-center rounded-full bg-[#ecebea] shrink-0"
                            style={{ width: 18, height: 18 }}
                          >
                            <User size={10} className="text-[#706e6b]" />
                          </div>
                          <SfLink className="text-[13px]">AssistRx Clin/Fulfillment</SfLink>
                        </div>
                      </div>
                      <FieldRow label="Enrollment Date" value="5/15/2026" />
                    </div>
                  </div>
                )}
              </div>

              {/* Stages accordion */}
              <div className="border border-[#dddbda] rounded">
                <SectionHeader
                  title={`Stages (${STAGES_LIVE.length})`}
                  collapsed={stagesCollapsed}
                  onToggle={() => setStagesCollapsed(!stagesCollapsed)}
                  rightContent={
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 hover:bg-[#e5e5e5] rounded transition-colors">
                        <Settings size={13} className="text-[#706e6b]" />
                      </button>
                      <button className="p-1.5 hover:bg-[#e5e5e5] rounded transition-colors">
                        <RefreshCw size={13} className="text-[#706e6b]" />
                      </button>
                    </div>
                  }
                />
                {!stagesCollapsed && (
                  <>
                    <div className="px-3 py-1.5 text-[11px] text-[#706e6b] border-b border-[#dddbda]">
                      {STAGES_LIVE.length} items • Sorted by Created Date • Updated a few seconds ago
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]" style={{ minWidth: 700 }}>
                        <thead>
                          <tr style={{ background: SF_SECTION_BG }}>
                            <th className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium border-b border-[#dddbda] w-8">#</th>
                            {[
                              { label: "Stage Name", sortable: true },
                              { label: "Record Type Name", sortable: true },
                              { label: "Status", sortable: true },
                              { label: "Sub-Status", sortable: true },
                              { label: "Stage State", sortable: true },
                              { label: "Service Ty...", sortable: true },
                              { label: "Created Date", sortable: true, asc: true },
                            ].map((col) => (
                              <th
                                key={col.label}
                                className="text-left px-3 py-2 text-[11px] text-[#706e6b] font-medium border-b border-[#dddbda] whitespace-nowrap"
                              >
                                <div className="flex items-center gap-1">
                                  {col.label}
                                  {col.asc ? (
                                    <ArrowUp size={10} className="text-[#706e6b]" />
                                  ) : col.sortable ? (
                                    <ArrowUpDown size={10} className="text-[#706e6b]" />
                                  ) : null}
                                </div>
                              </th>
                            ))}
                            <th className="border-b border-[#dddbda] w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {STAGES_LIVE.map((stage, i) => {
                            const stageState = stage.isComplete
                              ? "Closed"
                              : stage.isNotStarted
                              ? ""
                              : "Not Started";
                            const statusLabel = stage.isNotStarted ? "" : stage.statusLabel;
                            const subStatus = stage.isNotStarted ? "" : stage.statusDetail;
                            return (
                              <tr key={stage.id} className="hover:bg-[#f3f3f3] transition-colors">
                                <td className="px-3 py-2 border-b border-[#dddbda] text-[#706e6b]">
                                  {i + 1}
                                </td>
                                <td className="px-3 py-2 border-b border-[#dddbda]">
                                  <SfLink className="text-[12px]">{stage.id}</SfLink>
                                </td>
                                <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                                  {stage.name}
                                </td>
                                <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">{statusLabel}</td>
                                <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] max-w-[160px] truncate" title={subStatus}>
                                  {subStatus}
                                </td>
                                <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">{stageState}</td>
                                <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c]">Onboarding</td>
                                <td className="px-3 py-2 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                                  5/15/2026 2:31 PM
                                </td>
                                <td className="px-3 py-2 border-b border-[#dddbda]">
                                  <button className="p-0.5 hover:bg-[#e5e5e5] rounded">
                                    <ChevronDown size={13} className="text-[#706e6b]" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Panel (32%) ──────────────────────────────────────────── */}
          <div
            className="flex flex-col bg-white"
            style={{ flexBasis: "32%", minWidth: 280 }}
          >
            {/* Right tab strip */}
            <div className="border-b border-[#dddbda] flex shrink-0">
              {RIGHT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRightTab(tab.id)}
                  className={`px-4 py-3 text-[13px] whitespace-nowrap transition-colors relative ${
                    activeRightTab === tab.id ? "font-semibold" : "text-[#706e6b] hover:text-[#3e3e3c]"
                  }`}
                  style={{ color: activeRightTab === tab.id ? SF_BLUE : undefined }}
                >
                  {tab.label}
                  {activeRightTab === tab.id && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ background: SF_BLUE }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeRightTab === "quick-answers" && (
                <>
                  {/* Fulfilment Center section */}
                  <div className="border-b border-[#dddbda] p-3">
                    <div className="text-[13px] font-semibold text-[#3e3e3c] mb-2">
                      Fulfilment Center
                    </div>
                    <button
                      onClick={() => navigate("/fulfilment-center")}
                      className="w-full py-1.5 text-[13px] font-medium text-white rounded transition-opacity hover:opacity-90 active:opacity-80"
                      style={{ background: FC_BLUE }}
                    >
                      Open Fulfilment Center
                    </button>
                  </div>

                  {/* Stage Quick View */}
                  <div>
                    <div
                      className="px-3 py-2 border-b border-[#dddbda]"
                      style={{ background: SF_SECTION_BG }}
                    >
                      <span className="text-[13px] font-semibold text-[#3e3e3c]">
                        Stage Quick View
                      </span>
                    </div>
                    <div className="px-3">
                      {STAGES_LIVE.map((stage) => (
                        <StageCard key={stage.id} stage={stage} onHeaderClick={handleOpenStage} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeRightTab === "missing-info" && (
                <div>
                  {consentStatus === "pending" ? (
                    <table className="w-full text-[12px] border-collapse">
                      <thead>
                        <tr style={{ background: "#f3f3f3" }}>
                          <th className="px-3 py-2 text-left font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Missing Item</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#3e3e3c] border-b border-[#dddbda]">Impact</th>
                          <th className="px-3 py-2 border-b border-[#dddbda]" />
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-[#f9f9f9]">
                          <td className="px-3 py-2.5 border-b border-[#dddbda] font-medium text-[#3e3e3c]">Patient Consent</td>
                          <td className="px-3 py-2.5 border-b border-[#dddbda]">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: "#fff3cd", color: "#856404" }}>Pending</span>
                          </td>
                          <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#706e6b]">Benefits Investigation has not yet run</td>
                          <td className="px-3 py-2.5 border-b border-[#dddbda]">
                            <button
                              onClick={() => dispatch('ENROLL', { portal: 'crm' })}
                              className="px-2.5 py-1 rounded text-[11px] font-semibold text-white transition-colors hover:opacity-90"
                              style={{ background: FC_BLUE }}
                            >
                              Enroll Patient
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-[13px] text-[#706e6b] text-center py-8">No missing information items.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
          ) : activeCaseTab === "documents" && isFaxFlow ? (
            <div className="p-4">
              <div className="border border-[#dddbda] rounded overflow-hidden">
                {/* Table header */}
                <div
                  className="flex items-center justify-between px-3 py-2 border-b border-[#dddbda]"
                  style={{ background: "#f3f3f3" }}
                >
                  <span className="text-[13px] font-semibold text-[#3e3e3c]">Related Documents</span>
                  <span className="text-[12px] text-[#706e6b]">{FAX_DOCUMENTS.length} record{FAX_DOCUMENTS.length !== 1 ? "s" : ""}</span>
                </div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: "#f3f3f3" }}>
                      {[
                        { label: "File ID", sortable: true },
                        { label: "File Name", sortable: true },
                        { label: "Type" },
                        { label: "Pages" },
                        { label: "Date Received", sortable: true },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className="text-left px-3 py-2 text-[11px] text-[#706e6b] uppercase tracking-wide font-medium border-b border-[#dddbda] whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.sortable && <ArrowUpDown size={10} className="text-[#706e6b]" />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FAX_DOCUMENTS.map((doc) => (
                      <tr key={doc.fileId} className="hover:bg-[#f3f3f3] transition-colors">
                        <td className="px-3 py-2.5 border-b border-[#dddbda]">
                          <div className="flex items-center gap-1.5">
                            <FileText size={13} className="text-[#706e6b] shrink-0" />
                            <span
                              className="cursor-pointer hover:underline font-medium"
                              style={{ color: SF_BLUE }}
                              onClick={() => { openEnrollmentFormTab(); setActivePatientSubTab("enrollment-form"); }}
                            >
                              {doc.fileId}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda]">
                          <span
                            className="cursor-pointer hover:underline"
                            style={{ color: SF_BLUE }}
                            onClick={() => { openEnrollmentFormTab(); setActivePatientSubTab("enrollment-form"); }}
                          >
                            {doc.fileName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                          {doc.type}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                          {doc.pages}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                          {doc.dateReceived}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeCaseTab === "tasks" ? (
            <div className="p-4">
              <div className="border border-[#dddbda] rounded overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ background: "#f3f3f3" }}>
                      {[
                        { label: "Task Type", sortable: true },
                        { label: "Priority" },
                        { label: "Status" },
                        { label: "Due Date" },
                        { label: "Assigned To" },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className="text-left px-3 py-2 text-[11px] text-[#706e6b] uppercase tracking-wide font-medium border-b border-[#dddbda] whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.sortable && <ArrowUpDown size={10} className="text-[#706e6b]" />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Missing Information task - always visible with status reflecting workflow */}
                    <tr className="hover:bg-[#f3f3f3] transition-colors">
                      <td className="px-3 py-2.5 border-b border-[#dddbda] font-medium cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                        Missing Information
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                        High
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#dddbda]">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: biStatus === "complete" ? "#e8f4ef" : "#fff3cd", color: biStatus === "complete" ? "#2e844a" : "#856404" }}>
                          {biStatus === "complete" ? "Closed" : "Open"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                        Jun 14, 2026
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                        Sarah Mitchell
                      </td>
                    </tr>
                    {/* Prior Authorization Requested task - always visible when BI is complete */}
                    {biStatus === "complete" && (
                      <tr className="hover:bg-[#f3f3f3] transition-colors">
                        <td className="px-3 py-2.5 border-b border-[#dddbda] font-medium cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                          Prior Authorization Requested
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                          High
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda]">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: paStatus === "approved" ? "#e8f4ef" : "#fff3cd", color: paStatus === "approved" ? "#2e844a" : "#856404" }}>
                            {paStatus === "approved" ? "Closed" : "Open"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c] whitespace-nowrap">
                          {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#dddbda] text-[#3e3e3c]">
                          Sarah Mitchell
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-[13px] text-[#706e6b] text-center">
              No {CASE_TABS.find((t) => t.id === activeCaseTab)?.label} records found.
            </div>
          )}
        </>
      )}

      {/* Product Detail Modal - rendered at root level to escape overflow constraints */}
      {productDetailModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setProductDetailModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-white border border-[#dddbda] rounded shadow-xl" style={{ width: 600, maxHeight: "90vh" }}>
              <div className="px-6 py-4 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded" style={{ width: 32, height: 32, background: "#0070d2" }}>
                    <span className="text-white text-[12px] font-bold">PC</span>
                  </div>
                  <h2 className="text-[16px] font-semibold text-[#3e3e3c]">BIPC-0455</h2>
                </div>
                <button onClick={() => setProductDetailModalOpen(false)} className="p-1 hover:bg-[#f3f3f3] rounded">
                  <X size={18} className="text-[#706e6b]" />
                </button>
              </div>

              <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 80px)" }}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PRODUCT</div>
                    <div className="text-[13px] text-[#3e3e3c]">Assistivan</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BI PRODUCT COVERAGE NAME</div>
                    <div className="text-[13px] text-[#3e3e3c]">BIPC-0455</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PRODUCT COVERAGE STATUS</div>
                    <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No Coverage" : "Covered"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BENEFIT INVESTIGATION RESULT</div>
                    <div className="text-[13px]" style={{ color: SF_BLUE }}>BIR-0431</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PA REQUIRED?</div>
                    <div className="text-[13px] text-[#3e3e3c]">{isPapFlow ? "No" : "Yes"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PAYER</div>
                    <div className="text-[13px] text-[#3e3e3c]">United Healthcare</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">CARE</div>
                    <div className="text-[13px]" style={{ color: SF_BLUE }}>00001740</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">PAYER TYPE</div>
                    <div className="text-[13px] text-[#3e3e3c]">Commercial</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">BENEFIT TYPE</div>
                    <div className="text-[13px] text-[#3e3e3c]">Pharmacy</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">STATUS</div>
                    <div className="text-[13px] text-[#3e3e3c]">Active</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">RANK</div>
                    <div className="text-[13px] text-[#3e3e3c]">Primary</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-1">INTERNAL COMMENTS</div>
                    <div className="text-[13px] text-[#3e3e3c]">—</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
