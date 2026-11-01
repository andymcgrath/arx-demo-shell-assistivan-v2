import { usePatientStore } from "@/store/patientStore";
import { SAMPLE_COA_CASES } from "@/store/sampleCoaCases";
import { SfLink, SF_SECTION_BG } from "./SfPrimitives";
import { ChevronDown, Pencil, Settings, RefreshCw, ArrowUpDown, Search, Star, Plus, Bell } from "lucide-react";
import { SfButton } from "./SfControls";


// ─── My Cases list (CoA_DTP default screen) ─────────────────────────────────
//
// Mimics a Salesforce Service Console "My Cases" list view. This is what the
// CoA_DTP CRM/HUB shows before Keanu's eRx is submitted — a realistic-looking
// caseload with no active case yet. Once REFERRAL_RECEIVED fires, his row appears at
// the top; clicking it opens the existing case-detail tab strip (unchanged).
// Gated entirely behind isCoaFlow in Index() below — WF1/WF2/WF4 keep their
// current always-detail-view behavior.

export function CaseListView({
  caseNumber,
  onOpenCase,
}: {
  caseNumber: string | null;
  onOpenCase: () => void;
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
      <div className="flex items-center gap-4 px-3 border-b border-[#dddbda]" style={{ height: 44, background: "var(--crm-primary-dark, #032d60)" }}>
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
            {SAMPLE_COA_CASES.length + (caseNumber ? 1 : 0)} items • Sorted by Case Number • Updated a few seconds ago
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
              {caseNumber && (
                <tr
                  onClick={onOpenCase}
                  className="cursor-pointer hover:bg-teal-50 transition-colors"
                  style={{ background: "var(--crm-primary-30, #e8f6f6)" }}
                >
                  <td className="px-3 py-2 border-b border-[#dddbda]">
                    <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-3 py-2 border-b border-[#dddbda]"><SfLink>{caseNumber}</SfLink></td>
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
