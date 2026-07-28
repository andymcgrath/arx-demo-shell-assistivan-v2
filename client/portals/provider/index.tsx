import { useState, useEffect, useRef } from "react";
import { usePatientStore } from "@/store/patientStore";
import { usePresPapStore } from "@/store/presPapStore";
import { useDemoStore } from "@/store/demoStore";
import PesHome from "@/components/enrollment/PesHome";
import { usePersonaState, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { dateFromToday } from "@/lib/relativeDate";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Bell, ChevronDown, Settings, Users, Calendar,
  ClipboardList, Pill, FlaskConical, Image as ImageIcon, FolderOpen,
  Syringe, Share2, Mail, CheckSquare, MoreHorizontal,
} from "lucide-react";
import type { PatientStatus } from "@/store/samplePatients";
import type { WorkflowData } from "@/engine/types";
// WF4's own dashboard — reused as-is for CoA_DTP's post-PA screen (see the
// isCoA branch in ProviderPortal below). Not a copy; if WF4's Dashboard
// changes, this picks it up automatically.
import IAssistDashboardPage from "@/portals/iassist/pages/Dashboard";
// Dashboard calls useNavigate() from portalRouter, which throws unless it's
// mounted under a <PortalRouter> — WF4's own portal (client/portals/iassist/
// index.tsx) supplies that wrapper, but the provider portal here doesn't, so
// we provide our own when rendering Dashboard directly. Note: this is an
// isolated router with no routes registered for "/new-case/*" (the case
// wizard), so clicking a patient row here won't navigate anywhere — a known
// limitation of reusing WF4's dashboard outside its own portal.
import { PortalRouter } from "@/lib/portalRouter";
import "./styles.css";

type Step = "email" | "login" | "pa-questions" | "pa-submitted" | "income-verify" | "income-submitted" | "coa-dashboard" | "coa-rx" | "coa-sent"
  // WF5 (PrES_PAP) provider flow — see PresPapProviderExperience below.
  | "pres-home" | "pres-drug" | "pres-patient-info" | "pres-prescriber"
  | "pres-consent" | "pres-insurance" | "pres-financial" | "pres-complete";

// ── Heroic EHR brand palette ──────────────────────────────────────────────────
// The Provider portal for CoA_DTP represents the HCP's own EHR system — a
// different product from CoAssist (the patient-facing app) — so it gets its
// own name/logo/blue palette here, local to this file. Does not touch the
// patient portal's branding.ts (CoAssist) or WF1/WF2/WF4's own provider
// theming (BrandSidebar's iAssist teal, styles.css's --primary-teal-* vars,
// shared pa-btn-* classes used by every flow).
const HEROIC_BLUE = "#1E4FD6";
const HEROIC_BLUE_DARK = "#15399E";
const HEROIC_BLUE_LIGHT = "#EAF0FE";

function HeroicEhrLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true" className="flex-shrink-0">
        <path d="M14 2L24 6V13C24 19.5 19.8 24.7 14 26C8.2 24.7 4 19.5 4 13V6L14 2Z" fill="#D62B2B" />
        <path d="M14 2L24 6V13C24 19.5 19.8 24.7 14 26V2Z" fill={HEROIC_BLUE} />
        <path d="M14 8.5V19.5M8.5 14H19.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] leading-none whitespace-nowrap">
        <span className="font-bold" style={{ color: HEROIC_BLUE }}>Heroic</span>{" "}
        <span className="font-normal" style={{ color: HEROIC_BLUE }}>EHR</span>
      </span>
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
// Default color (#007178) matches the shared app-wide teal used by every
// flow's PA forms. CoA_DTP's Provider-portal-exclusive call sites pass
// HEROIC_BLUE explicitly; every other call site is unaffected by the prop
// existing since it just falls back to the same default as before.

function CheckedCircleIcon({ className = "", color = "#007178" }: { className?: string; color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill={color} />
    </svg>
  );
}

function UncheckedCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 0.75C12.0051 0.75 15.25 3.99486 15.25 8C15.25 12.0051 12.0051 15.25 8 15.25C3.99486 15.25 0.75 12.0051 0.75 8C0.75 3.99486 3.99486 0.75 8 0.75Z" stroke="#6F7276" strokeWidth="1.5" />
    </svg>
  );
}

function RadioCheckedIcon({ color = "#007178" }: { color?: string } = {}) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M0 8C0 3.58125 3.58125 0 8 0C12.4187 0 16 3.58125 16 8C16 12.4187 12.4187 16 8 16C3.58125 16 0 12.4187 0 8ZM8 11C9.65625 11 11 9.65625 11 8C11 6.31563 9.65625 5 8 5C6.31563 5 5 6.31563 5 8C5 9.65625 6.31563 11 8 11Z" fill={color} />
    </svg>
  );
}

function RadioUncheckedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M8 14.4C11.5346 14.4 14.4 11.5346 14.4 8C14.4 4.46538 11.5346 1.6 8 1.6C4.46538 1.6 1.6 4.46538 1.6 8C1.6 11.5346 4.46538 14.4 8 14.4ZM8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16Z" fill="#6F7276" />
    </svg>
  );
}

function AssistRxLogo() {
  return (
    <div className="provider-portal-wordmark">
      <span className="provider-portal-wordmark__title">Provider Portal</span>
    </div>
  );
}

// ── Portal branding helper ────────────────────────────────────────────────────

function isBrandedFlow(flowType: string): boolean {
  return flowType.includes("iAssist");
}

// ── Brand Sidebar (for PA workflows and iAssist) ──────────────────────────────

function BrandSidebar({ isBranded }: { isBranded: boolean }) {
  if (isBranded) {
    return (
      <aside className="provider-sidebar provider-sidebar--branded">
        <div className="provider-sidebar__logo">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F85024768bb364ddda8d2365469c3ce76?format=webp&width=800&height=1200"
            alt="iAssist Logo"
            className="h-8 w-auto"
          />
        </div>
        <div className="provider-sidebar__illustration">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/a4826c434ed1dd6a529572eafddc92418cee2e88?width=928"
            alt="iAssist illustration"
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="provider-sidebar">
      <div className="provider-sidebar__logo">
        <AssistRxLogo />
      </div>
      <div className="provider-sidebar__illustration">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/a4826c434ed1dd6a529572eafddc92418cee2e88?width=928"
          alt="Provider Portal illustration"
        />
      </div>
    </aside>
  );
}

// ── Heroic EHR full chart shell (CoA_DTP provider portal only) ─────────────
//
// Replaces the old Heroic EHR "dashboard" screens with a layout modeled on a
// real clinical EHR chart (icon rail / patient banner / chart-note tabs /
// Physician Notes sub-nav / Recommendations sub-tabs). This entire section is
// only ever mounted from CoaProviderExperience below, which is only reached
// when flowType === "CoA_DTP" — none of it is imported or referenced by
// WF1/WF2/WF4's rendering paths, so it can't change their appearance.

const CHART_TABS = [
  { key: "questionnaires", label: "Questionnaires" },
  { key: "nurse-input", label: "Nurse Input" },
  { key: "physician-notes", label: "Physician Notes" },
  { key: "procedure-codes", label: "Procedure Codes" },
  { key: "mu", label: "MU" },
] as const;

const PLAN_NAV_GROUPS: { group: string; items: { key: string; label: string }[] }[] = [
  { group: "Subjective", items: [{ key: "chief-complaints", label: "Chief Complaints" }, { key: "history", label: "History" }] },
  { group: "Objective", items: [{ key: "physical-examination", label: "Physical Examination" }] },
  { group: "Assessment", items: [{ key: "assessment-notes", label: "Assessment Notes" }, { key: "diagnoses", label: "Diagnoses" }, { key: "self-notes", label: "Self Notes" }] },
  { group: "Plan", items: [{ key: "recommendations", label: "Recommendations" }, { key: "vaccines-injections", label: "Vaccines / Injections" }, { key: "treatment-notes", label: "Treatment Notes" }, { key: "instructions", label: "Instructions" }] },
];

const REC_TABS = [
  { key: "prescriptions", label: "Prescriptions" },
  { key: "supplements", label: "Supplements" },
  { key: "order-labs", label: "Order Labs" },
  { key: "imaging", label: "Imaging" },
  { key: "diets", label: "Diets" },
  { key: "lifestyle", label: "Lifestyle" },
] as const;

const ICON_RAIL_ITEMS = [
  { key: "patients", label: "Patients", Icon: Users },
  { key: "calendar", label: "Calendar", Icon: Calendar },
  { key: "chart-notes", label: "Chart Notes", Icon: ClipboardList },
  { key: "prescriptions", label: "Prescriptions", Icon: Pill },
  { key: "labs", label: "Labs", Icon: FlaskConical },
  { key: "images", label: "Images", Icon: ImageIcon },
  { key: "documents", label: "Documents", Icon: FolderOpen },
  { key: "injections", label: "Injections", Icon: Syringe },
  { key: "referrals", label: "Referrals", Icon: Share2 },
  { key: "messages", label: "Messages", Icon: Mail },
  { key: "tasks", label: "Tasks", Icon: CheckSquare },
  { key: "more", label: "More", Icon: MoreHorizontal },
] as const;

function EhrIconRail() {
  return (
    <aside className="hidden md:flex w-16 flex-shrink-0 flex-col items-center gap-1 bg-white border-r border-neutral-200 py-4 overflow-y-auto">
      {ICON_RAIL_ITEMS.map(({ key, label, Icon }) => {
        const active = key === "patients";
        return (
          <button
            key={key}
            type="button"
            title={label}
            className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-md w-14"
            style={{ color: active ? HEROIC_BLUE : "#9CA3AF", background: active ? HEROIC_BLUE_LIGHT : "transparent" }}
          >
            <Icon size={18} />
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, textAlign: "center", lineHeight: 1.1 }}>{label}</span>
          </button>
        );
      })}
    </aside>
  );
}

function EhrTopBar() {
  return (
    <header className="bg-white border-b border-neutral-200 h-14 flex items-center px-4 sm:px-6 gap-4 flex-shrink-0">
      <HeroicEhrLogo />
      <div className="flex-1 flex items-center gap-2 max-w-md ml-4">
        <Search size={16} className="text-neutral-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search Patient by Name / ID"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400"
          aria-label="Search patient by name or ID"
          readOnly
        />
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="font-medium text-neutral-700">Dr. Sarah Chen</span>
          <ChevronDown size={14} className="text-neutral-400" />
        </div>
        <button className="relative text-neutral-500 hover:text-neutral-700" aria-label="Notifications">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full" aria-hidden="true" />
        </button>
        <button className="text-neutral-500 hover:text-neutral-700" aria-label="Settings">
          <Settings size={18} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: HEROIC_BLUE_LIGHT, color: HEROIC_BLUE }}
        >
          SC
        </div>
      </div>
    </header>
  );
}

function computeAge(dob: string): number | null {
  const parts = dob.split("/");
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map((p) => parseInt(p, 10));
  if (!m || !d || !y) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthdayThisYear = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

function PatientBanner() {
  const patientName = usePatientStore((s) => s.patientName);
  const patientDob = usePatientStore((s) => s.patientDob);
  const phone = usePatientStore((s) => s.phone);
  const caseNumber = usePatientStore((s) => s.caseNumber);
  const age = computeAge(patientDob);

  const fields = [
    { label: "Allergies", value: "NKDA" },
    { label: "Visits", value: "Last: Today · Next: —" },
    { label: "Wt / BMI", value: "—" },
    { label: "Balance Due", value: "$0.00" },
  ];

  return (
    <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex-shrink-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: HEROIC_BLUE_LIGHT, color: HEROIC_BLUE }}
          >
            <Users size={20} />
          </div>
          <div>
            <p className="text-base font-bold text-neutral-900 leading-tight">{patientName}</p>
            <p className="text-xs text-neutral-500 leading-tight mt-0.5">
              {age !== null ? `Age ${age} · ` : ""}DOB {patientDob} · ID PAT-{caseNumber} · Ph {phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-neutral-400 font-semibold uppercase tracking-wide" style={{ fontSize: 10 }}>{f.label}</p>
              <p className="text-neutral-700 mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-neutral-100">
        <p className="text-xs text-neutral-500">
          Provider: <span className="text-neutral-700 font-medium">Sarah Chen, MD</span>
          <span className="mx-2 text-neutral-300">|</span>
          Date: <span className="text-neutral-700 font-medium">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
          </span>
          <span className="mx-2 text-neutral-300">|</span>
          Facility: <span className="text-neutral-700 font-medium">Heroic EHR — Main Clinic</span>
        </p>
        <div className="flex items-center gap-2">
          {["Save", "Preview", "Sign", "Print"].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              title="Not part of this demo"
              className="text-xs font-semibold px-3 py-1.5 rounded border border-neutral-200 text-neutral-400 cursor-default"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartTabs({ active, onChange }: { active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex items-center gap-6 border-b border-neutral-200 px-4 sm:px-6 bg-white flex-shrink-0 overflow-x-auto">
      {CHART_TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className="py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors"
            style={{ color: isActive ? HEROIC_BLUE : "#6F7276", borderBottomColor: isActive ? HEROIC_BLUE : "transparent" }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function PlanNav({ active, onChange }: { active: string; onChange: (k: string) => void }) {
  return (
    <nav className="hidden sm:block w-[200px] flex-shrink-0 border-r border-neutral-200 py-4 px-3 overflow-y-auto">
      {PLAN_NAV_GROUPS.map((group) => (
        <div key={group.group} className="mb-4">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide px-2 mb-1">{group.group}</p>
          {group.items.map((item) => {
            const isActive = item.key === active;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChange(item.key)}
                className="block w-full text-left px-2 py-1.5 rounded text-sm"
                style={{
                  color: isActive ? HEROIC_BLUE : "#374151",
                  fontWeight: isActive ? 700 : 400,
                  background: isActive ? HEROIC_BLUE_LIGHT : "transparent",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function RecTabsRow({ active, onChange }: { active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex items-center gap-5 border-b border-neutral-200 px-1 mb-4 overflow-x-auto">
      {REC_TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className="pb-2 text-sm whitespace-nowrap border-b-2 transition-colors"
            style={{
              color: isActive ? HEROIC_BLUE : "#6F7276",
              fontWeight: isActive ? 700 : 500,
              borderBottomColor: isActive ? HEROIC_BLUE : "transparent",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div style={{ padding: "48px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
      No {label.toLowerCase()} on file for this demo.
    </div>
  );
}

function RxToolbar({ canAddRx, onAddRx }: { canAddRx: boolean; onAddRx: () => void }) {
  const items = ["PDMP", "Add Rx", "Templates", "Sign", "Past Rx", "Transmit"];
  const nodes: JSX.Element[] = [];
  items.forEach((item, i) => {
    if (i > 0) nodes.push(<span key={`sep-${i}`} className="text-neutral-200">|</span>);
    if (item === "Add Rx") {
      nodes.push(
        <button
          key="add-rx"
          type="button"
          onClick={onAddRx}
          disabled={!canAddRx}
          className="font-semibold"
          style={{ color: canAddRx ? HEROIC_BLUE : "#C4C4C4", cursor: canAddRx ? "pointer" : "not-allowed", background: "none", border: "none", padding: 0 }}
        >
          Add Rx
        </button>
      );
    } else {
      nodes.push(
        <span key={item} className="text-neutral-300 select-none" title="Not part of this demo">
          {item}
        </span>
      );
    }
  });
  return <div className="flex items-center gap-2 text-sm mb-4 flex-wrap">{nodes}</div>;
}

function EhrChartShell({
  children,
  canAddRx,
  onAddRx,
}: {
  children: React.ReactNode;
  canAddRx: boolean;
  onAddRx: () => void;
}) {
  const [chartTab, setChartTab] = useState("physician-notes");
  const [planItem, setPlanItem] = useState("recommendations");
  const [recTab, setRecTab] = useState("prescriptions");

  const chartTabLabel = CHART_TABS.find((t) => t.key === chartTab)?.label ?? "";
  const planItemLabel = PLAN_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === planItem)?.label ?? "";
  const recTabLabel = REC_TABS.find((t) => t.key === recTab)?.label ?? "";

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <EhrTopBar />
      <div className="flex flex-1 min-h-0">
        <EhrIconRail />
        <div className="flex-1 flex flex-col min-w-0">
          <PatientBanner />
          <ChartTabs active={chartTab} onChange={setChartTab} />
          {chartTab !== "physician-notes" ? (
            <div className="flex-1 overflow-auto px-6">
              <PlaceholderPanel label={chartTabLabel} />
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <PlanNav active={planItem} onChange={setPlanItem} />
              <div className="flex-1 overflow-auto px-6 py-4">
                {planItem !== "recommendations" ? (
                  <PlaceholderPanel label={planItemLabel} />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <h2 className="text-base font-bold text-neutral-800">Recommendations</h2>
                      <p className="text-xs font-semibold text-red-500">** This data will be shared with the patient.</p>
                    </div>
                    <RecTabsRow active={recTab} onChange={setRecTab} />
                    {recTab !== "prescriptions" ? (
                      <PlaceholderPanel label={recTabLabel} />
                    ) : (
                      <>
                        <RxToolbar canAddRx={canAddRx} onAddRx={onAddRx} />
                        {children}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PA info summary ───────────────────────────────────────────────────────────

function PaSummaryTable({ isSubmitted = false, accentColor = "#007178" }: { isSubmitted?: boolean; accentColor?: string } = {}) {
  const patientName = usePatientStore((s) => s.patientName);
  const patientDob = usePatientStore((s) => s.patientDob);
  const drugName = usePatientStore((s) => s.drugName);
  const payer = usePatientStore((s) => s.payer);

  const paInfoItems = [
    { label: "MEDICATION",          value: `${drugName} • NDC: 72266-0180-30`,   done: true },
    { label: "MEDICATION DETAILS",  value: "18 mg · 30-day supply",                            done: true },
    { label: "PATIENT",             value: `${patientName} • ${patientDob}`,                         done: true },
    { label: "PRESCRIBER",          value: "Sarah Chen, MD",                                   done: true },
    { label: "INSURANCE",           value: payer,                  done: true },
    { label: "PRIOR AUTHORIZATION", value: isSubmitted ? "Submitted" : "Electronic Questions Found", done: isSubmitted },
  ];

  return (
    <div className="pa-summary-table">
      {paInfoItems.map((item) => (
        <div key={item.label} className="pa-summary-row">
          <div className="pa-summary-row__label">
            {item.done ? <CheckedCircleIcon color={accentColor} /> : <UncheckedCircleIcon />}
            <span className="pa-summary-label-text">{item.label}</span>
          </div>
          <p className="pa-summary-row__value">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Radio question ────────────────────────────────────────────────────────────

function RadioQuestion({
  question,
  value,
  onChange,
  accentColor = "#007178",
}: {
  question: string;
  value: string | null;
  onChange: (v: string) => void;
  accentColor?: string;
}) {
  return (
    <div className="pa-question">
      <p className="pa-question__text">{question}</p>
      <div className="pa-question__options">
        <label className="pa-radio-option">
          <button
            type="button"
            onClick={() => onChange("yes")}
            className="pa-radio-btn"
            aria-pressed={value === "yes"}
          >
            {value === "yes" ? <RadioCheckedIcon color={accentColor} /> : <RadioUncheckedIcon />}
          </button>
          <span className="pa-radio-label">Yes</span>
        </label>
        <label className="pa-radio-option">
          <button
            type="button"
            onClick={() => onChange("no")}
            className="pa-radio-btn"
            aria-pressed={value === "no"}
          >
            {value === "no" ? <RadioCheckedIcon color={accentColor} /> : <RadioUncheckedIcon />}
          </button>
          <span className="pa-radio-label">No</span>
        </label>
      </div>
    </div>
  );
}

// ── Email step ────────────────────────────────────────────────────────────────

function EmailStep({ onClickLink }: { onClickLink: () => void }) {
  return (
    <main className="provider-content">
      <div className="email-container">
        <div className="email-client">
          <div className="email-header">
            <div className="email-header__meta">
              <p className="email-meta__label">From:</p>
              <p className="email-meta__value">no-reply@assistrx.com</p>
            </div>
            <div className="email-header__meta">
              <p className="email-meta__label">Sent:</p>
              <p className="email-meta__value">{dateFromToday(-3).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} 1:23 PM</p>
            </div>
            <div className="email-header__meta">
              <p className="email-meta__label">To:</p>
              <p className="email-meta__value">Sarah Chen, MD</p>
            </div>
            <div className="email-header__meta">
              <p className="email-meta__label">Subject:</p>
              <p className="email-meta__value">Action Required - Prior Authorization Submittal</p>
            </div>
          </div>

          <div className="email-body">
            <div className="email-logo">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F3a7a98e156014cee98b701ac84c6fa2c?format=webp&width=800&height=1200"
                alt="AssistRx Logo"
                style={{ maxWidth: "200px", height: "auto", marginBottom: "8px" }}
              />
            </div>

            <div className="email-content">
              <p className="email-greeting">Dear Dr. Chen,</p>

              <p className="email-paragraph">
                AssistRx has received your request to process a prior authorization for one of your patients. The patient's insurer requires a prior authorization (PA) submitted by their healthcare provider.
              </p>

              <p className="email-paragraph">
                An electronic PA request form has been automated and prepared for you by AssistRx. To complete and submit the PA follow these simple steps:
              </p>

              <ol className="email-list">
                <li className="email-list-item">
                  Click <a href="#" className="email-link" onClick={(e) => { e.preventDefault(); onClickLink(); }}>HERE</a> to be redirected to our PA request form, powered by AssistRx.
                </li>
                <li className="email-list-item">
                  Input your NPI and follow the instructions on the form to complete the submission.
                </li>
              </ol>

              <p className="email-note">
                *Your NPI is required to protect against fraudulent activity and to ensure only active prescribers can submit PAs.
              </p>

              <p className="email-paragraph email-paragraph--highlight">
                This link expires on {dateFromToday(5).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}.
              </p>

              <p className="email-paragraph">
                If you are having any issues with this process or need to request a new link, please contact AssistRx at 1-866-424-6935.
              </p>
            </div>
          </div>

          <div className="email-footer">
            If you'd like to unsubscribe and stop receiving these emails <a href="#" className="email-footer-link">click here</a>.
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Step 1: Login ─────────────────────────────────────────────────────────────

function LoginStep({
  onSubmit,
  isLockScreen = false,
}: {
  onSubmit: () => void;
  /**
   * WF1/WF2 now use this same screen as their default/starting screen (a
   * generic provider lock screen, reached before any actual PA request
   * exists) instead of only reaching it after EmailStep. In that context,
   * "a prior authorization form has been requested" isn't true yet, so this
   * drops the eyebrow + first description line that reference Prior Auth.
   * CoA_DTP's own call site (reached only after its real PA-request email)
   * doesn't pass this, so its copy is unchanged.
   */
  isLockScreen?: boolean;
}) {
  const [npi, setNpi] = useState("");
  const [pin, setPin] = useState("");

  const canSubmit = npi.trim().length > 0 && pin.trim().length > 0;

  const fillDemoValues = () => {
    setNpi("3299879499");
    setPin("05367975");
  };

  return (
    <main className="provider-content">
      {!isLockScreen && <p className="pa-eyebrow">PRIOR AUTHORIZATION</p>}
      <h1 className="pa-login-heading">
        {isLockScreen ? "Welcome" : (<>Verify<br />&amp; Complete</>)}
      </h1>
      {!isLockScreen && (
        <p className="pa-login-description">
          A request has been made for your office to complete a prior authorization form for one of your patients.
        </p>
      )}
      <p className="pa-login-description">
        Please enter your provider NPI and the associated security PIN{!isLockScreen && " to access and complete this request"}
      </p>

      <div className="pa-fields">
        <div className="pa-field">
          <button
            type="button"
            onClick={fillDemoValues}
            className="pa-field__label"
          >
            NPI
          </button>
          <input
            type="text"
            value={npi}
            onChange={(e) => setNpi(e.target.value)}
            className="pa-field__input"
            placeholder=""
          />
          <div className={`pa-field__underline ${npi ? "pa-field__underline--active" : ""}`} />
        </div>

        <div className="pa-field">
          <label className="pa-field__label">PIN</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="pa-field__input"
            placeholder=""
          />
          <div className={`pa-field__underline ${pin ? "pa-field__underline--active" : ""}`} />
        </div>
      </div>

      <div className="pa-action-row">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="pa-btn-primary"
        >
          Submit
        </button>
      </div>
    </main>
  );
}

// ── Step 2: PA Review (first question) ────────────────────────────────────────

function PaReviewStep({ onNext }: { onNext: () => void }) {
  const [q1, setQ1] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Electronic Prior Authorization</p>
      <PaSummaryTable />

      <div className="pa-questions-section">
        <RadioQuestion
          question="Does the patient have a confirmed diagnosis of Idiopathic Pulmonary Fibrosis (IPF)?"
          value={q1}
          onChange={setQ1}
        />

        <div className="pa-comments-field">
          <label className="pa-comments-label">Comments:</label>
          <input
            type="text"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="pa-comments-input"
          />
          <div className="pa-field__underline" />
        </div>
      </div>

      <div className="pa-action-row">
        <button onClick={onNext} className="pa-btn-secondary">
          Save
        </button>
      </div>
    </main>
  );
}

// ── Step 3: PA Questions (multi-question with nav) ────────────────────────────

function PaQuestionsStep({ onBack, onCancel, onNext, isCoA = false }: { onBack: () => void; onCancel: () => void; onNext: () => void; isCoA?: boolean }) {
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [q3, setQ3] = useState<string | null>(null);
  const dispatch = useWorkflowDispatch();
  const drugName = usePatientStore((s) => s.drugName);
  const payer = usePatientStore((s) => s.payer);

  function handleNext() {
    dispatch('SUBMIT_PA', { source: 'provider_portal', portal: 'provider' });
    onNext();
  }

  const questions = (
    <div className="pa-questions-section">
      <RadioQuestion
        question="Does the patient have a confirmed diagnosis of obesity or chronic weight management condition?"
        value={q1}
        onChange={setQ1}
        accentColor={isCoA ? HEROIC_BLUE : undefined}
      />
      <RadioQuestion
        question="Has the patient tried and failed therapy with other weight loss medications or lifestyle modifications?"
        value={q2}
        onChange={setQ2}
        accentColor={isCoA ? HEROIC_BLUE : undefined}
      />
      <RadioQuestion
        question="Is the patient's current BMI ≥ 30 kg/m² or ≥ 27 kg/m² with weight-related complications?"
        value={q3}
        onChange={setQ3}
        accentColor={isCoA ? HEROIC_BLUE : undefined}
      />
    </div>
  );

  // CoA_DTP renders inline inside the Recommendations > Prescriptions panel
  // (see EhrChartShell/CoaProviderExperience) instead of as its own page, so
  // it gets a lighter wrapper with no duplicate patient-identity block — the
  // chart's PatientBanner already shows that. Every other flow keeps the
  // original full-page markup below, untouched.
  if (isCoA) {
    return (
      <div>
        <p style={{ fontSize: 13, color: "#6F7276", margin: "0 0 20px 0" }}>
          The payer requires a prior authorization before <strong>{drugName}</strong> can be dispensed. Insurance: {payer}
        </p>
        {questions}
        <div className="pa-nav-row" style={{ marginTop: 24 }}>
          <button onClick={onCancel} className="pa-btn-tertiary">Cancel</button>
          <div className="pa-nav-actions">
            <button onClick={onBack} className="pa-btn-secondary pa-btn-secondary--heroic">Back</button>
            <button onClick={handleNext} className="pa-btn-primary pa-btn-primary--heroic">Next</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Electronic Prior Authorization</p>
      {questions}
      <PaSummaryTable />
      <div className="pa-nav-row">
        <button onClick={onCancel} className="pa-btn-tertiary">Cancel</button>
        <div className="pa-nav-actions">
          <button onClick={onBack} className="pa-btn-secondary">Back</button>
          <button onClick={handleNext} className="pa-btn-primary">Next</button>
        </div>
      </div>
    </main>
  );
}

// ── Step 4: PA Submitted confirmation ───────────────────────────────────────

function PaSubmittedStep({ onDone, isCoA = false }: { onDone: () => void; isCoA?: boolean }) {
  const dispatch = useWorkflowDispatch();

  const handleDone = () => {
    dispatch('COMPLETE_PROVIDER_PA', { portal: 'provider' });
    onDone();
  };

  // Same rationale as PaQuestionsStep above: CoA_DTP gets a lighter, chart-
  // embedded confirmation; every other flow keeps its original full page.
  if (isCoA) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <svg width="56" height="56" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto" }}>
          <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill={HEROIC_BLUE} />
        </svg>
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 18, fontWeight: 700, color: "#1C1C1C" }}>
          PA Submitted
        </h2>
        <p style={{ color: "#6F7276", fontSize: 14, marginBottom: 24 }}>
          The prior authorization has been submitted successfully. The patient will be notified once a decision is made.
        </p>
        <button onClick={handleDone} className="pa-btn-secondary pa-btn-secondary--heroic">Done</button>
      </div>
    );
  }

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Electronic Prior Authorization</p>
      <PaSummaryTable isSubmitted={true} />
      <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
        <svg width="64" height="64" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto" }}>
          <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill="#007178" />
        </svg>
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 20, fontWeight: 700, color: "#1C1C1C" }}>
          PA Submitted
        </h2>
        <p style={{ color: "#6F7276", fontSize: 14, marginBottom: 32 }}>
          The prior authorization has been submitted successfully. The patient will be notified once a decision is made.
        </p>
        <button onClick={handleDone} className="pa-btn-secondary">Done</button>
      </div>
    </main>
  );
}

// ── Income verification step ──────────────────────────────────────────────────

function IncomeVerifyStep({ onBack, onCancel, onNext }: { onBack: () => void; onCancel: () => void; onNext: () => void }) {
  const dispatch = useWorkflowDispatch();
  const patientName = usePatientStore((s) => s.patientName);

  function handleSubmit() {
    dispatch('VERIFY_INCOME', { portal: 'provider' });
    onNext();
  }

  return (
    <main className="provider-content provider-content--pa">
      <p className="pa-section-title">Income Verification — CoA Direct to Patient</p>
      <PaSummaryTable accentColor={HEROIC_BLUE} />

      <div className="pa-questions-section">
        <p style={{ fontSize: 13, color: "#3e3e3c", marginBottom: 16 }}>
          Confirm that <strong>{patientName}</strong> meets income eligibility requirements for the Jascayd free drug program. The program covers patients whose household income qualifies them for assistance.
        </p>

        <div className="pa-question">
          <p className="pa-question__text">Has the patient's household income been verified as eligible for the CoA program?</p>
          <div className="pa-question__options">
            <label className="pa-radio-option">
              <button type="button" className="pa-radio-btn" aria-pressed="true" style={{ cursor: "default" }}>
                <RadioCheckedIcon color={HEROIC_BLUE} />
              </button>
              <span className="pa-radio-label">Yes — Patient confirmed eligible</span>
            </label>
          </div>
        </div>

        <div className="pa-comments-field" style={{ marginTop: 16 }}>
          <label className="pa-comments-label">Clinical notes (optional):</label>
          <input type="text" className="pa-comments-input" placeholder="e.g. Income documentation reviewed" />
          <div className="pa-field__underline" />
        </div>
      </div>

      <div className="pa-nav-row">
        <button onClick={onCancel} className="pa-btn-tertiary">Cancel</button>
        <div className="pa-nav-actions">
          <button onClick={onBack} className="pa-btn-secondary pa-btn-secondary--heroic">Back</button>
          <button onClick={handleSubmit} className="pa-btn-primary pa-btn-primary--heroic">Submit Verification</button>
        </div>
      </div>
    </main>
  );
}

// ── Heroic EHR Dashboard (WF3 start/end screen) ───────────────────────────────
//
// Replaces the old bare "Search Patient" screen. Represents the HCP's own
// Heroic EHR system, so it gets the Heroic blue palette, not CoAssist's teal.
// Same dashboard pattern as IAssistDashboard below (that one's WF4-only —
// left untouched here, this is a separate component so WF4 can't be
// affected by anything in this file).
// The search box filters the visible Patients table directly rather than a
// dropdown overlay, since the point here is "type until only the patient you
// want remains, then click their row" — matching the fact that only one row
// (Keanu Dixon) is actually wired to real patient data via usePersonaState.
//
// Only patients with an active Rx show up by default — Keanu starts with
// none (CoaRxForm is what creates his eRx), so he's hidden from the default
// view but still findable by name/DOB search. Once ENROLL fires (eRx sent),
// his real workflow state — not static demo data like everyone else's row —
// drives his status, and he moves to the top of the default list.

function deriveKeanuStatus(workflowData: WorkflowData): PatientStatus | null {
  if (workflowData.enrollmentStatus === "none") return null;

  if (workflowData.pharmacyStatus === "delivered") {
    return { label: "Delivered", color: "success", dots: ["completed", "completed", "completed", "completed", "completed", "completed"] };
  }
  if (workflowData.pharmacyStatus === "shipped" ||
      workflowData.pharmacyStatus === "processing" ||
      workflowData.pharmacyStatus === "ready") {
    return { label: "Dispensing", color: "warning", dots: ["completed", "completed", "completed", "completed", "pending", "disabled"] };
  }
  if (workflowData.paStatus === "approved") {
    return { label: "PA Approved", color: "success", dots: ["completed", "completed", "completed", "completed", "pending", "disabled"] };
  }
  // Denial → cash-pay is kept in the state machine for demo flexibility, but
  // CoA_DTP's live flow always approves (see coaDtp.ts / CRM Index.tsx), so
  // this is unreachable today.
  if (workflowData.paStatus === "denied") {
    return { label: "PA Denied", color: "error", dots: ["completed", "completed", "completed", "attention", "disabled", "disabled"] };
  }
  if (workflowData.paStatus === "submitted") {
    return { label: "PA Submitted", color: "warning", dots: ["completed", "completed", "completed", "pending", "disabled", "disabled"] };
  }
  // BI came back needing a PA, but the provider hasn't started it yet — the
  // "Start Prior Auth" button in PrescriptionsIdlePanel takes the HCP
  // straight into PA questions (no email/login hop, unlike WF1).
  if (workflowData.biStatus === "complete") {
    return { label: "PA Required", color: "warning", dots: ["completed", "completed", "pending", "disabled", "disabled", "disabled"] };
  }
  return { label: "Enrolled", color: "warning", dots: ["completed", "pending", "disabled", "disabled", "disabled", "disabled"] };
}

function StatusDots({ dots }: { dots: PatientStatus["dots"] }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 border border-neutral-300 rounded-full bg-white w-fit">
      {dots.map((d, i) => (
        <StatusDot key={i} color={d} />
      ))}
    </div>
  );
}

// Resting state of the Recommendations > Prescriptions panel — shown when
// there's no in-progress form. Mirrors a real EHR's "No recommended
// prescriptions" empty state until Keanu's eRx exists, then shows the drug
// with its live status (derived straight from workflowData, same source
// every other CoA_DTP portal reads) and, once a PA is actually required, a
// button to start it.
function PrescriptionsIdlePanel({
  status,
  pharmacy,
  onStartPA,
}: {
  status: PatientStatus | null;
  pharmacy: PharmacyOption | null;
  onStartPA: () => void;
}) {
  const drugName = usePatientStore((s) => s.drugName);

  if (!status) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
        No recommended prescriptions
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4"
      style={{ padding: 16, border: "1px solid #E5E7EB", borderRadius: 8 }}
    >
      <div>
        <p style={{ fontWeight: 700, fontSize: 14, color: "#1C1C1C", margin: "0 0 4px 0" }}>{drugName}</p>
        <p style={{ fontSize: 12, color: "#6F7276", margin: 0 }}>Ordering Provider: Sarah Chen, MD</p>
        {pharmacy && (
          <p style={{ fontSize: 12, color: "#6F7276", margin: "2px 0 0 0" }}>Dispensing Pharmacy: {pharmacy.name}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <StatusDots dots={status.dots} />
        <StatusBadge status={status.label} color={status.color} />
        {status.label === "PA Required" && (
          <button onClick={onStartPA} className="pa-btn-primary pa-btn-primary--heroic">
            Start Prior Auth
          </button>
        )}
      </div>
    </div>
  );
}

// Composes the chart shell with whichever CoA_DTP step is active. This is
// the only place that mounts EhrChartShell, and it's only ever rendered when
// flowType === "CoA_DTP" (see the isCoA branch in ProviderPortal below) — so
// none of this reaches WF1/WF2/WF4.
// ── WF5 (PrES_PAP) provider experience ──────────────────────────────────────
//
// Rebuilt to follow the real reference screens the user provided for this
// flow (an "Advancing Access"-style PAP/MAP intake tool): Drug confirmation
// -> Patient Information -> Prescriber Search (results / no-results / add
// manually) -> Patient Consent (who's authorizing, health-info authorization,
// applicant declarations, text/communication preferences, e-signature) ->
// Insurance Eligibility Check -> Financial Information (income + proof-of-
// income upload) -> Thank You. Content/copy is genericized to this shell's
// own AssistRx/Assistivan branding rather than the reference's literal
// Gilead trademarked text.
//
// Two deliberate deviations from the reference, both scoped down rather than
// silently dropped:
//   - The reference's page order puts Insurance before Consent; this shell's
//     shared presPap.ts machine only lets BI (the mechanic this step reuses)
//     run after CONFIRM_CONSENT, so Insurance stays after Consent here
//     rather than reordering the machine's own gating.
//   - The reference's insurance-check has a "found active commercial
//     coverage -> denied" branch. This shell's CRM always resolves PAP/MAP
//     flows' biResult to 'no_insurance' (see WorkflowEngine.ts's isPapFlow
//     handling) — there's no real state that could ever produce a denial
//     here, so that branch isn't built; every WF5 provider application in
//     this demo reaches the same "no active coverage found" outcome.
//
// Local `step` state (not a router) matches this file's existing convention
// for provider-side flows (see CoaProviderExperience) rather than the
// patient portal's path-based, continuously state-driven navigation.
function computeInitialPresProviderStep(workflowData: WorkflowData): Step {
  if (workflowData.enrollmentStatus === 'none') return 'pres-home';
  if (workflowData.consentStatus === 'pending') return 'pres-patient-info';
  // Covers both "still checking" and "check finished, hasn't clicked
  // Continue yet" — pres-insurance itself picks the right sub-view from
  // biStatus. Routing straight to pres-financial once biStatus happens to
  // already be 'complete' (e.g. a remount after switching demo shell tabs)
  // would skip the "no insurance found" result the provider is otherwise
  // shown live, so this stays on pres-insurance until incomeStatus moves.
  if (workflowData.consentStatus === 'confirmed' && workflowData.incomeStatus !== 'verified') return 'pres-insurance';
  return 'pres-complete';
}

interface MockPrescriber {
  name: string;
  npi: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

// Deterministic mock results so the same search always looks the same in a
// demo — no backend NPI registry to call. A very short last name (<2 chars)
// simulates the "no results found" screen, matching the reference's own
// dedicated empty-state design without needing a real lookup to fail against.
// Same wording as the patient portal's own consent screen
// (client/portals/patient/pages/PesConsent.tsx's HEALTH_INFO_CONSENT /
// PRIVACY_CONSENT / CALLS_CONSENT) so both portals present identical legal
// language — duplicated here rather than imported since this file can't
// reach across portal boundaries (see PesHome.tsx's programName prop for
// the same constraint). APPLICANT_DECLARATIONS_TEXT additionally folds in
// what the patient's flow shows as its own PesPapTerms.tsx screen.
function getHealthInfoConsentText(drugName: string) {
  return `By signing this form, I give my permission for my physicians, pharmacies, laboratories, and other healthcare providers ("Healthcare Providers") and my health insurers to share my health information with the organization administering the ${drugName} Patient Assistance Program and its vendors and affiliates. This authorization will expire one (1) year from the date I sign below. I understand I have the right to revoke this authorization at any time by contacting the program administrator.`;
}
const APPLICANT_DECLARATIONS_TEXT = `By signing below, I certify that all information provided in this application, including household income, is complete and accurate. I understand that program assistance will terminate if AssistRx becomes aware of any false or inaccurate information, or if this medication is no longer prescribed for the patient. Free product received through this program is for the patient's own use only and may not be sold, resold, bartered, or traded. Completing this application does not guarantee eligibility. AssistRx reserves the right to modify or discontinue this program, or the terms of this application, at any time without notice.`;
const TEXT_MESSAGE_AUTH_TEXT = `By providing a mobile number and agreeing below, the patient agrees to receive calls and texts from the program administrator or parties acting on its behalf to determine eligibility, provide benefits verification, financial assistance resources, refill reminders, and other support services. Message and data rates may apply. The patient may opt out at any time.`;

function PresConsentText({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      maxHeight: 140, overflowY: "auto", border: "1px solid #E0E0E0", borderRadius: 8,
      padding: 12, fontSize: 12, color: "#4B4B4B", lineHeight: 1.6, background: "#FAFAFA",
      marginTop: 8, marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function PresConsentCheckbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#1C1C1C", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
      <span>{children}</span>
    </label>
  );
}

function searchMockPrescribers(lastName: string, city: string, state: string): MockPrescriber[] {
  if (lastName.trim().length < 2) return [];
  const firstNames = ["Sarah", "James", "Linda"];
  return [0, 1].map((i) => ({
    name: `Dr. ${firstNames[i]} ${lastName.trim()}`,
    npi: `18${(9234561 + i * 37).toString().padStart(8, "0")}`,
    address1: `${120 + i * 40} Main Street${i === 1 ? ", Suite 200" : ""}`,
    city: city.trim() || "Springfield",
    state: state.trim() || "TX",
    zip: `7500${i}`,
    phone: `(555) 123-45${67 + i}`,
  }));
}

function PresField({ label, value, onChange, type = "text", onLabelClick }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
  /**
   * Optional convenience fill, same pattern as LoginStep's NPI label
   * elsewhere in this file (line ~709: `<button className="pa-field__label"
   * onClick={fillDemoValues}>`) — the label itself becomes the click
   * target, reusing the exact same "pa-field__label" class so it still
   * looks like a plain label (bold, dark, no underline/blue link styling),
   * not a hyperlink.
   */
  onLabelClick?: () => void;
}) {
  return (
    <div className="pa-field">
      {onLabelClick ? (
        <button type="button" onClick={onLabelClick} className="pa-field__label">{label}</button>
      ) : (
        <label className="pa-field__label">{label}</label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pa-field__input"
      />
      <div className={`pa-field__underline ${value ? "pa-field__underline--active" : ""}`} />
    </div>
  );
}

function PresYesNo({ question, value, onChange }: {
  question: string; value: 'Yes' | 'No' | null; onChange: (v: 'Yes' | 'No') => void;
}) {
  return (
    <RadioQuestion
      question={question}
      value={value === 'Yes' ? 'yes' : value === 'No' ? 'no' : null}
      onChange={(v) => onChange(v === 'yes' ? 'Yes' : 'No')}
    />
  );
}

function PresSignatureField({ label, value, onChange, disclaimer }: {
  label: string; value: string; onChange: (v: string) => void; disclaimer: string;
}) {
  return (
    <div>
      <PresField label={label} value={value} onChange={onChange} />
      {value.trim() && (
        <p style={{ fontFamily: "cursive", fontSize: 20, color: "#1C1C1C", margin: "4px 0 0" }}>{value}</p>
      )}
      <p style={{ fontSize: 11, color: "#6F7276", marginTop: 6, lineHeight: 1.5 }}>{disclaimer}</p>
    </div>
  );
}

// Decorative — no backend to receive an upload in this demo. Mirrors the
// reference's document-upload steps (insurance card, proof of income)
// structurally: a button that toggles a fake "uploaded" state, so the step
// looks and behaves like it has this requirement without a real file picker
// that has nowhere to send its file.
function PresUploadStub({ label, hint, fileName }: { label: string; hint: string; fileName: string }) {
  const [uploaded, setUploaded] = useState(false);
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1C1C", marginBottom: 6 }}>{label}</p>
      <button type="button" className="pa-btn-secondary" style={{ fontSize: 13 }} onClick={() => setUploaded((v) => !v)}>
        {uploaded ? "Remove Document" : "Upload Document"}
      </button>
      {uploaded ? (
        <p style={{ fontSize: 12, color: "#2e844a", marginTop: 6 }}>✓ {fileName} uploaded</p>
      ) : (
        <p style={{ fontSize: 11, color: "#6F7276", marginTop: 6, lineHeight: 1.5 }}>{hint}</p>
      )}
    </div>
  );
}

function PresPapProviderExperience({
  step,
  setStep,
  dispatch,
  workflowData,
}: {
  step: Step;
  setStep: (step: Step) => void;
  dispatch: ReturnType<typeof useWorkflowDispatch>;
  workflowData: WorkflowData;
}) {
  const patient = usePatientStore();
  const updateIdentity = usePatientStore((s) => s.updateIdentity);
  const data = usePresPapStore();
  const setField = usePresPapStore((s) => s.setField);
  const drugName = usePatientStore((s) => s.drugName);
  const [selectedDrug, setSelectedDrug] = useState(drugName);
  const [signatureFullName, setSignatureFullName] = useState("");

  // Prescriber search — local UI state only; the resolved prescriber gets
  // written into presPapStore once picked or manually entered.
  const [prescriberMode, setPrescriberMode] = useState<'search' | 'results' | 'no-results' | 'manual'>('search');
  const [searchForm, setSearchForm] = useState({ firstName: "", lastName: "", city: "", state: "", phone: "" });
  const [searchResults, setSearchResults] = useState<MockPrescriber[]>([]);

  function selectPrescriber(p: MockPrescriber) {
    usePresPapStore.getState().setFields({
      prescriberName: p.name,
      prescriberNPI: p.npi,
      prescriberAddress1: p.address1,
      prescriberCity: p.city,
      prescriberState: p.state,
      prescriberZip: p.zip,
      practicePhone: p.phone,
    });
    setStep('pres-consent');
  }

  // Insurance eligibility check (pres-insurance) reads workflowData.biStatus
  // directly at render time below rather than needing an effect here — it's
  // the same real shared biStatus/biResult mechanic CRM's BI stage drives
  // for every other flow, not a separate fake field, so it stays truthful to
  // what the demo can actually simulate. See this component's header
  // comment for why there's no denial branch.

  let content: React.ReactNode;

  if (step === 'pres-home') {
    return (
      <div className="provider-portal">
        <BrandSidebar isBranded={false} />
        <main className="provider-content">
          {/*
           * PesHome uses the arx-* design tokens (--arx-slate, --arx-primary,
           * etc.), which client/global.css only defines inside ".portal-patient"
           * — the provider portal's own root div is ".provider-portal" and has
           * no equivalent scope. Wrapping just this one screen in
           * ".portal-patient" here (a plain CSS class, unrelated to routing)
           * pulls in those variable definitions so the shared screen renders
           * identically to the patient portal's own copy of it, instead of
           * falling back to unstyled/black text.
           */}
          <div className="portal-patient">
            <PesHome programName={drugName} onSelectProvider={() => setStep('pres-drug')} />
          </div>
        </main>
      </div>
    );
  }

  if (step === 'pres-drug') {
    content = (
      <>
        <p className="pa-section-title">Confirm Medication</p>
        <p style={{ fontSize: 13, color: "#6F7276", margin: "0 0 20px" }}>
          Confirm the medication this application is for before continuing.
        </p>
        <div className="pa-field" style={{ maxWidth: 320 }}>
          <label className="pa-field__label">Medication</label>
          <select
            value={selectedDrug}
            onChange={(e) => setSelectedDrug(e.target.value)}
            className="pa-field__input"
            style={{ appearance: "auto" }}
          >
            {[drugName, ...MEDICATION_MOST_COMMON, ...MEDICATION_OTHERS]
              .filter((med, i, arr) => arr.indexOf(med) === i)
              .map((med) => (
                <option key={med} value={med}>{med}</option>
              ))}
          </select>
          <div className="pa-field__underline pa-field__underline--active" />
        </div>
        <div className="pa-action-row">
          <button className="pa-btn-primary" onClick={() => setStep('pres-patient-info')}>Continue</button>
        </div>
      </>
    );
  } else if (step === 'pres-patient-info') {
    const canContinue = patient.patientName.trim() && patient.patientDob && patient.email.trim() && patient.phone.trim();

    content = (
      <>
        <p className="pa-section-title">Patient Information</p>
        <div className="pa-fields">
          <PresField label="Patient Full Name" value={patient.patientName} onChange={(v) => updateIdentity({ patientName: v })} />
          <PresField label="Date of Birth" value={patient.patientDob} onChange={(v) => updateIdentity({ patientDob: v })} />
          <PresField label="Address" value={patient.deliveryAddress} onChange={(v) => updateIdentity({ deliveryAddress: v })} />
          <PresField label="Phone" value={patient.phone} onChange={(v) => updateIdentity({ phone: v })} type="tel" />
          <PresField label="Email" value={patient.email} onChange={(v) => updateIdentity({ email: v })} type="email" />
        </div>

        <div className="pa-action-row">
          <button
            className="pa-btn-primary"
            disabled={!canContinue}
            onClick={() => {
              // Bundled the same way PesAttestation.tsx bundles it for the
              // patient's own flow — presPap.ts is unchanged, this just
              // collapses the SMS/OTP beat it was built for into one click
              // since neither portal's WF5 UI shows those screens.
              // hasPrescription is implied true by a provider submitting
              // this application at all, so it's set here rather than shown
              // as its own question (the reference has no such screen).
              setField('hasPrescription', 'Yes');
              dispatch('ENROLL', { portal: 'provider' });
              dispatch('INVITE', { portal: 'provider' });
              dispatch('VERIFY_SMS', { portal: 'provider' });
              dispatch('VERIFY_OTP', { portal: 'provider' });
              setStep('pres-prescriber');
            }}
          >
            Continue
          </button>
        </div>
      </>
    );
  } else if (step === 'pres-prescriber') {
    if (prescriberMode === 'search') {
      const canSearch = searchForm.firstName.trim() && searchForm.lastName.trim() && searchForm.city.trim() && searchForm.state.trim();
      content = (
        <>
          <p className="pa-section-title">Prescriber Information</p>
          <p style={{ fontSize: 13, color: "#6F7276", margin: "0 0 20px" }}>Search for the prescribing provider.</p>
          <div className="pa-fields">
            <PresField
              label="Prescriber First Name"
              value={searchForm.firstName}
              onChange={(v) => setSearchForm((f) => ({ ...f, firstName: v }))}
              onLabelClick={() => setSearchForm({ firstName: "Sarah", lastName: "Chen", city: "Austin", state: "TX", phone: "(512) 555-0199" })}
            />
            <PresField label="Prescriber Last Name" value={searchForm.lastName} onChange={(v) => setSearchForm((f) => ({ ...f, lastName: v }))} />
            <PresField label="City" value={searchForm.city} onChange={(v) => setSearchForm((f) => ({ ...f, city: v }))} />
            <PresField label="State" value={searchForm.state} onChange={(v) => setSearchForm((f) => ({ ...f, state: v }))} />
            <PresField label="Phone Number" value={searchForm.phone} onChange={(v) => setSearchForm((f) => ({ ...f, phone: v }))} type="tel" />
          </div>
          <div className="pa-action-row">
            <button
              className="pa-btn-primary"
              disabled={!canSearch}
              onClick={() => {
                const results = searchMockPrescribers(searchForm.lastName, searchForm.city, searchForm.state);
                setSearchResults(results);
                setPrescriberMode(results.length ? 'results' : 'no-results');
              }}
            >
              Search
            </button>
          </div>
        </>
      );
    } else if (prescriberMode === 'no-results') {
      content = (
        <>
          <p className="pa-section-title">Prescriber Information</p>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: 14, color: "#1C1C1C", fontWeight: 600, marginBottom: 8 }}>No prescribers found</p>
            <p style={{ fontSize: 13, color: "#6F7276", marginBottom: 24 }}>Try a different search, or add the prescriber manually.</p>
            <div className="pa-nav-actions" style={{ justifyContent: "center" }}>
              <button className="pa-btn-secondary" onClick={() => setPrescriberMode('search')}>Search Again</button>
              <button className="pa-btn-primary" onClick={() => setPrescriberMode('manual')}>Add Manually</button>
            </div>
          </div>
        </>
      );
    } else if (prescriberMode === 'results') {
      content = (
        <>
          <p className="pa-section-title">Prescriber Information</p>
          <p style={{ fontSize: 13, color: "#6F7276", margin: "0 0 16px" }}>Select the matching prescriber.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {searchResults.map((p) => (
              <button
                key={p.npi}
                onClick={() => selectPrescriber(p)}
                style={{ textAlign: "left", padding: 16, borderRadius: 10, border: "1px solid #E0E0E0", background: "#fff", cursor: "pointer" }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1C1C", marginBottom: 4 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: "#6F7276" }}>{p.address1}, {p.city}, {p.state} {p.zip}</p>
                <p style={{ fontSize: 12, color: "#6F7276" }}>NPI: {p.npi} · {p.phone}</p>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, marginTop: 20 }}>
            <button onClick={() => setPrescriberMode('search')} style={{ color: "#007178", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, marginRight: 16 }}>
              Search Again
            </button>
            Don't see the right prescriber?{" "}
            <button onClick={() => setPrescriberMode('manual')} style={{ color: "#007178", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Add Manually
            </button>
          </p>
        </>
      );
    } else {
      const canSave = data.prescriberName.trim() && data.prescriberNPI.trim() && data.prescriberAddress1.trim() &&
        data.prescriberCity.trim() && data.prescriberState.trim() && data.practicePhone.trim();
      content = (
        <>
          <p className="pa-section-title">Add Prescriber Manually</p>
          <div className="pa-fields">
            <PresField label="Prescriber Name" value={data.prescriberName} onChange={(v) => setField('prescriberName', v)} />
            <PresField label="NPI" value={data.prescriberNPI} onChange={(v) => setField('prescriberNPI', v)} />
            <PresField label="Address Line 1" value={data.prescriberAddress1} onChange={(v) => setField('prescriberAddress1', v)} />
            <PresField label="Address Line 2" value={data.prescriberAddress2} onChange={(v) => setField('prescriberAddress2', v)} />
            <PresField label="City" value={data.prescriberCity} onChange={(v) => setField('prescriberCity', v)} />
            <PresField label="State" value={data.prescriberState} onChange={(v) => setField('prescriberState', v)} />
            <PresField label="ZIP Code" value={data.prescriberZip} onChange={(v) => setField('prescriberZip', v)} />
            <PresField label="Phone Number" value={data.practicePhone} onChange={(v) => setField('practicePhone', v)} type="tel" />
            <PresField label="Fax Number" value={data.prescriberFax} onChange={(v) => setField('prescriberFax', v)} type="tel" />
          </div>
          <div className="pa-nav-row">
            <button className="pa-btn-tertiary" onClick={() => setPrescriberMode('search')}>Back to Search</button>
            <button className="pa-btn-primary" disabled={!canSave} onClick={() => setStep('pres-consent')}>Save &amp; Continue</button>
          </div>
        </>
      );
    }
  } else if (step === 'pres-consent') {
    const canContinue =
      data.consentAuthorizedBy &&
      (data.consentAuthorizedBy === 'Patient' || (data.representativeName.trim() && data.representativeRelationship.trim())) &&
      data.healthInfoConsent === 'Yes' &&
      data.privacyConsent === 'Yes' &&
      data.callsConsent === 'Yes' &&
      data.cellPhone.trim() &&
      signatureFullName.trim();

    content = (
      <>
        <p className="pa-section-title">Patient Consent</p>
        <p style={{ fontSize: 13, color: "#6F7276", margin: "0 0 20px" }}>
          Please provide consent on the patient's behalf to continue. If the patient is under 18, a parent or legal representative must provide consent.
        </p>

        <RadioQuestion
          question="Who is authorizing?"
          value={data.consentAuthorizedBy === 'Patient' ? 'yes' : data.consentAuthorizedBy === 'Legal Representative' ? 'no' : null}
          onChange={(v) => setField('consentAuthorizedBy', v === 'yes' ? 'Patient' : 'Legal Representative')}
        />
        {data.consentAuthorizedBy === 'Legal Representative' && (
          <div className="pa-fields" style={{ marginTop: 8, marginBottom: 16 }}>
            <PresField label="Full Name of Representative" value={data.representativeName} onChange={(v) => setField('representativeName', v)} />
            <PresField label="Relationship to Patient" value={data.representativeRelationship} onChange={(v) => setField('representativeRelationship', v)} />
          </div>
        )}

        <p className="pa-section-title" style={{ fontSize: 14, marginTop: 20, marginBottom: 0 }}>
          PATIENT AUTHORIZATION FOR USE AND DISCLOSURE OF PERSONAL HEALTH INFORMATION
        </p>
        <PresConsentText>{getHealthInfoConsentText(drugName)}</PresConsentText>
        <PresConsentCheckbox checked={data.healthInfoConsent === 'Yes'} onChange={(v) => setField('healthInfoConsent', v ? 'Yes' : 'No')}>
          By checking this box, I acknowledge that I have read and understand the Patient Authorization for Use and Disclosure of Personal Health Information.
        </PresConsentCheckbox>

        {/* Folds in what the patient's own flow shows as a separate PAP Terms
            screen (PesPapTerms.tsx) — the reference material bundles the
            equivalent "Applicant Consent and Declarations" into this same
            page rather than a standalone step, so this does too. Setting
            agreePAPTerms alongside privacyConsent here (rather than as its
            own checkbox) is what keeps that equivalence — same signal, one
            fewer redundant checkbox for the provider to click. */}
        <p className="pa-section-title" style={{ fontSize: 14, marginTop: 20, marginBottom: 0 }}>APPLICANT CONSENT AND DECLARATIONS</p>
        <PresConsentText>{APPLICANT_DECLARATIONS_TEXT}</PresConsentText>
        <PresConsentCheckbox
          checked={data.privacyConsent === 'Yes'}
          onChange={(v) => { setField('privacyConsent', v ? 'Yes' : 'No'); setField('agreePAPTerms', v ? 'Yes' : 'No'); }}
        >
          By checking this box, I acknowledge that I have read and understand the Applicant Consent and Declarations.
        </PresConsentCheckbox>

        <p className="pa-section-title" style={{ fontSize: 14, marginTop: 20, marginBottom: 0 }}>TEXT MESSAGE AUTHORIZATION</p>
        <PresConsentText>{TEXT_MESSAGE_AUTH_TEXT}</PresConsentText>
        <PresConsentCheckbox checked={data.callsConsent === 'Yes'} onChange={(v) => setField('callsConsent', v ? 'Yes' : 'No')}>
          By checking this box, I agree to receive pharmacy-related text messages as described above.
        </PresConsentCheckbox>
        <div style={{ maxWidth: 320, marginTop: 12 }}>
          <PresField label="Patient Cell Phone Number" value={data.cellPhone} onChange={(v) => setField('cellPhone', v)} type="tel" />
        </div>

        <div style={{ marginTop: 24, maxWidth: 320 }}>
          <PresField label="Full Name" value={signatureFullName} onChange={setSignatureFullName} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1C1C", marginTop: 16, marginBottom: 8 }}>Signature Preview</p>
        <div style={{ maxWidth: 320, padding: "16px 14px", borderRadius: 8, border: "1px solid #E0E0E0", background: "#fff" }}>
          <p style={{ fontFamily: "cursive", fontSize: 24, color: signatureFullName.trim() ? "#1C1C1C" : "#B0B0B0" }}>
            {signatureFullName.trim() || "Patient Name"}
          </p>
        </div>

        <div className="pa-action-row">
          <button
            className="pa-btn-primary"
            disabled={!canContinue}
            onClick={() => {
              // The store still models one signature per consent section
              // (shared with the patient's own PesConsent.tsx data shape) —
              // this page collects the name once and applies it to all
              // three, rather than asking the provider to retype it.
              usePresPapStore.getState().setFields({
                healthInfoSignature: signatureFullName,
                privacySignature: signatureFullName,
                callsSignature: signatureFullName,
              });
              dispatch('CONFIRM_CONSENT', { portal: 'provider' });
              setStep('pres-insurance');
            }}
          >
            Continue
          </button>
        </div>
      </>
    );
  } else if (step === 'pres-insurance') {
    const checking = workflowData.biStatus !== 'complete';
    content = (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        {checking ? (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1C1C1C", marginBottom: 8 }}>Checking Insurance Eligibility</h2>
            <p style={{ fontSize: 14, color: "#6F7276" }}>
              AssistRx is running an automated eligibility check for the patient. This screen will advance automatically once it's complete.
            </p>
          </>
        ) : (
          <>
            <svg width="48" height="48" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto 12px" }}>
              <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill="#007178" />
            </svg>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1C1C1C", marginBottom: 8 }}>No Active Commercial Insurance Found</h2>
            <p style={{ fontSize: 14, color: "#6F7276", maxWidth: 420, margin: "0 auto 20px" }}>
              The patient appears uninsured and may qualify for the Patient Assistance Program. Continue to financial information.
            </p>
            <button className="pa-btn-primary" onClick={() => setStep('pres-financial')}>Continue</button>
          </>
        )}
      </div>
    );
  } else if (step === 'pres-financial') {
    const canContinue =
      data.incomeConsent === 'Yes' && data.incomeSignature.trim() &&
      data.householdSize.trim() && data.annualHouseholdIncome.trim();

    content = (
      <>
        <p className="pa-section-title">Financial Information</p>
        <PresYesNo question="Authorization for Electronic Income Verification — does the patient agree?" value={data.incomeConsent} onChange={(v) => setField('incomeConsent', v)} />
        <PresSignatureField label="Signature" value={data.incomeSignature} onChange={(v) => setField('incomeSignature', v)} disclaimer="Certifies the patient has read and agreed to income verification." />

        <div className="pa-fields" style={{ marginTop: 8 }}>
          <PresField label="Household Size" value={data.householdSize} onChange={(v) => setField('householdSize', v.replace(/\D/g, ""))} />
          <PresField label="Annual Household Income" value={data.annualHouseholdIncome} onChange={(v) => setField('annualHouseholdIncome', v.replace(/\D/g, ""))} />
        </div>

        <PresUploadStub
          label="Proof of Income (optional)"
          hint="Failure to upload proof of income may delay processing. Accepted: tax return, W-2, or last two pay stubs."
          fileName="income-verification.pdf"
        />

        <div className="pa-action-row">
          <button
            className="pa-btn-primary"
            disabled={!canContinue}
            onClick={() => {
              dispatch('START_INCOME_QUALIFICATION', { portal: 'provider' });
              dispatch('VERIFY_INCOME', { portal: 'provider' });
              setStep('pres-complete');
            }}
          >
            Submit Application
          </button>
        </div>
      </>
    );
  } else {
    content = (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <svg width="56" height="56" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto" }}>
          <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill="#007178" />
        </svg>
        <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 20, fontWeight: 700, color: "#1C1C1C" }}>Thank You!</h2>
        <p style={{ color: "#6F7276", fontSize: 14, maxWidth: 440, margin: "0 auto 20px" }}>
          Thank you for submitting {patient.patientName}'s enrollment into the {selectedDrug} Patient Assistance Program.
          The patient will receive a call from an AssistRx program specialist within 2 business days.
        </p>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "14px 16px", borderRadius: 10, border: "1px solid #E0E0E0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#1C1C1C" }}>Enrollment Form (please print for your records)</span>
          <span style={{ fontSize: 13, color: "#007178", fontWeight: 600 }}>Preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className="provider-portal">
      <BrandSidebar isBranded={false} />
      <main className="provider-content provider-content--pa">
        {content}
      </main>
    </div>
  );
}

function CoaProviderExperience({
  step,
  setStep,
  dispatch,
  workflowData,
}: {
  step: Step;
  setStep: (step: Step) => void;
  dispatch: ReturnType<typeof useWorkflowDispatch>;
  workflowData: WorkflowData;
}) {
  const keanuStatus = deriveKeanuStatus(workflowData);
  const isIdle = step === "coa-dashboard";
  const canAddRx = isIdle && !keanuStatus;
  // Local to the provider portal, like CoaRxForm's dosage/refills — see the
  // comment above PHARMACIES for why this isn't dispatched to the engine.
  const [pharmacy, setPharmacy] = useState<PharmacyOption | null>(null);

  // PA requests now arrive the same way WF1 delivers them — an external
  // AssistRx email + hosted "Verify & Complete" PA form — instead of a form
  // embedded in the Heroic EHR chart. So these four steps render WF1's own
  // full-page experience (EmailStep/LoginStep/PaQuestionsStep/
  // PaSubmittedStep, all isCoA={false}, same as WF1 uses them) with no chart
  // chrome at all, and the provider only lands back in the EHR once PA
  // Submitted's Done fires. This only reuses the shared step components —
  // it doesn't change what WF1 itself renders with them.
  if (step === "email" || step === "login" || step === "pa-questions" || step === "pa-submitted") {
    return (
      <div className="provider-portal">
        {step !== "email" && <BrandSidebar isBranded={false} />}
        {step === "email" && <EmailStep onClickLink={() => setStep("login")} />}
        {step === "login" && <LoginStep onSubmit={() => setStep("pa-questions")} />}
        {step === "pa-questions" && (
          <PaQuestionsStep
            isCoA={false}
            onBack={() => setStep("login")}
            onCancel={() => setStep("login")}
            onNext={() => setStep("pa-submitted")}
          />
        )}
        {step === "pa-submitted" && (
          <PaSubmittedStep isCoA={false} onDone={() => setStep("coa-dashboard")} />
        )}
      </div>
    );
  }

  let content: React.ReactNode;
  if (step === "coa-rx") {
    content = (
      <CoaRxForm
        pharmacy={pharmacy}
        onPharmacyChange={setPharmacy}
        onSend={() => {
          dispatch('ENROLL', { portal: 'provider' });
          setStep("coa-sent");
        }}
        onBack={() => setStep("coa-dashboard")}
      />
    );
  } else if (step === "coa-sent") {
    content = <CoaSentConfirmation pharmacy={pharmacy} onReturnToDashboard={() => setStep("coa-dashboard")} />;
  } else {
    content = <PrescriptionsIdlePanel status={keanuStatus} pharmacy={pharmacy} onStartPA={() => setStep("email")} />;
  }

  return (
    <EhrChartShell canAddRx={canAddRx} onAddRx={() => setStep("coa-rx")}>
      {content}
    </EhrChartShell>
  );
}

// ── COA eRx Form (Heroic EHR — the HCP's own EHR, not CoAssist) ─────────────

// "Most common" pins the top of the list; everything else is alphabetical
// below a divider. Names reuse the ones already established elsewhere in
// this demo (CRM/iAssist medication cards) where they exist.
const MEDICATION_MOST_COMMON = ["Assistivan", "Assistimab", "Ramoni", "Voloxivan"];
const MEDICATION_OTHERS = ["Aficamten", "Assistivox", "Kelvara", "Nolrivex", "Zylodine"];

function MedicationOption({
  med,
  selected,
  onSelect,
}: {
  med: string;
  selected: boolean;
  onSelect: (v: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(med)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: selected ? 700 : 400,
        color: selected ? HEROIC_BLUE : "#1C1C1C",
        background: selected ? HEROIC_BLUE_LIGHT : "transparent",
        border: "none",
        cursor: "pointer",
      }}
      onMouseOver={(e) => {
        if (!selected) e.currentTarget.style.background = "#F5F5F5";
      }}
      onMouseOut={(e) => {
        if (!selected) e.currentTarget.style.background = "transparent";
      }}
    >
      {med}
    </button>
  );
}

function MedicationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const select = (med: string) => {
    onChange(med);
    setOpen(false);
  };

  return (
    <div className="pa-field" style={{ marginBottom: 24, position: "relative" }}>
      <label className="pa-field__label">Medication Order</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => {
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = setTimeout(() => setOpen(false), 150);
        }}
        className="pa-field__input"
        style={{
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="pa-field__underline pa-field__underline--active" />

      {open && (
        <div
          role="listbox"
          aria-label="Select medication"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            maxHeight: 300,
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6F7276", textTransform: "uppercase", padding: "10px 16px 4px", margin: 0 }}>
            Most Common
          </p>
          {MEDICATION_MOST_COMMON.map((med) => (
            <MedicationOption key={med} med={med} selected={med === value} onSelect={select} />
          ))}

          <hr style={{ border: "none", borderTop: "1px solid #E0E0E0", margin: "8px 0" }} />

          {MEDICATION_OTHERS.map((med) => (
            <MedicationOption key={med} med={med} selected={med === value} onSelect={select} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dispensing pharmacy search/select ────────────────────────────────────────
//
// Mirrors the CRM's SPECIALTY_PHARMACIES list (client/portals/crm/pages/
// Index.tsx) so the same pharmacy names/addresses show up whether staff pick
// one there or the prescriber picks one here — kept as its own local copy
// rather than a shared import, matching this file's existing practice of not
// reaching into other portals (see HEROIC_BLUE's comment above).
//
// This is UI-only, like dosage/refills below — NOT dispatched to the CoA_DTP
// state machine. Checked coaDtp.ts: SELECT_PHARMACY is only handled from
// "pricingSelected" onward, and the patient's own Retail/Mail/Self-Pay choice
// there always overwrites selectedPharmacy anyway — so a dispatch from this,
// the very first step of the flow, would either no-op or get silently
// clobbered later. Surfacing the prescriber's pick here (and on the eRx-sent
// confirmation) is honest about being a demo-only touch, not a real
// downstream effect.
interface PharmacyOption {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const PHARMACIES: PharmacyOption[] = [
  { name: "CoAssist Pharmacy", address: "2400 Sand Lake Road, Suite 200", city: "Orlando", state: "FL", zip: "32809", phone: "(800) 555-0175" },
  { name: "Biologics", address: "456 Specialty Lane", city: "Orlando", state: "FL", zip: "32801", phone: "(407) 555-1234" },
  { name: "Accredo Health Group Inc.", address: "789 Pharma Ave", city: "Tampa", state: "FL", zip: "33602", phone: "(813) 555-5678" },
  { name: "CVS Specialty", address: "321 Medication Blvd", city: "Jacksonville", state: "FL", zip: "32099", phone: "(904) 555-9012" },
  { name: "Walgreens Specialty", address: "654 Drug St", city: "Miami", state: "FL", zip: "33101", phone: "(305) 555-3456" },
  { name: "AllianceRx Walgreens Prime", address: "987 Medicine Way", city: "Fort Lauderdale", state: "FL", zip: "33301", phone: "(954) 555-7890" },
  { name: "Optum Specialty Pharmacy", address: "111 Health Lane", city: "Clearwater", state: "FL", zip: "33755", phone: "(727) 555-2345" },
  { name: "Shields Health Solutions", address: "222 Care Dr", city: "St. Petersburg", state: "FL", zip: "33701", phone: "(727) 555-6789" },
  { name: "PharMerica Specialty", address: "333 Wellness Ave", city: "Sarasota", state: "FL", zip: "34236", phone: "(941) 555-0123" },
];

function PharmacySelect({
  value,
  onChange,
}: {
  value: PharmacyOption | null;
  onChange: (p: PharmacyOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? PHARMACIES.filter((p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
    : PHARMACIES;

  const select = (p: PharmacyOption) => {
    onChange(p);
    setQuery("");
    setOpen(false);
  };

  if (value && !open) {
    return (
      <div className="pa-field" style={{ marginBottom: 24 }}>
        <label className="pa-field__label">Dispensing Pharmacy</label>
        <div
          className="flex items-center justify-between"
          style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 12px" }}
        >
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1C1C", margin: 0 }}>{value.name}</p>
            <p style={{ fontSize: 12, color: "#6F7276", margin: "2px 0 0 0" }}>
              {value.address}, {value.city}, {value.state} {value.zip} · {value.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ color: HEROIC_BLUE, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pa-field" style={{ marginBottom: 24, position: "relative" }}>
      <label className="pa-field__label">Dispensing Pharmacy</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Search pharmacy by name or city…"
        className="pa-field__input"
        aria-haspopup="listbox"
        aria-expanded={open}
      />
      <div className={`pa-field__underline ${query ? "pa-field__underline--active" : ""}`} />

      {open && (
        <div
          role="listbox"
          aria-label="Select dispensing pharmacy"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #E0E0E0",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            maxHeight: 260,
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          {results.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9CA3AF", padding: "12px 16px", margin: 0 }}>
              No pharmacies found for "{query}"
            </p>
          ) : (
            results.map((p) => (
              <button
                key={p.name}
                type="button"
                role="option"
                aria-selected={value?.name === p.name}
                onClick={() => select(p)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  border: "none",
                  cursor: "pointer",
                  background: value?.name === p.name ? HEROIC_BLUE_LIGHT : "transparent",
                }}
                onMouseOver={(e) => {
                  if (value?.name !== p.name) e.currentTarget.style.background = "#F5F5F5";
                }}
                onMouseOut={(e) => {
                  if (value?.name !== p.name) e.currentTarget.style.background = "transparent";
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", margin: 0 }}>{p.name}</p>
                <p style={{ fontSize: 12, color: "#6F7276", margin: "2px 0 0 0" }}>{p.city}, {p.state}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CoaRxForm({
  pharmacy,
  onPharmacyChange,
  onSend,
  onBack,
}: {
  pharmacy: PharmacyOption | null;
  onPharmacyChange: (p: PharmacyOption) => void;
  onSend: () => void;
  onBack: () => void;
}) {
  const [dosage, setDosage] = useState("0.5 mg");
  const [refills, setRefills] = useState("3");
  // Local to this screen on purpose — not written back to usePatientStore.
  // That store is the single active patient identity shared by every flow
  // (including WF1), so changing it here could bleed a WF3-only choice into
  // other flows. The confirmation screen still shows the seeded drug name.
  const [medication, setMedication] = useState(usePatientStore.getState().drugName);
  const payer = usePatientStore((s) => s.payer);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        style={{ color: HEROIC_BLUE, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, fontWeight: 600, marginBottom: 16, display: "block" }}
      >
        ← Back to Prescriptions
      </button>

      <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1C1C", margin: "0 0 4px 0" }}>New Prescription</p>
      <p style={{ fontSize: 13, color: "#6F7276", margin: "0 0 20px 0" }}>
        Insurance: {payer}
      </p>

      <div className="pa-questions-section">
        <MedicationSelect value={medication} onChange={setMedication} />

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px", marginBottom: 24 }}>
            <p className="pa-question__text">Dosage</p>
            <div className="pa-question__options">
              {["0.5 mg", "1.0 mg", "2.4 mg"].map((d) => (
                <label key={d} className="pa-radio-option">
                  <button
                    type="button"
                    onClick={() => setDosage(d)}
                    className="pa-radio-btn"
                    aria-pressed={dosage === d}
                  >
                    {dosage === d ? <RadioCheckedIcon color={HEROIC_BLUE} /> : <RadioUncheckedIcon />}
                  </button>
                  <span className="pa-radio-label">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ flex: "1 1 160px", marginBottom: 24 }}>
            <label className="pa-field__label">Number of Refills</label>
            <select
              value={refills}
              onChange={(e) => setRefills(e.target.value)}
              className="pa-field__input"
              style={{ cursor: "pointer" }}
            >
              <option value="0">0</option>
              <option value="3">3</option>
              <option value="6">6</option>
              <option value="11">11</option>
            </select>
            <div className="pa-field__underline" />
          </div>
        </div>

        <PharmacySelect value={pharmacy} onChange={onPharmacyChange} />
      </div>

      <div className="pa-action-row">
        <button
          onClick={onSend}
          disabled={!pharmacy}
          className="pa-btn-primary pa-btn-primary--heroic"
          title={pharmacy ? undefined : "Select a dispensing pharmacy first"}
        >
          Send eRx
        </button>
      </div>
    </div>
  );
}

// ── COA Sent Confirmation (Heroic EHR) ───────────────────────────────────────

function CoaSentConfirmation({
  pharmacy,
  onReturnToDashboard,
}: {
  pharmacy: PharmacyOption | null;
  onReturnToDashboard: () => void;
}) {
  const drugName = usePatientStore((s) => s.drugName);

  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <svg width="56" height="56" viewBox="0 0 16 16" fill="none" style={{ margin: "0 auto" }}>
        <path d="M16 8C16 12.4183 12.4183 16 8 16C3.58171 16 0 12.4183 0 8C0 3.58171 3.58171 0 8 0C12.4183 0 16 3.58171 16 8ZM7.07464 12.2359L13.0101 6.30045C13.2117 6.0989 13.2117 5.7721 13.0101 5.57055L12.2802 4.84064C12.0787 4.63906 11.7519 4.63906 11.5503 4.84064L6.70968 9.68123L4.44971 7.42126C4.24816 7.21971 3.92135 7.21971 3.71977 7.42126L2.98987 8.15116C2.78832 8.35271 2.78832 8.67952 2.98987 8.88106L6.34471 12.2359C6.54629 12.4375 6.87306 12.4375 7.07464 12.2359Z" fill={HEROIC_BLUE} />
      </svg>
      <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 18, fontWeight: 700, color: "#1C1C1C" }}>
        eRx sent successfully
      </h2>
      <p style={{ color: "#6F7276", fontSize: 14, marginBottom: 16 }}>
        The patient will receive a consent text shortly.
      </p>
      <div style={{ backgroundColor: "#F5F5F5", padding: 16, borderRadius: 8, textAlign: "left", marginTop: 16, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
        <p style={{ fontSize: 12, color: "#6F7276", margin: pharmacy ? "0 0 8px 0" : 0 }}>Medication: <strong>{drugName}</strong></p>
        {pharmacy && (
          <p style={{ fontSize: 12, color: "#6F7276", margin: 0 }}>
            Pharmacy: <strong>{pharmacy.name}</strong> — {pharmacy.city}, {pharmacy.state}
          </p>
        )}
      </div>

      <div className="pa-action-row" style={{ justifyContent: "center" }}>
        <button onClick={onReturnToDashboard} className="pa-btn-primary pa-btn-primary--heroic">
          Return to Prescriptions
        </button>
      </div>
    </div>
  );
}

// ── iAssist Dashboard (branded dashboard experience) ──────────────────────────

interface PatientRow {
  id: string;
  name: string;
  dob: string;
  address: string;
  medication: string;
  status: string;
  statusColor: "success" | "warning" | "error";
}

interface RenewalItem {
  id: string;
  patient: string;
  reach: string;
  date: number;
  month: string;
}

const PATIENTS: PatientRow[] = [
  {
    id: "1",
    name: "Laura Olson",
    dob: "DOB 04/10/1950",
    address: "8753 Carlton Dr. Orlando, FL 50000",
    medication: "Assistivan",
    status: "PA Questions",
    statusColor: "warning",
  },
  {
    id: "2",
    name: "Bob Smith",
    dob: "DOB 04/10/1950",
    address: "2200 North Creek Pwky Orlando, FL 50000",
    medication: "Assistimab",
    status: "Finish Draft",
    statusColor: "warning",
  },
  {
    id: "3",
    name: "Jerry Hermiston",
    dob: "DOB 04/10/1950",
    address: "756 Meredith Dr. Orlando, FL 50000",
    medication: "Ramoni",
    status: "PA Denied",
    statusColor: "error",
  },
  {
    id: "4",
    name: "Edward Sanders",
    dob: "DOB 04/10/1950",
    address: "4905 100th St. Orlando, FL 50000",
    medication: "Assistimab",
    status: "Finish Draft",
    statusColor: "warning",
  },
  {
    id: "5",
    name: "Anna Lee",
    dob: "DOB 04/10/1950",
    address: "56 Turnip Ave. #776 Orlando, FL 50000",
    medication: "Ramoni",
    status: "Complete",
    statusColor: "success",
  },
  {
    id: "6",
    name: "Eric Herr",
    dob: "DOB 04/10/1950",
    address: "348 Dominion Circle Orlando, FL 50000",
    medication: "Assistivan",
    status: "Complete",
    statusColor: "success",
  },
  {
    id: "7",
    name: "Katherine Johnson",
    dob: "DOB 04/10/1950",
    address: "690 Northwest Blvd. #90 Orlando, FL 50000",
    medication: "Assistivan",
    status: "Complete",
    statusColor: "success",
  },
  {
    id: "8",
    name: "Donna Rossman",
    dob: "DOB 04/10/1950",
    address: "80012 Mulberry Ave. #1009 Orlando, FL 50000",
    medication: "Assistimab",
    status: "Complete",
    statusColor: "success",
  },
];

const RENEWALS: RenewalItem[] = [
  { id: "1", patient: "Teri Hatcher", reach: "Reauth: Volixivan", date: 28, month: "APR" },
  { id: "2", patient: "Dennis Johnson", reach: "Reauth: Assistimab", date: 29, month: "APR" },
  { id: "3", patient: "Mitch Gruemmer", reach: "Reauth: Assistimab", date: 2, month: "MAY" },
  { id: "4", patient: "Betty White", reach: "Reauth: Ramoni", date: 10, month: "MAY" },
  { id: "5", patient: "Nancy Blank", reach: "Reauth: Ramoni", date: 12, month: "MAY" },
  { id: "6", patient: "Steve Brown", reach: "Reauth: Ramoni", date: 13, month: "MAY" },
  { id: "7", patient: "Sherrie Park", reach: "Reauth: Ramoni", date: 14, month: "MAY" },
];

const MEDICATIONS = [
  { name: "Assistivan", action: "Start" },
  { name: "Assistimab", action: "Start" },
  { name: "Assistivox", action: "Start" },
];

function StatusDot({ color }: { color: string }) {
  return (
    <div
      className="w-3 h-3 rounded-full"
      style={{
        backgroundColor:
          color === "completed" ? "#035257" : color === "pending" ? "#9EC4C7" : color === "attention" ? "#D8693A" : "#C4C4C4",
      }}
    />
  );
}

function StatusBar() {
  return (
    <div className="flex items-center gap-2 px-2 py-1 border border-neutral-300 rounded-full bg-white w-fit">
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
      <StatusDot color="completed" />
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: "success" | "warning" | "error" }) {
  const bgColor = color === "success" ? "bg-neutral-100" : color === "warning" ? "bg-orange-100" : "bg-red-100";
  const textColor = color === "success" ? "text-neutral-600" : color === "warning" ? "text-orange-800" : "text-red-600";

  return <div className={`px-3 py-1 rounded text-xs font-semibold ${bgColor} ${textColor}`}>{status}</div>;
}

function IAssistDashboard() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
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
    <div className="iassist-portal min-h-screen bg-neutral-100 flex">
      {/* Sidebar */}
      <div className="hidden sm:flex w-[354px] bg-teal-600 text-white flex-col py-6 px-6">
        <div className="flex items-center gap-3 mb-12">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F85024768bb364ddda8d2365469c3ce76?format=webp&width=800&height=1200"
            alt="iAssist Logo"
            className="h-8 w-auto"
          />
        </div>

        {/* High Five Card */}
        <div className="bg-teal-700 rounded-lg p-5 mb-6">
          <h3 className="font-bold text-lg mb-2">High five!</h3>
          <p className="text-sm font-semibold text-teal-100 mb-4">
            You've helped 10 patients get started on therapy this week.
          </p>
          <div className="w-20 h-20 bg-teal-500 rounded-full opacity-75" />
        </div>

        {/* To-Do List */}
        <div className="bg-teal-800 rounded-lg p-6 flex-1">
          <h3 className="font-bold text-lg text-white mb-6">To-Do List</h3>
          <p className="text-teal-200 text-sm font-semibold text-center opacity-70">This feature is coming soon.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="relative bg-white border-b border-neutral-300 h-14 flex items-center px-4 sm:px-8 gap-4">
          <Search size={20} className="text-neutral-600 flex-shrink-0" />
          <div className="flex-1 flex flex-col">
            <label htmlFor="search-input" className="sr-only">
              Search for patient or medication
            </label>
            <input
              id="search-input"
              ref={searchInputRef}
              type="text"
              placeholder="Search for patient or medication"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-600 focus:ring-2 focus:ring-teal-600 focus:ring-inset rounded px-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              aria-label="Search patients and medications"
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? "search-results" : undefined}
              aria-autocomplete="list"
              onKeyDown={(e) => {
                if (!searchQuery) {
                  if (e.key === "Escape") {
                    setSearchOpen(false);
                  }
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
                  setSelectedResultIndex((prev) =>
                    prev < allResults.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSearchOpen(true);
                  setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (selectedResultIndex >= 0 && selectedResultIndex < allResults.length) {
                    const selected = allResults[selectedResultIndex];
                    const displayText =
                      selected.type === "med" ? selected.data.name : selected.data.name;
                    setSearchQuery(displayText);
                    setSearchOpen(false);
                    setSelectedResultIndex(-1);
                  }
                } else if (e.key === "Escape") {
                  setSearchOpen(false);
                  setSelectedResultIndex(-1);
                }
              }}
              onBlur={() => {
                if (searchBlurTimeoutRef.current) {
                  clearTimeout(searchBlurTimeoutRef.current);
                }
                searchBlurTimeoutRef.current = setTimeout(() => {
                  setSearchOpen(false);
                  setSelectedResultIndex(-1);
                }, 200);
              }}
            />
          </div>
          <button
            className="text-teal-600 font-semibold text-xs sm:text-sm flex items-center gap-1 whitespace-nowrap hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded px-2 py-1"
            aria-label="Add new patient"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add New Patient</span>
            <span className="sm:hidden">Add</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-teal-600 font-bold text-xs">
                SC
              </div>
              <span className="text-sm font-normal">Dr. Sarah Chen</span>
            </div>
            <button
              className="relative text-teal-600 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded p-1"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span
                className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full"
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {/* Medications Column */}
            <div>
              <h2 className="text-xl font-normal text-neutral-800 mb-4">Medications</h2>
              <div className="space-y-3">
                {MEDICATIONS.map((med) => (
                  <div key={med.name} className="bg-white rounded-lg p-4 shadow-sm">
                    <h3 className="font-bold text-lg text-teal-600 mb-3">{med.name}</h3>
                    <button className="bg-teal-600 text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-teal-700">
                      {med.action}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Patients Column */}
            <div className="col-span-1 sm:col-span-2">
              <h2 className="text-xl font-normal text-neutral-800 mb-4">Patients</h2>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-300">
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Patient</th>
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Address</th>
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Medication</th>
                      <th className="text-left p-4 font-bold text-neutral-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PATIENTS.map((patient) => (
                      <tr key={patient.id} className="border-b border-neutral-300 hover:bg-neutral-50">
                        <td className="p-4">
                          <p className="font-bold text-sm text-neutral-800">{patient.name}</p>
                          <p className="text-xs text-neutral-500 mt-1">{patient.dob}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-bold text-neutral-800">{patient.address}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-xs font-bold text-neutral-800">{patient.medication}</p>
                        </td>
                        <td className="p-4 flex items-center gap-2">
                          <StatusBar />
                          <StatusBadge status={patient.status} color={patient.statusColor} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
                <p>View All Patients</p>
                <div className="flex items-center gap-2">
                  <span>1-8 of 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-normal text-neutral-800 mb-4">Upcoming Renewals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RENEWALS.map((renewal) => (
                <div key={renewal.id} className="border border-neutral-300 rounded p-4 hover:shadow-md transition">
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-600 text-white rounded px-3 py-2 text-center min-w-12">
                      <p className="font-bold text-sm">{renewal.date}</p>
                      <p className="text-xs font-bold">{renewal.month}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-800">{renewal.patient}</p>
                      <p className="text-xs text-neutral-500">{renewal.reach}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      {searchOpen && searchQuery && (
        <div
          id="search-results"
          className="fixed top-14 left-0 right-0 sm:left-[354px] bg-white border border-neutral-300 border-t-0 shadow-lg max-h-96 overflow-auto z-50"
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
                    <p className="text-sm text-neutral-500">No results found for "{searchQuery}"</p>
                  </div>
                );
              }

              let resultIndex = 0;

              return (
                <>
                  {medResults.length > 0 && (
                    <div role="group" aria-labelledby="med-group-label">
                      <div id="med-group-label" className="text-xs font-bold text-neutral-600 px-4 py-3 bg-neutral-50 border-b border-neutral-200 sticky top-0">
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
                            className={`px-4 py-3 cursor-pointer border-b border-neutral-200 last:border-b-0 transition-colors ${
                              isSelected ? "bg-teal-50 ring-2 ring-inset ring-teal-600" : "hover:bg-neutral-100"
                            }`}
                            onClick={() => {
                              setSearchQuery(med.name);
                              setSearchOpen(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <p className="font-semibold text-sm text-neutral-800">{med.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {patientResults.length > 0 && (
                    <div role="group" aria-labelledby="patient-group-label">
                      <div id="patient-group-label" className="text-xs font-bold text-neutral-600 px-4 py-3 bg-neutral-50 border-b border-neutral-200 sticky top-0">
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
                            className={`px-4 py-3 cursor-pointer border-b border-neutral-200 last:border-b-0 transition-colors ${
                              isSelected ? "bg-teal-50 ring-2 ring-inset ring-teal-600" : "hover:bg-neutral-100"
                            }`}
                            onClick={() => {
                              setSearchQuery(patient.name);
                              setSearchOpen(false);
                              searchInputRef.current?.focus();
                            }}
                          >
                            <p className="font-semibold text-sm text-neutral-800">{patient.name}</p>
                            <p className="text-xs text-neutral-500">{patient.medication}</p>
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

// ── Main Portal Component ─────────────────────────────────────────────────────

export default function ProviderPortal() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('provider');
  // WF1/WF2 now open directly on the login screen (as a generic provider
  // "lock screen" — see LoginStep's isLockScreen prop) instead of on
  // EmailStep. This is purely which screen greets the provider before
  // anything has happened; it doesn't change any of the state-machine-driven
  // transitions below (SUBMIT_PA, COMPLETE_PROVIDER_PA, etc. all fire the
  // same way once the provider is past this starting screen).
  const [step, setStep] = useState<Step>(() => {
    const initialFlowType = useDemoStore.getState().flowType;
    if (initialFlowType === 'CoA_DTP') return 'coa-dashboard';
    if (initialFlowType === 'PrES_PAP') return computeInitialPresProviderStep(workflowData);
    return 'login';
  });
  const dispatch = useWorkflowDispatch();
  const flowType = workflowData.flowType;
  const providerPACompleted = workflowData.providerPACompleted;
  const paStatus = workflowData.paStatus;
  const patientName = usePatientStore((s) => s.patientName);
  const isBranded = isBrandedFlow(flowType);
  const isCoA = flowType === "CoA_DTP";
  // WF5 (PrES_PAP) gets its own dedicated provider screen — a condensed
  // multi-step enrollment flow — instead of falling into the generic
  // WF1/WF2 "Recent Submissions" chain below. See PresPapProviderExperience.
  const isPres = flowType === "PrES_PAP";
  const biStatus = workflowData.biStatus;

  const storeFlowType = useDemoStore((s) => s.flowType);

  useEffect(() => {
    if (storeFlowType !== 'CoA_DTP') {
      return;
    }
    // BI completing means "PA Required" just appeared — skip the idle EHR
    // chart entirely and go straight to the AssistRx PA request email/
    // letter (same email/login/PA-form steps WF1 uses — see
    // CoaProviderExperience). Flow: Send eRx → patient completes enrollment
    // → BI: PA Required → provider sees the letter, with no idle chart or
    // manual "Start Prior Auth" click in between.
    // Covers both landing spots BI can finish while the provider is on:
    // right after sending the eRx (still on "coa-sent") and having already
    // clicked back to the idle chart before BI finished ("coa-dashboard").
    // paStatus === 'none' keeps this from refiring once a PA exists —
    // biStatus stays "complete" indefinitely, so that guard is load-bearing,
    // not just an optimization.
    if (biStatus === 'complete' && paStatus === 'none' && (step === 'coa-sent' || step === 'coa-dashboard')) {
      setStep('email');
    }
  }, [storeFlowType, biStatus, paStatus, step]);

  // WF1 now opens on a generic login lock screen by default (see
  // LoginStep's isLockScreen prop) instead of always starting on EmailStep.
  // But once BI completes with the PA still unsubmitted — the same
  // biStatus/paStatus signal CRM's stage tracker uses for "Letter sent -
  // HCP letter mailed for Prior Authorization" — a real PA request email
  // now exists, so surface it instead of leaving the provider parked on the
  // lock screen. Guarded to `step === 'login'` so this can only ever move
  // the provider forward from the resting lock screen, never yank them back
  // once they've clicked past it (into pa-questions/pa-submitted).
  useEffect(() => {
    if (storeFlowType !== 'Fax_QS_PA_Approved') return;
    if (biStatus === 'complete' && paStatus === 'none' && step === 'login') {
      setStep('email');
    }
  }, [storeFlowType, biStatus, paStatus, step]);

  // `step` is local UI state with no memory of the outer workflow reset —
  // it only ever advances forward via the handlers below, so a reset that
  // clears workflowData would otherwise leave this portal stuck mid-flow
  // (e.g. on "pa-questions") with none of its own state to match. Force it
  // back to this flow's starting step on every reset.
  const resetNonce = useDemoStore((s) => s.resetNonce);
  const lastResetNonceRef = useRef(resetNonce);

  useEffect(() => {
    if (resetNonce === lastResetNonceRef.current) return;
    lastResetNonceRef.current = resetNonce;
    setStep(storeFlowType === 'CoA_DTP' ? 'coa-dashboard' : storeFlowType === 'PrES_PAP' ? 'pres-home' : 'login');
  }, [resetNonce, storeFlowType]);

  if (isBranded) {
    return <IAssistDashboard />;
  }

  if (isPres) {
    return <PresPapProviderExperience step={step} setStep={setStep} dispatch={dispatch} workflowData={workflowData} />;
  }

  // CoA_DTP gets its own dedicated render path — the full Heroic EHR chart
  // shell, entered directly on Keanu's chart (no separate patient-list
  // screen), for everything up through the PA request/response. This is
  // checked before the generic providerPACompleted block below so CoA_DTP
  // never falls into that WF1/WF2-oriented "Recent Submissions" screen.
  //
  // Once a PA exists — paStatus !== 'none' — we stop showing the Heroic EHR
  // entirely and switch to WF4's own iAssist Dashboard (client/portals/
  // iassist/pages/Dashboard.tsx) instead, with Keanu surfaced at the top via
  // that page's own live-status lookup (usePersonaState reads whichever
  // actor is active, so it picks up CoA_DTP's workflowData here the same way
  // it reads iAssist's on WF4). Deliberately keyed on paStatus, not
  // providerPACompleted — that flag only flips when the provider clicks
  // "Done" on the PA Submitted screen themselves, so if PA resolves some
  // other way (e.g. watched it get approved from the CRM tab instead), it
  // would never fire and the chart would keep showing. paStatus is durable
  // and persists across remounts/tab switches regardless of how the PA got
  // there — it isn't tied to the `step` state machine below, which stops
  // mattering once we're here.
  if (isCoA) {
    if (paStatus !== 'none') {
      return (
        <PortalRouter initialPath="/">
          <IAssistDashboardPage />
        </PortalRouter>
      );
    }
    return (
      <CoaProviderExperience
        step={step}
        setStep={setStep}
        dispatch={dispatch}
        workflowData={workflowData}
      />
    );
  }

  // Show dashboard when PA is completed. CoA_DTP already returned above via
  // CoaProviderExperience, so flowType here is always WF1/WF2/WF4.
  //
  // WF1 (Fax_QS_PA_Approved) now matches WF3's post-PA behavior exactly —
  // same iAssist Dashboard (client/portals/iassist/pages/Dashboard.tsx),
  // same live Keanu-Dixon-row status lookup, same click-through — instead
  // of the plain "Recent Submissions" table below. That table's decoy rows
  // (Sarah Mitchell/Assistimab, James Chen/Ramoni, Maria Garcia/Jascayd
  // Income Verification, David Chen/Assistimab) don't exist in
  // Dashboard.tsx's own SAMPLE_PATIENTS roster, so switching flows loses
  // them — same tradeoff CoA_DTP already made for this identical swap.
  //
  // Deliberately keyed on paStatus, not providerPACompleted — same
  // reasoning as CoA_DTP's identical check above. providerPACompleted only
  // flips when the provider clicks "Done" on the PA Submitted screen
  // themselves (see handleDone below), so jumping straight to this stage
  // via the Reset dropdown, or approving PA from the CRM tab instead, would
  // otherwise leave the provider stuck on the login lock screen — the exact
  // opposite of what makes it easy to demo the dashboard staying in sync
  // with stage updates. paStatus is durable and persists across
  // remounts/tab switches regardless of how the PA got there.
  //
  // WF2 (Fax_PAP_Audit) wasn't part of this request and keeps the original
  // "Recent Submissions" screen below.
  if (paStatus !== 'none' && flowType === "Fax_QS_PA_Approved") {
    return (
      <PortalRouter initialPath="/">
        <IAssistDashboardPage />
      </PortalRouter>
    );
  }

  if (providerPACompleted) {
    const primaryData = {
      rxName: "Assistivan Prior Authorization",
      status: paStatus === "approved" ? "Approved" : "Pending",
      statusColor: paStatus === "approved" ? "#D1E7F5" : "#FEF3C7",
      statusTextColor: paStatus === "approved" ? "#0555B0" : "#92400E",
    };

    // Sample patients for dashboard (keeping Keanu at top)
    const samplePatients = [
      {
        name: patientName,
        rxName: primaryData.rxName,
        timestamp: "Submitted Today",
        status: primaryData.status,
        statusColor: primaryData.statusColor,
        statusTextColor: primaryData.statusTextColor,
      },
      {
        name: "Sarah Mitchell",
        rxName: "Assistimab Prior Authorization",
        timestamp: "Submitted Yesterday",
        status: "Approved",
        statusColor: "#D1E7F5",
        statusTextColor: "#0555B0",
      },
      {
        name: "James Chen",
        rxName: "Ramoni Prior Authorization",
        timestamp: "Submitted 2 days ago",
        status: "Pending",
        statusColor: "#FEF3C7",
        statusTextColor: "#92400E",
      },
      {
        name: "Maria Garcia",
        rxName: "Assistivan Income Verification",
        timestamp: "Submitted 3 days ago",
        status: "Verified",
        statusColor: "#D1E7F5",
        statusTextColor: "#0555B0",
      },
      {
        name: "David Chen",
        rxName: "Assistimab Prior Authorization",
        timestamp: "Submitted 4 days ago",
        status: "Denied",
        statusColor: "#FEE2E2",
        statusTextColor: "#B91C1C",
      },
    ];

    return (
      <div className="provider-portal">
        <BrandSidebar isBranded={isBranded} />
        <main className="provider-content">
          <div style={{ padding: "40px 20px", maxWidth: 1000, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C1C1C", marginBottom: 8 }}>
              Provider Portal
            </h1>
            <p style={{ fontSize: 14, color: "#6F7276", marginBottom: 32 }}>
              Workflow — Prior Authorization
            </p>

            <div style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)"
            }}>
              <div style={{
                padding: "24px 24px",
                borderBottom: "1px solid #E5E7EB"
              }}>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1C1C1C",
                  margin: 0
                }}>
                  Recent Submissions
                </h3>
              </div>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Authorization Type</th>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Patient</th>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Submitted</th>
                    <th style={{
                      padding: "16px 24px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#6F7276",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samplePatients.map((patient, idx) => (
                    <tr key={idx} style={{
                      borderBottom: idx < samplePatients.length - 1 ? "1px solid #E5E7EB" : "none",
                      transition: "background-color 0.2s",
                      backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#F5F7FA" : "#F0F4F8";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
                    }}>
                      <td style={{ padding: "16px 24px", color: "#1C1C1C", fontWeight: 500 }}>
                        {patient.rxName}
                      </td>
                      <td style={{ padding: "16px 24px", color: "#1C1C1C", fontWeight: 500 }}>
                        {patient.name}
                      </td>
                      <td style={{ padding: "16px 24px", color: "#6F7276", fontSize: 13 }}>
                        {patient.timestamp}
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <span style={{
                          display: "inline-block",
                          backgroundColor: patient.statusColor,
                          color: patient.statusTextColor,
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="provider-portal">
      {step !== "email" && (
        <BrandSidebar isBranded={isBranded} />
      )}
      {step === "email" && (
        <EmailStep onClickLink={() => setStep("login")} />
      )}
      {step === "login" && (
        <LoginStep isLockScreen onSubmit={() => setStep("pa-questions")} />
      )}
      {step === "pa-questions" && (
        <PaQuestionsStep
          isCoA={false}
          onBack={() => setStep("login")}
          onCancel={() => setStep("login")}
          onNext={() => setStep("pa-submitted")}
        />
      )}
      {step === "pa-submitted" && <PaSubmittedStep
        isCoA={false}
        onDone={() => {}}
      />}
      {step === "income-verify" && (
        <IncomeVerifyStep onBack={() => setStep("login")} onCancel={() => setStep("login")} onNext={() => setStep("income-submitted")} />
      )}
      {step === "income-submitted" && (
        <main className="provider-content provider-content--pa">
          <p className="pa-section-title">Income Verification — CoA Direct to Patient</p>
          <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
            <CheckedCircleIcon color={HEROIC_BLUE} />
            <h2 style={{ marginTop: 16, marginBottom: 8, fontSize: 20, fontWeight: 700, color: "#1C1C1C" }}>
              Income Verified
            </h2>
            <p style={{ color: "#6F7276", fontSize: 14, marginBottom: 32 }}>
              The patient's eligibility has been confirmed. The patient portal will be updated and the free drug shipment process can begin.
            </p>
            <button onClick={() => { dispatch('COMPLETE_PROVIDER_PA', { portal: 'provider' }); setStep("login"); }} className="pa-btn-secondary pa-btn-secondary--heroic">Done</button>
          </div>
        </main>
      )}
    </div>
  );
}
