import { useState } from "react";
import {
  ChevronDown,
  Pencil,
  Search,
  Loader2,
  Database,
} from "lucide-react";
import { usePatientCase } from "@/hooks/usePatientCase";
import { useRunEBenefits } from "@/hooks/useRunEBenefits";

const CASE_ID = "demo";
const SF_BORDER = "#dddbda";
const SF_MUTED = "#706e6b";
const SF_TEXT = "#3e3e3c";
const SF_BLUE = "#0176d3";
const BIR_PURPLE = "#5867e8";

// ─── Field Row ───────────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  isLink,
  muted,
  placeholder,
}: {
  label: string;
  value?: React.ReactNode;
  isLink?: boolean;
  muted?: boolean;
  placeholder?: boolean;
}) {
  const displayValue = value ?? (placeholder ? "(---) ---‑----" : "");
  return (
    <div className="group relative flex flex-col py-2 border-b border-[#dddbda] pr-6 min-h-[44px]">
      <span
        className="text-[11px] mb-0.5 uppercase tracking-wide font-medium leading-tight"
        style={{ color: SF_MUTED }}
      >
        {label}
      </span>
      {isLink ? (
        <span
          className="text-[13px] font-semibold cursor-pointer hover:underline"
          style={{ color: SF_BLUE }}
        >
          {displayValue || "\u00a0"}
        </span>
      ) : (
        <span
          className="text-[13px] font-semibold"
          style={{ color: muted || placeholder ? SF_MUTED : displayValue ? SF_TEXT : SF_MUTED }}
        >
          {displayValue || "\u00a0"}
        </span>
      )}
      <button className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1">
        <Pencil size={12} style={{ color: SF_MUTED }} />
      </button>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  collapsed,
  onToggle,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 cursor-pointer select-none border-b border-[#dddbda]"
      style={{ background: "#f3f2f2", minHeight: 32 }}
      onClick={onToggle}
    >
      <ChevronDown
        size={14}
        style={{
          color: SF_MUTED,
          transform: collapsed ? "rotate(-90deg)" : "none",
          transition: "transform 0.15s",
        }}
      />
      <span className="text-[13px] font-semibold" style={{ color: SF_TEXT }}>
        {title}
      </span>
    </div>
  );
}

// ─── Empty State Panel ────────────────────────────────────────────────────────

function EmptyStatePanel({ message }: { message: string }) {
  return (
    <div
      className="mx-0 my-2 flex items-center justify-center py-4 rounded"
      style={{
        border: "1.5px dashed #dddbda",
        background: "#fafafa",
        minHeight: 56,
      }}
    >
      <span className="text-[12px]" style={{ color: SF_MUTED }}>
        {message}
      </span>
    </div>
  );
}

// ─── Sidebar Panel ────────────────────────────────────────────────────────────

function SidebarPanel({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border border-[#dddbda] rounded mb-3 overflow-hidden"
      style={{ background: "white" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-[#dddbda]"
        style={{ background: "#f3f2f2" }}
      >
        {icon}
        <span className="text-[13px] font-semibold" style={{ color: SF_TEXT }}>
          {title}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative inline-flex items-center rounded-full transition-colors"
      style={{
        width: 36,
        height: 20,
        background: checked ? SF_BLUE : "#dddbda",
        border: "none",
        cursor: "pointer",
      }}
    >
      <span
        className="absolute rounded-full bg-white transition-transform"
        style={{
          width: 16,
          height: 16,
          top: 2,
          left: checked ? 18 : 2,
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

// ─── BIR Record Main ─────────────────────────────────────────────────────────

export default function BIRRecord() {
  const { data: patientCase, isLoading } = usePatientCase(CASE_ID);
  const runEBI = useRunEBenefits();
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [createNewPayer, setCreateNewPayer] = useState(false);
  const [payerSearch, setPayerSearch] = useState("");

  const birId = `BIR-${patientCase?.stage ?? "0431"}`;
  const biComplete = (patientCase?.workflowStep ?? 0) >= 3;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin" style={{ color: SF_MUTED }} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, color: SF_TEXT }}
    >
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-[#dddbda] bg-white"
        style={{ minHeight: 52 }}
      >
        {/* Left: icon + title */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center rounded text-white font-bold text-[11px] shrink-0"
            style={{ width: 36, height: 36, background: BIR_PURPLE }}
          >
            BIR
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px]" style={{ color: SF_MUTED }}>
              Benefit Investigation Result
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[18px] font-bold" style={{ color: SF_TEXT }}>
                {birId}
              </span>
              {/* Run eBenefits CTA */}
              <button
                onClick={() => runEBI.mutate(CASE_ID)}
                disabled={runEBI.isPending || biComplete}
                className="flex items-center gap-2 px-4 py-1.5 text-[13px] font-medium rounded text-white"
                style={{
                  background: biComplete ? "#aaabac" : runEBI.isPending ? "#0056a3" : SF_BLUE,
                  cursor: biComplete || runEBI.isPending ? "not-allowed" : "pointer",
                  border: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {runEBI.isPending && <Loader2 size={13} className="animate-spin" />}
                {biComplete ? "eBenefits Complete" : "Run eBenefits Investigation"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: secondary action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled
            className="px-3 py-1.5 text-[13px] rounded border"
            style={{
              background: "white",
              color: "#aaabac",
              borderColor: SF_BORDER,
              cursor: "not-allowed",
            }}
          >
            Add Product Coverage
          </button>
          <button
            disabled
            className="px-3 py-1.5 text-[13px] rounded border"
            style={{
              background: "white",
              color: "#aaabac",
              borderColor: SF_BORDER,
              cursor: "not-allowed",
            }}
          >
            Add Referral Pharmacy
          </button>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel — 50% */}
        <div
          className="overflow-y-auto border-r border-[#dddbda]"
          style={{ flexBasis: "50%", minWidth: 0 }}
        >
          <div className="border border-[#dddbda] rounded m-3">
            <SectionHeader
              title="Information"
              collapsed={infoCollapsed}
              onToggle={() => setInfoCollapsed(!infoCollapsed)}
            />
            {!infoCollapsed && (
              <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
                {/* Left column */}
                <div>
                  <FieldRow label="Patient" value={patientCase?.patientName} isLink />
                  <FieldRow label="Record Type" value="Pharmacy" />
                  <FieldRow label="Case" value={patientCase?.caseId} isLink />
                  <FieldRow label="Benefit Type" value="Pharmacy" />
                  <FieldRow label="Status" value="Active" />
                  <FieldRow label="Sub-Status" />
                  <FieldRow
                    label="Insured?"
                    value={biComplete ? "Yes" : "Pending — eBI required"}
                    muted={!biComplete}
                  />
                  <FieldRow label="Subscriber Name" />
                  <FieldRow label="Internal Comments" />
                  <FieldRow label="Admin Benefit – Percentage" />
                  <FieldRow label="Admin Benefit – Dollar" />
                  <FieldRow label="PA By Product Coverage" />
                </div>
                {/* Right column */}
                <div>
                  <FieldRow label="Benefit Investigation Result Name" value={birId} />
                  <FieldRow label="Stage" value={patientCase?.stage} isLink />
                  <FieldRow label="Selected Product Coverage Pharmacy" />
                  <FieldRow label="Rank" value="Primary" />
                  <FieldRow label="Benefit Source" value="eBV" />
                  <FieldRow label="Reimbursement Plan" />
                  <FieldRow
                    label="Prior Authorization Phone #"
                    value={patientCase?.paPhone}
                    isLink={!!patientCase?.paPhone}
                    placeholder={!patientCase?.paPhone}
                  />
                  <FieldRow label="Prior Authorization Fax #" />
                  <FieldRow label="External Comments" />
                  <FieldRow label="External Comments Long" />
                  <FieldRow label="Additional Benefit Information" />
                  <FieldRow label="PA Submission Process" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — 50% */}
        <div
          className="overflow-y-auto p-3"
          style={{ flexBasis: "50%", minWidth: 220 }}
        >
          {/* Payer Information */}
          <SidebarPanel title="Payer Information">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium" style={{ color: SF_MUTED }}>
                  Payer:
                </span>
                <span className="text-[13px]" style={{ color: SF_TEXT }}>&nbsp;</span>
              </div>
              <div className="mb-2">
                <label
                  className="text-[11px] font-medium block mb-1"
                  style={{ color: "#c23934" }}
                >
                  * Select Payer
                </label>
                <div
                  className="flex items-center border border-[#dddbda] rounded overflow-hidden"
                  style={{ background: "white" }}
                >
                  <input
                    type="text"
                    value={payerSearch}
                    onChange={(e) => setPayerSearch(e.target.value)}
                    placeholder="Search Payer…"
                    className="flex-1 px-2 py-1.5 text-[13px] outline-none bg-transparent"
                    style={{ color: SF_TEXT }}
                  />
                  <Search size={14} className="mx-2 shrink-0" style={{ color: SF_MUTED }} />
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px]" style={{ color: SF_TEXT }}>
                  Create New Payer
                </span>
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={createNewPayer}
                    onChange={() => setCreateNewPayer(!createNewPayer)}
                  />
                  <span className="text-[12px]" style={{ color: SF_MUTED }}>
                    {createNewPayer ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                className="px-5 py-1.5 text-[13px] font-medium rounded text-white"
                style={{ background: SF_BLUE, border: "none", cursor: "pointer" }}
              >
                Next
              </button>
            </div>
          </SidebarPanel>

          {/* BI Product Coverages */}
          <SidebarPanel
            title={`BI Product Coverages (${biComplete ? 1 : 0})`}
            icon={<Database size={14} style={{ color: BIR_PURPLE }} />}
          >
            {biComplete ? (
              <div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: "#f3f2f2" }}>
                      {["BI Product Coverage Name", "Product", "Product Coverage Status", "PA Required?"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-2 py-1 text-[11px] uppercase tracking-wide font-medium border-b border-[#dddbda]"
                          style={{ color: SF_MUTED }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-[#f3f2f2]">
                      <td className="px-2 py-1.5 border-b border-[#dddbda]">
                        <span className="cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                          BIPC-0453
                        </span>
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#dddbda]">
                        <span className="cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                          Austedo 1mg
                        </span>
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#dddbda]" style={{ color: SF_TEXT }}>
                        Covered
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#dddbda]" style={{ color: SF_TEXT }}>
                        Yes
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="pt-2 flex justify-end">
                  <span className="text-[12px] cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                    View All
                  </span>
                </div>
              </div>
            ) : (
              <EmptyStatePanel message="No coverages found. Run eBenefits Investigation to populate." />
            )}
          </SidebarPanel>

          {/* BI Referral Pharmacies */}
          <SidebarPanel
            title={`BI Referral Pharmacies (${biComplete ? 1 : 0})`}
            icon={<Database size={14} style={{ color: BIR_PURPLE }} />}
          >
            {biComplete ? (
              <div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ background: "#f3f2f2" }}>
                      {["Referral Pharmacy Name", "Pharmacy Name", "Record Type", "Network Status"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-2 py-1 text-[11px] uppercase tracking-wide font-medium border-b border-[#dddbda]"
                          style={{ color: SF_MUTED }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-[#f3f2f2]">
                      <td className="px-2 py-1.5 border-b border-[#dddbda]">
                        <span className="cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                          PREF-0675
                        </span>
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#dddbda]" style={{ color: SF_TEXT }}>
                        Biologics
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#dddbda]">
                        <span className="cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                          Program Mandated
                        </span>
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#dddbda]" style={{ color: SF_TEXT }}>
                        In Network
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="pt-2 flex justify-end">
                  <span className="text-[12px] cursor-pointer hover:underline" style={{ color: SF_BLUE }}>
                    View All
                  </span>
                </div>
              </div>
            ) : (
              <EmptyStatePanel message="No pharmacies found. Run eBenefits Investigation to populate." />
            )}
          </SidebarPanel>
        </div>
      </div>
    </div>
  );
}
