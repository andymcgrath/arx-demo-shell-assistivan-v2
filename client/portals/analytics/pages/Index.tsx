import { useState } from "react";
import { daysFromToday } from "@/lib/relativeDate";
import ExplorePerformance from "./ExplorePerformance";
import DiscoverTrends from "./DiscoverTrends";
import GenieAI from "./GenieAI";

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = "#00a5b4";
const SIDEBAR_BG = "#2d3748";
const PAGE_BG = "#f4f6f9";
const CARD_BG = "#ffffff";
const HEADER_H = 48;
const SIDEBAR_W = 48;
// 6-level performance palette (shared with Explore Performance)
const C_GREAT  = "#42C442";
const C_GOOD   = "#BCD631";
const C_AVG    = "#FCBF3D";
const C_BELOW  = "#FA8B3D";
const C_POOR   = "#FF6262";
const C_NODATA = "#CCCCCC";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconHelpCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconMoreHorizontal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z" />
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Nav tabs config ──────────────────────────────────────────────────────────

const NAV_TABS = [
  { label: "Call Center Dashboard", icon: <IconHome /> },
  { label: "Team Performance", icon: <IconBarChart /> },
  { label: "Call Quality Analysis", icon: <IconZap /> },
  { label: "Trends & Patterns", icon: <IconTrendingUp /> },
  { label: "Pharmacy Insights AI", icon: <IconSparkles /> },
];

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

interface BarDatum {
  label: string;
  value: number;
}

function BarChart({
  data,
  barColor,
  useScoreColor = false,
  yMax = 100,
  yLabel,
  xLabel,
  avgValue,
}: {
  data: BarDatum[];
  barColor?: string;
  useScoreColor?: boolean;
  yMax?: number;
  yLabel?: string;
  xLabel?: string;
  avgValue?: number;
}) {
  const VW = 380;
  const VH = 230;
  const M = { top: 24, right: 72, bottom: 54, left: 46 };
  const pw = VW - M.left - M.right;
  const ph = VH - M.top - M.bottom;

  const yScale = (v: number) => ph - (v / yMax) * ph;
  const slotW = pw / data.length;
  const barW = Math.min(slotW * 0.52, 58);
  const tickStep = yMax <= 50 ? 10 : 20;
  const yTicks = Array.from({ length: Math.floor(yMax / tickStep) + 1 }, (_, i) => i * tickStep);

  const splitLabel = (lbl: string, max = 13): string[] => {
    if (lbl.length <= max) return [lbl];
    const words = lbl.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur ? cur + " " + w : w).length > max) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = cur ? cur + " " + w : w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full">
      <g transform={`translate(${M.left},${M.top})`}>
        {yTicks.map(tick => (
          <g key={tick}>
            <line x1={0} y1={yScale(tick)} x2={pw} y2={yScale(tick)} stroke="#e5e7eb" strokeWidth="1" />
            <text x={-6} y={yScale(tick) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{tick}</text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = slotW * i + slotW / 2;
          const x = cx - barW / 2;
          const y = yScale(d.value);
          const h = ph - y;
          const lines = splitLabel(d.label);
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={h} fill={useScoreColor ? scoreToColor(d.value).bg : (barColor ?? "#4a90d9")} rx="3" />
              <text x={cx} y={y - 5} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="600">
                {d.value}
              </text>
              {lines.map((line, li) => (
                <text key={li} x={cx} y={ph + 15 + li * 13} textAnchor="middle" fontSize="10" fill="#6b7280">
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {avgValue !== undefined && (
          <g>
            <line x1={0} y1={yScale(avgValue)} x2={pw} y2={yScale(avgValue)}
              stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="5,4" />
            <text x={pw + 5} y={yScale(avgValue) - 2} fontSize="9" fill="#6b7280" fontWeight="600">Average</text>
            <text x={pw + 5} y={yScale(avgValue) + 10} fontSize="9" fill="#9ca3af">{avgValue}</text>
          </g>
        )}

        <line x1={0} y1={0} x2={0} y2={ph} stroke="#d1d5db" strokeWidth="1" />
        <line x1={0} y1={ph} x2={pw} y2={ph} stroke="#d1d5db" strokeWidth="1" />

        {yLabel && (
          <text transform={`translate(-34,${ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#6b7280">
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text x={pw / 2} y={ph + 48} textAnchor="middle" fontSize="10" fill="#6b7280">
            {xLabel}
          </text>
        )}
      </g>
    </svg>
  );
}

// ─── Verint Header ────────────────────────────────────────────────────────────

function VerintHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center"
      style={{ height: HEADER_H, background: CARD_BG, borderBottom: "1px solid #e2e8f0" }}
    >
      <div
        className="flex-shrink-0 flex flex-col justify-center px-4"
        style={{ width: 168, height: "100%", background: TEAL }}
      >
        <span className="text-white font-bold text-sm tracking-wider leading-tight">VERINT</span>
        <span className="text-white/80 text-[10px] leading-tight">Data Insights Bot</span>
      </div>

      <button
        className="ml-3 lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
        onClick={onMenuClick}
      >
        <IconMenu />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3 pr-4">
        <button className="text-gray-400 hover:text-gray-600 transition-colors"><IconBell /></button>
        <button className="text-gray-400 hover:text-gray-600 transition-colors"><IconHelpCircle /></button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs"
          style={{ border: "2px solid #cbd5e0", color: "#718096" }}
        >
          PT
        </div>
      </div>
    </header>
  );
}

// ─── Narrow Sidebar ───────────────────────────────────────────────────────────

function NarrowSidebar({ activeTab, setActiveTab }: { activeTab: number; setActiveTab: (i: number) => void }) {
  return (
    <aside
      className="flex fixed left-0 flex-col items-center py-2 z-40"
      style={{ top: HEADER_H, bottom: 0, width: SIDEBAR_W, background: SIDEBAR_BG, position: "fixed" }}
    >
      {NAV_TABS.map((tab, i) => (
        <button
          key={tab.label}
          onClick={() => setActiveTab(i)}
          title={tab.label}
          className="w-10 h-10 flex items-center justify-center rounded-lg my-0.5 transition-colors"
          style={{
            color: activeTab === i ? TEAL : "#a0aec0",
            background: activeTab === i ? "rgba(0,165,180,0.18)" : "transparent",
          }}
        >
          {tab.icon}
        </button>
      ))}
    </aside>
  );
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  activeTab,
  setActiveTab,
  onClose,
}: {
  open: boolean;
  activeTab: number;
  setActiveTab: (i: number) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col py-4 px-2"
        style={{ width: 220, background: SIDEBAR_BG, paddingTop: HEADER_H + 8 }}
      >
        {NAV_TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => { setActiveTab(i); onClose(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left mb-0.5 transition-colors"
            style={{
              color: activeTab === i ? TEAL : "#a0aec0",
              background: activeTab === i ? "rgba(0,165,180,0.18)" : "transparent",
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page Title Area ─────────────────────────────────────────────────────────

function PageTitleArea({ activeTab }: { activeTab: number }) {
  const title = activeTab === 0 ? "Call Center Dashboard" : NAV_TABS[activeTab].label;
  return (
    <div className="px-5 pt-4 pb-3" style={{ background: PAGE_BG, borderBottom: "1px solid #e2e8f0" }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#9ca3af" }}>
            All Dashboards
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-xl font-bold" style={{ color: "#1a202c" }}>{title}</h1>
            <button className="text-gray-400 hover:text-gray-600 transition-colors"><IconCopy /></button>
            <button className="text-gray-400 hover:text-gray-600 transition-colors"><IconShare /></button>
            <button className="text-gray-400 hover:text-gray-600 transition-colors"><IconMoreHorizontal /></button>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: TEAL }}>
              <IconTag />
              Add Tag
            </button>
            <span className="text-xs" style={{ color: "#9ca3af" }}>Refreshed 33 minutes ago</span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border"
          style={{ background: CARD_BG, borderColor: "#d1d5db", minWidth: 250 }}
        >
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ background: TEAL }}
          >
            V
          </div>
          <input
            type="text"
            placeholder="Search in AOS Workspace"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "#374151" }}
          />
          <span style={{ color: "#9ca3af" }}><IconSearch /></span>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Bar ──────────────────────────────────────────────────────────────

const INITIAL_FILTERS = [
  { label: "Date Last week", active: true },
  { label: "Pharmacy Location (All)", active: false },
  { label: "Agent Name (All)", active: false },
  { label: "Call Type (All)", active: false },
  { label: "Queue (All)", active: false },
  { label: "Shift (All)", active: false },
  { label: "Call Status (All)", active: false },
];

function FilterBar() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const toggle = (i: number) =>
    setFilters(prev => prev.map((f, pi) => pi === i ? { ...f, active: !f.active } : f));

  return (
    <div
      className="flex items-center gap-2 px-5 py-2.5 flex-wrap"
      style={{ background: "#edf2f7", borderBottom: "1px solid #e2e8f0" }}
    >
      <span style={{ color: "#718096" }}><IconFilter /></span>
      {filters.map((f, i) => (
        <button
          key={f.label}
          onClick={() => toggle(i)}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
          style={
            f.active
              ? { background: TEAL, color: "#fff", border: `1px solid ${TEAL}` }
              : { background: CARD_BG, color: TEAL, border: `1px solid ${TEAL}` }
          }
        >
          {f.label}
          <IconChevronDown />
        </button>
      ))}
      <button
        className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
        style={{ background: TEAL }}
      >
        <IconPlus />
        Add Filter
      </button>
    </div>
  );
}

// ─── KPI Cards Row ───────────────────────────────────────────────────────────

function KpiCardsRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-medium mb-3" style={{ color: "#718096" }}>Total Agents on Duty</div>
        <div className="text-4xl font-bold text-center my-4" style={{ color: "#1a202c" }}>143</div>
        <div className="text-xs text-center" style={{ color: "#718096" }}>
          Number of <span className="font-bold" style={{ color: "#4a5568" }}>Active Pharmacy Agents</span>
        </div>
      </div>

      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-medium mb-3" style={{ color: "#718096" }}>Avg Quality Score (All Agents)</div>
        <div className="text-4xl font-bold text-center my-4" style={{ color: "#1a202c" }}>82.4</div>
        <div className="text-xs text-center" style={{ color: "#718096" }}>
          Average <span className="font-bold" style={{ color: "#4a5568" }}>Call Quality Score</span>, Last Week
        </div>
      </div>

      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-medium mb-3" style={{ color: "#718096" }}>Calls in Queue</div>
        <div className="text-4xl font-bold text-center my-4" style={{ color: "#1a202c" }}>24</div>
        <div className="text-xs text-center" style={{ color: "#718096" }}>
          Waiting <span className="font-bold" style={{ color: "#4a5568" }}>Customer Calls</span> for{" "}
          <span className="font-bold" style={{ color: "#4a5568" }}>Next Available Agent</span>
        </div>
      </div>

      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-medium mb-3" style={{ color: "#718096" }}>Calls by Queue Type</div>
        <table className="w-full mt-1">
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th className="text-left pb-2 font-semibold uppercase tracking-wide" style={{ color: "#a0aec0", fontSize: 10 }}>
                Queue Type ↑
              </th>
              <th className="text-right pb-2 font-semibold uppercase tracking-wide" style={{ color: "#a0aec0", fontSize: 9 }}>
                # of Calls (Count)
              </th>
            </tr>
          </thead>
          <tbody className="text-xs">
            <tr>
              <td className="py-2" style={{ color: "#4a5568" }}>Refill Requests</td>
              <td className="py-2 text-right" style={{ color: "#4a5568" }}>3,847.00</td>
            </tr>
            <tr>
              <td className="py-1" style={{ color: "#4a5568" }}>Prior Authorization</td>
              <td className="py-1 text-right" style={{ color: "#4a5568" }}>1,256.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Charts Row ──────────────────────────────────────────────────────────────

function ChartsRow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 100 }}>
      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "#4a5568" }}>Average Score by Location</div>
        <div style={{ height: 250 }}>
          <BarChart
            data={[
              { label: "OFFICE", value: 63.2 },
              { label: "HOME", value: 57.4 },
              { label: "NONE", value: 51.8 },
            ]}
            barColor="#4a90d9"
            yMax={100}
            yLabel="Average Score"
            xLabel="Location"
            avgValue={58.9}
          />
        </div>
      </div>

      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "#4a5568" }}>Average Quality Score by Channel</div>
        <div style={{ height: 250 }}>
          <BarChart
            data={[
              { label: "Phone", value: 87.3 },
              { label: "Email", value: 82.7 },
            ]}
            barColor="#27ae60"
            yMax={100}
            yLabel="Average Quality Score"
            xLabel="Communication Channel"
            avgValue={85.0}
          />
        </div>
      </div>

      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "#4a5568" }}>Average Score by Call Type</div>
        <div style={{ height: 250 }}>
          <BarChart
            data={[
              { label: "Refill Request", value: 89.2 },
              { label: "Prior Authorization", value: 84.5 },
            ]}
            useScoreColor
            yMax={100}
            yLabel="Average Score"
            xLabel="Call Type"
            avgValue={86.9}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Grouped Bar Chart ───────────────────────────────────────────────────────

// ─── Agent Score Heatmap ──────────────────────────────────────────────────────

const HEATMAP_FOLDERS = [
  "All Calls",
  "Refill Queue",
  "Prior Auth",
  "Escalated",
  "Resolved",
  "Pending",
];

const HEATMAP_DATA: { agent: string; scores: (number | null)[] }[] = [
  { agent: "Cage, Luke",        scores: [86.1, 87.2, null,  85.8, 86.1, 85.4] },
  { agent: "Fisher, Olivia",    scores: [87.4, 88.1, 89.2, null,  87.4, 86.8] },
  { agent: "Hodges, Lily",      scores: [84.2, 85.1, null,  84.6, 84.2, null]  },
  { agent: "Johnson, Liz",      scores: [91.2, 93.5, 89.4, 92.1, 91.2, 90.8] },
  { agent: "Jones, Jessica",    scores: [86.7, 88.2, 84.9, null,  86.7, 85.4] },
  { agent: "King, Amelia",      scores: [85.1, null,  86.8, 84.9, 85.1, null]  },
  { agent: "Mathis, Jake",      scores: [88.4, 86.9, 90.1, null,  88.4, 87.2] },
  { agent: "Murdock, Matt",     scores: [85.8, 86.2, 86.4, 85.5, 85.8, 86.1] },
  { agent: "Murray, Adrian",    scores: [85.9, 87.4, null,  84.1, 85.9, 84.2] },
  { agent: "Patel, Rajesh",     scores: [94.6, 96.2, 92.4, 95.1, 94.6, null]  },
  { agent: "Rand, Danny",       scores: [85.3, 86.8, null,  85.9, 85.3, null]  },
  { agent: "Rutherford, Adam",  scores: [85.0, 86.5, 84.8, null,  85.0, 85.3] },
];

function scoreToColor(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: C_GREAT, text: "#fff" };
  if (score >= 60) return { bg: C_GOOD,  text: "#3a3800" };
  if (score >= 40) return { bg: C_AVG,   text: "#3d2a00" };
  if (score >= 20) return { bg: C_BELOW, text: "#fff" };
  return { bg: C_POOR, text: "#fff" };
}

function AgentScoreHeatmap() {
  const minScore = Math.min(...HEATMAP_DATA.flatMap(r => r.scores.filter((s): s is number => s !== null)));
  const maxScore = Math.max(...HEATMAP_DATA.flatMap(r => r.scores.filter((s): s is number => s !== null)));

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-semibold mb-3" style={{ color: "#4a5568" }}>Agent Score Heatmap by Evaluation Folder</div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                className="text-left pb-2 pt-1 pr-3 font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: "#718096", fontSize: 10, borderBottom: "1px solid #e2e8f0", minWidth: 130 }}
              >
                Agent
              </th>
              {HEATMAP_FOLDERS.map(folder => (
                <th
                  key={folder}
                  className="text-center pb-2 pt-1 px-1 font-semibold uppercase tracking-wide"
                  style={{ color: "#718096", fontSize: 9, borderBottom: "1px solid #e2e8f0", minWidth: 72 }}
                >
                  {folder}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_DATA.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td
                  className="pr-3 font-medium"
                  style={{ color: "#374151", height: 40, verticalAlign: "middle" }}
                >
                  {row.agent}
                </td>
                {row.scores.map((score, ci) => {
                  if (score === null) {
                    return (
                      <td key={ci} className="px-1 text-center" style={{ height: 40, verticalAlign: "middle" }}>
                        <div
                          className="flex items-center justify-center rounded font-medium"
                          style={{ height: 32, background: C_NODATA, color: "#888", fontSize: 10 }}
                        >
                          —
                        </div>
                      </td>
                    );
                  }
                  const { bg, text } = scoreToColor(score);
                  return (
                    <td key={ci} className="px-1 text-center" style={{ height: 40, verticalAlign: "middle" }}>
                      <div
                        className="flex flex-col items-center justify-center rounded font-bold"
                        style={{ height: 32, background: bg, color: text, fontSize: 11 }}
                      >
                        {score.toFixed(2)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 flex-wrap" style={{ borderTop: "1px solid #f1f5f9" }}>
        <span className="text-xs font-semibold" style={{ color: "#9ca3af" }}>Score range: {minScore.toFixed(1)} – {maxScore.toFixed(1)}</span>
        <div className="flex items-center gap-2">
          {[
            { bg: C_POOR,   label: "< 20  Needs Improvement" },
            { bg: C_BELOW,  label: "20–40  Below Avg" },
            { bg: C_AVG,    label: "40–60  Average" },
            { bg: C_GOOD,   label: "60–80  Good" },
            { bg: C_GREAT,  label: "80–100  Great" },
            { bg: C_NODATA, label: "No Data" },
          ].map(({ bg, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ background: bg, border: "1px solid #e5e7eb" }} />
              <span className="text-[10px]" style={{ color: "#6b7280" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Employee Table ───────────────────────────────────────────────────────────

const EMPLOYEE_ROWS = [
  { name: "Cage, Luke",       score: 86.1, count: 148 },
  { name: "Fisher, Olivia",   score: 87.4, count: 212 },
  { name: "Hodges, Lily",     score: 84.2, count: 95  },
  { name: "Johnson, Liz",     score: 91.2, count: 324 },
  { name: "Jones, Jessica",   score: 86.7, count: 178 },
  { name: "King, Amelia",     score: 85.1, count: 134 },
  { name: "Mathis, Jake",     score: 88.4, count: 267 },
  { name: "Murdock, Matt",    score: 85.8, count: 89  },
  { name: "Murray, Adrian",   score: 85.9, count: 156 },
  { name: "Patel, Rajesh",    score: 94.6, count: 441 },
  { name: "Rand, Danny",      score: 85.3, count: 62  },
  { name: "Rutherford, Adam", score: 85.0, count: 118 },
];

function EmployeeTable() {
  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-semibold mb-3" style={{ color: "#4a5568" }}>Evaluations by Employee</div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: CARD_BG, zIndex: 1 }}>
            <tr>
              <th
                className="text-left pb-2 pt-1 font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: "#718096", fontSize: 10, borderBottom: "1px solid #e2e8f0" }}
              >
                Employee Name ▲
              </th>
              <th
                className="text-center pb-2 pt-1 font-semibold uppercase tracking-wide whitespace-nowrap px-2"
                style={{ color: "#718096", fontSize: 10, borderBottom: "1px solid #e2e8f0" }}
              >
                Evaluation Score (Avg)
              </th>
              <th
                className="text-right pb-2 pt-1 font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: "#718096", fontSize: 10, borderBottom: "1px solid #e2e8f0" }}
              >
                Number of Evaluations (Count)
              </th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEE_ROWS.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td className="py-2 pr-2 text-xs" style={{ color: "#374151", height: 36 }}>
                  {row.name}
                </td>
                <td className="py-0 px-1" style={{ height: 36, width: "36%" }}>
                  <div
                    className="flex items-center justify-center w-full h-full font-bold text-xs"
                    style={{ background: scoreToColor(row.score).bg, color: scoreToColor(row.score).text, height: 36, borderRadius: 2 }}
                  >
                    {row.score.toFixed(2)}
                  </div>
                </td>
                <td className="py-2 pl-2 text-xs text-right" style={{ color: "#374151" }}>
                  {row.count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Second Row (Grouped Chart + Employee Table) ──────────────────────────────

function SecondRow() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "58fr 42fr" }}>
      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0", marginBottom: 100 }}>
        <AgentScoreHeatmap />
      </div>

      <div className="rounded-lg p-4 shadow-sm" style={{ background: CARD_BG, border: "1px solid #e2e8f0", minHeight: 380, marginBottom: 100 }}>
        <EmployeeTable />
      </div>
    </div>
  );
}

// ─── Tab 0 — Call Center Dashboard ────────────────────────────────────────────

function Tab0QualityDashboard() {
  return (
    <div className="space-y-5">
      <KpiCardsRow />
      <ChartsRow />
      <SecondRow />
    </div>
  );
}

// ─── Shared components for existing tabs (dark-panel style) ───────────────────

function SectionTitle({ children, tip }: { children: React.ReactNode; tip: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center gap-1.5 mb-4 group">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{children}</div>
      <button
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)} onBlur={() => setShow(false)}
        className="flex-shrink-0 text-muted-foreground/50 hover:text-teal transition-colors focus:outline-none"
        aria-label={`Info: ${children}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>
      {show && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-64 rounded-lg px-3 py-2.5 text-xs text-white/90 leading-relaxed shadow-xl pointer-events-none"
          style={{ background: "hsl(220 55% 14%)", border: "1px solid hsl(220 35% 28%)" }}
        >
          <div className="absolute -top-1.5 left-3 w-3 h-3 rotate-45" style={{ background: "hsl(220 55% 14%)", borderTop: "1px solid hsl(220 35% 28%)", borderLeft: "1px solid hsl(220 35% 28%)" }} />
          {tip}
        </div>
      )}
    </div>
  );
}

function LegacyKpiTile({ label, value, goal, status }: { label: string; value: string; goal?: string; status?: string }) {
  const borderColor = status === "green" ? "border-t-emerald-500" : status === "amber" ? "border-t-amber-400" : status === "blue" ? "border-t-teal" : "border-t-navy-light";
  const valueColor = status === "green" ? "text-emerald-400" : status === "amber" ? "text-amber-400" : "text-teal";
  return (
    <div className={`rounded-xl border border-navy-light border-t-2 ${borderColor} p-4`} style={{ background: "hsl(220 55% 10%)" }}>
      <div className="text-xs text-muted-foreground mb-1 leading-tight">{label}</div>
      <div className={`text-2xl font-black ${valueColor} mb-1`}>{value}</div>
      {goal && <div className="text-xs text-muted-foreground">Goal {goal}</div>}
    </div>
  );
}

// ─── Tab 1 — Call Reason Intelligence ────────────────────────────────────────

const CALL_REASONS = [
  { label: "Prior Authorization Requests", pct: 38, color: "bg-teal" },
  { label: "Prescription Refill Requests", pct: 28, color: "bg-blue-500" },
  { label: "Medication Information Queries", pct: 16, color: "bg-violet-500" },
  { label: "Insurance Verification", pct: 11, color: "bg-amber-500" },
  { label: "Dosage & Side Effect Questions", pct: 5, color: "bg-orange-500" },
  { label: "Account Issues", pct: 2, color: "bg-slate-500" },
];

const KPI_TILES_1 = [
  { label: "Avg Handle Time", value: "4:34", goal: "≤5:00", status: "green" },
  { label: "First Call Resolution", value: "85%", goal: "80%", status: "green" },
  { label: "Caller Satisfaction", value: "8.8/10", goal: "8.5", status: "green" },
  { label: "Accuracy Rate", value: "97%", goal: "95%", status: "green" },
  { label: "Escalation Rate", value: "6%", goal: "<8%", status: "green" },
  { label: "Compliance Score", value: "96%", goal: "95%", status: "green" },
];

function Tab1CallReasons() {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 space-y-3">
        <SectionTitle tip="Percentage breakdown of all pharmacy calls by primary reason, derived from AI transcription analysis across 100% of recorded calls this month.">Call Volume Breakdown</SectionTitle>
        {CALL_REASONS.map(({ label, pct: p, color }) => (
          <div key={label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white/80 font-medium">{label}</span>
              <span className="text-sm font-bold text-white">{p}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(220 55% 10%)" }}>
              <div className={`h-full ${color} rounded-full`} style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="lg:w-80 xl:w-96">
        <SectionTitle tip="Key performance indicators for the pharmacy call center operations.">Performance KPIs</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {KPI_TILES_1.map(t => <LegacyKpiTile key={t.label} {...t} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2 — Patient Journey Insights ────────────────────────────────────────

const FUNNEL_STAGES = [
  { stage: "Calls Received", count: 4150, trend: "+12%", up: true },
  { stage: "Calls Answered", count: 3987, trend: "+10%", up: true },
  { stage: "Issues Resolved", count: 3589, trend: "→ flat", up: null },
  { stage: "Positive Feedback", count: 3102, trend: "-5%", up: false },
];

const KPI_TILES_2 = [
  { label: "Avg Response Time", value: "1.2 min", goal: "≤2 min", status: "green" },
  { label: "Call Completion Rate", value: "89%", goal: "85%", status: "green" },
  { label: "Agent Utilization", value: "78%", goal: "80%", status: "amber" },
  { label: "Quality Assurance Score", value: "84.3", goal: "≥80", status: "green" },
  { label: "Call Abandonment Rate", value: "8%", goal: "<10%", status: "green" },
  { label: "Customer Satisfaction", value: "8.7", goal: "8.5", status: "green" },
];

function Tab2Journey() {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-56 xl:w-64 flex-shrink-0">
        <SectionTitle tip="Volume of calls at each stage of the pharmacy call center journey.">Call Flow Funnel</SectionTitle>
        <div className="relative pl-6">
          <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-teal/20" />
          <div className="space-y-6">
            {FUNNEL_STAGES.map(({ stage, count, trend, up }, i) => (
              <div key={stage} className="flex items-start gap-3 relative">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center flex-shrink-0 text-navy text-[10px] font-black z-10">{i + 1}</div>
                <div>
                  <div className="text-white font-bold text-lg leading-none">{count.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stage}</div>
                  <div className={`inline-flex items-center gap-1 text-xs font-semibold mt-1 px-1.5 py-0.5 rounded ${up === true ? "text-emerald-400 bg-emerald-500/10" : up === false ? "text-red-400 bg-red-500/10" : "text-muted-foreground bg-white/5"}`}>{trend}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <SectionTitle tip="Call center outcome KPIs measuring efficiency, resolution, and customer satisfaction.">Outcome Metrics</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {KPI_TILES_2.map(t => <LegacyKpiTile key={t.label} {...t} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3 — Scheduling & Coverage ───────────────────────────────────────────

const AGENTS = [
  {
    name: "Martinez, Sofia", shift: "8:00 AM – 5:00 PM",
    blocks: [
      { start: 60, end: 135, color: "bg-emerald-500", label: "Pharmacy calls" },
      { start: 135, end: 150, color: "bg-blue-400", label: "Break" },
      { start: 150, end: 300, color: "bg-emerald-500", label: "Pharmacy calls" },
      { start: 300, end: 330, color: "bg-amber-400", label: "Lunch" },
      { start: 330, end: 540, color: "bg-emerald-500", label: "Pharmacy calls" },
    ],
  },
  {
    name: "Nguyen, David", shift: "9:00 AM – 6:00 PM",
    blocks: [
      { start: 120, end: 300, color: "bg-emerald-500", label: "Pharmacy calls" },
      { start: 300, end: 330, color: "bg-amber-400", label: "Lunch" },
      { start: 330, end: 540, color: "bg-emerald-500", label: "Pharmacy calls" },
    ],
  },
  {
    name: "Patel, Priya", shift: "7:00 AM – 4:00 PM",
    blocks: [
      { start: 0, end: 180, color: "bg-emerald-500", label: "Pharmacy calls" },
      { start: 180, end: 195, color: "bg-blue-400", label: "Break" },
      { start: 195, end: 240, color: "bg-emerald-500", label: "Pharmacy calls" },
      { start: 240, end: 270, color: "bg-amber-400", label: "Lunch" },
      { start: 270, end: 420, color: "bg-emerald-500", label: "Pharmacy calls" },
    ],
  },
];

const TIMELINE_TOTAL = 720;
const pct = (m: number) => `${(m / TIMELINE_TOTAL) * 100}%`;

function Tab3Scheduling() {
  const hours = Array.from({ length: 13 }, (_, i) => i + 7);
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <span className="text-white font-semibold text-sm">Mon, May 19 · Pharmacy Call Center · GMT-4</span>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Pharmacy Calls</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Break</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Lunch</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-navy-light" style={{ background: "hsl(220 55% 10%)" }}>
        <div className="min-w-[640px]">
          <div className="flex border-b border-navy-light">
            <div className="w-40 flex-shrink-0 px-3 py-2 text-xs text-muted-foreground font-medium">Agent</div>
            <div className="flex-1 relative h-8">
              {hours.map((h, i) => (
                <div key={h} className="absolute top-0 bottom-0 flex items-center" style={{ left: pct(i * 60) }}>
                  <span className="text-[11px] text-muted-foreground -translate-x-1/2">
                    {h > 12 ? `${h - 12}PM` : h === 12 ? "12PM" : `${h}AM`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {AGENTS.map(agent => (
            <div key={agent.name} className="flex border-b border-navy-light last:border-b-0 hover:bg-white/[0.02] transition-colors">
              <div className="w-40 flex-shrink-0 px-3 py-3">
                <div className="text-sm text-white font-medium leading-tight">{agent.name}</div>
                <div className="text-xs text-muted-foreground">{agent.shift}</div>
              </div>
              <div className="flex-1 relative h-14 my-1.5">
                {hours.map((_, i) => <div key={i} className="absolute top-0 bottom-0 w-px bg-navy-light/50" style={{ left: pct(i * 60) }} />)}
                {agent.blocks.map((block, bi) => (
                  <div key={bi} className={`absolute top-1 bottom-1 ${block.color} rounded opacity-80 hover:opacity-100 transition-opacity`}
                    style={{ left: pct(block.start), width: pct(block.end - block.start) }} title={block.label} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {[{ label: "Volume", value: "847 calls" }, { label: "Service Level", value: "91%" }, { label: "Headcount", value: "12 agents" }, { label: "Avg Occupancy", value: "84%" }].map(({ label, value }) => (
          <div key={label} className="rounded-lg px-4 py-2 border border-navy-light" style={{ background: "hsl(220 48% 13%)" }}>
            <span className="text-muted-foreground">{label}: </span>
            <span className="text-white font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 4 — Exact Transcription ─────────────────────────────────────────────

const CONFIDENCE_BRACKETS = [
  { range: "95–100%", pct: 61 }, { range: "90–94%", pct: 24 },
  { range: "85–89%", pct: 10 }, { range: "<85%", pct: 5 },
];
const LEARNED_TERMS = [
  { term: "JASCAYD", uses: "4,203" }, { term: "Prior Authorization", uses: "3,847" },
  { term: "Specialty Pharmacy", uses: "2,941" }, { term: "Hub Services", uses: "2,105" },
  { term: "Copay Assistance", uses: "1,892" }, { term: "PA Appeal", uses: "1,447" },
  { term: "Free Drug Program", uses: "1,203" }, { term: "Benefits Verification", uses: "984" },
];
const ACCURACY_DAYS = [
  { day: "Mon", val: "97.1%" }, { day: "Tue", val: "97.3%" }, { day: "Wed", val: "97.0%" },
  { day: "Thu", val: "97.6%" }, { day: "Fri", val: "97.4%" }, { day: "Sat", val: "97.8%" }, { day: "Sun", val: "97.2%" },
];

function Tab4Transcription() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LegacyKpiTile label="Transcription Accuracy" value="97.4%" status="blue" />
        <LegacyKpiTile label="Custom Terms Learned" value="1,847" status="blue" />
        <LegacyKpiTile label="Calls Processed (MTD)" value="4,203" status="blue" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 rounded-xl border border-navy-light p-5" style={{ background: "hsl(220 55% 10%)" }}>
          <SectionTitle tip="Distribution of AI transcription confidence scores across all calls processed this month.">Confidence Score Distribution</SectionTitle>
          <div className="space-y-3">
            {CONFIDENCE_BRACKETS.map(({ range, pct: p }) => (
              <div key={range}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white/80 font-medium">{range}</span>
                  <span className="text-sm font-bold text-teal">{p}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "hsl(220 45% 16%)" }}>
                  <div className="h-full rounded-full" style={{ width: `${p}%`, background: "linear-gradient(90deg, hsl(172 70% 35%), hsl(172 70% 50%))" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-navy-light p-5" style={{ background: "hsl(220 55% 10%)" }}>
          <SectionTitle tip="Custom terminology learned from JASCAYD-specific calls, weighted by usage frequency.">Top Learned Terms — This Month</SectionTitle>
          <div className="space-y-2">
            {LEARNED_TERMS.map(({ term, uses }) => (
              <div key={term} className="flex items-center justify-between py-1.5 border-b border-navy-light/40 last:border-0">
                <span className="text-sm text-white font-medium">{term}</span>
                <span className="text-xs font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-full">{uses} uses</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-navy-light p-5" style={{ background: "hsl(220 55% 10%)" }}>
        <SectionTitle tip="Daily transcription accuracy over the past 7 days.">7-Day Accuracy Trend</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {ACCURACY_DAYS.map(({ day, val }) => (
            <div key={day} className="flex-1 min-w-[70px] rounded-lg border border-navy-light text-center py-2.5" style={{ background: "hsl(220 45% 16%)" }}>
              <div className="text-xs text-muted-foreground mb-1">{day}</div>
              <div className="text-sm font-bold text-teal">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 5 — Playback & Compliance ───────────────────────────────────────────

const PHI_BREAKDOWN = [
  { type: "Patient Name", pct: 38 }, { type: "Date of Birth", pct: 22 },
  { type: "Insurance ID", pct: 19 }, { type: "SSN Fragment", pct: 11 },
  { type: "Phone Number", pct: 7 }, { type: "Other", pct: 3 },
];
const REDACTION_LOG = [
  { id: "#8841", agent: "Martinez, Sofia", duration: "4:23", fields: "Name, DOB, Ins. ID" },
  { id: "#8840", agent: "Nguyen, David", duration: "6:11", fields: "Name, SSN" },
  { id: "#8839", agent: "Patel, Priya", duration: "3:48", fields: "Name, DOB" },
  { id: "#8838", agent: "Martinez, Sofia", duration: "5:02", fields: "Ins. ID, Phone" },
  { id: "#8837", agent: "Nguyen, David", duration: "4:37", fields: "Name, DOB, Ins. ID" },
  { id: "#8836", agent: "Patel, Priya", duration: "7:14", fields: "Name, SSN, Phone" },
];

function Tab5PlaybackAndCompliance() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <LegacyKpiTile label="Avg Summary Read Time" value="28 sec" status="blue" />
        <LegacyKpiTile label="Review Time Saved (MTD)" value="847 hrs" status="green" />
        <LegacyKpiTile label="Summaries Generated" value="4,203" status="blue" />
        <LegacyKpiTile label="PHI Events Redacted" value="14,203" status="green" />
        <LegacyKpiTile label="Avg PHI / Call" value="3.2" status="green" />
        <LegacyKpiTile label="Compliance Coverage" value="100%" status="green" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 rounded-xl border border-navy-light p-5" style={{ background: "hsl(220 55% 10%)" }}>
          <SectionTitle tip="Comparison of average supervisor review time before vs. after AI summaries.">Productivity Impact</SectionTitle>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-white/70">Before — Avg call review time</span>
                <span className="text-sm font-bold text-white/60">5.2 min</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsl(220 45% 16%)" }}>
                <div className="h-full w-full rounded-full" style={{ background: "hsl(220 35% 30%)" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-white font-medium">After — Avg summary review time</span>
                <span className="text-sm font-bold text-teal">28 sec</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "hsl(220 45% 16%)" }}>
                <div className="h-full rounded-full" style={{ width: "9%", background: "linear-gradient(90deg, hsl(172 70% 35%), hsl(172 70% 50%))" }} />
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-teal/20 bg-teal/5 px-4 py-3 text-center">
              <span className="text-teal font-bold text-lg">80% reduction</span>
              <span className="text-muted-foreground text-sm"> in review time per call</span>
            </div>
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-navy-light p-5" style={{ background: "hsl(220 55% 10%)" }}>
          <SectionTitle tip="An example structured call summary produced by the Playback Summary Bot.">Sample AI-Generated Summary</SectionTitle>
          <div className="rounded-xl border-l-4 border-teal p-4" style={{ background: "hsl(220 48% 8%)", fontFamily: "ui-monospace, monospace" }}>
            <div className="text-xs text-muted-foreground mb-3">Call #8841 · {daysFromToday(-3)} · 4:23 duration<br />Agent: Martinez, Sofia</div>
            <div className="text-xs font-bold text-teal uppercase tracking-widest mb-2">Summary</div>
            <p className="text-sm text-white/85 leading-relaxed mb-4">Patient called regarding prior authorization status for JASCAYD. Expressed frustration with 3-day delay. Agent confirmed PA submitted and escalated to PA specialist team.</p>
            <div className="space-y-1.5 border-t border-navy-light pt-3">
              <div className="text-xs"><span className="text-teal font-semibold">OUTCOME: </span><span className="text-white/80">Escalated — PA Specialist follow-up required</span></div>
              <div className="text-xs"><span className="text-amber-400 font-semibold">SENTIMENT: </span><span className="text-white/80">Frustrated → Resolved</span></div>
              <div className="text-xs"><span className="text-emerald-400 font-semibold">ACTION ITEM: </span><span className="text-white/80">PA team callback before 5 PM</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 xl:w-96 flex-shrink-0 rounded-xl border border-navy-light p-5" style={{ background: "hsl(220 55% 10%)" }}>
          <SectionTitle tip="Breakdown of PHI types automatically identified and redacted by the PII Redaction Bot.">PHI Field Breakdown</SectionTitle>
          <div className="space-y-3">
            {PHI_BREAKDOWN.map(({ type, pct: p }) => (
              <div key={type}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white/80 font-medium">{type}</span>
                  <span className="text-sm font-bold text-emerald-400">{p}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(220 45% 16%)" }}>
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-navy-light p-5" style={{ background: "hsl(220 55% 10%)" }}>
          <SectionTitle tip="Audit log of recent calls processed by the PII Redaction Bot.">Recent Call Redaction Log</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-navy-light">
                  {["Call ID", "Agent", "Duration", "PHI Fields Removed", "Status"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REDACTION_LOG.map(row => (
                  <tr key={row.id} className="border-b border-navy-light/30 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{row.id}</td>
                    <td className="py-2.5 pr-4 text-white font-medium">{row.agent}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{row.duration}</td>
                    <td className="py-2.5 pr-4 text-white/70 text-xs">{row.fields}</td>
                    <td className="py-2.5"><span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Clean</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 4 — Pharmacy Insights AI ─────────────────────────────────────────────

const GENIE_QA = [
  { q: "What percentage of calls required escalation this month?", a: "18% of calls (312 of 1,734) required escalation to senior staff." },
  { q: "Show me calls with pharmacy product issues reported.", a: "89 calls flagged · Top issues: dosage questions (34), refill status (28), side effects (17)" },
  { q: "What is the average handle time by queue?", a: "Refill Queue: 4.2 min avg · Prior Auth: 7.8 min avg · Customer Service: 5.1 min avg" },
  { q: "How many calls ended without full resolution last week?", a: "127 calls (8.9%) — most common reason: needs additional verification" },
];

function Tab6GenieAI() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LegacyKpiTile label="Queries This Month" value="312" status="blue" />
        <LegacyKpiTile label="Avg Time to Insight" value="1.4 sec" status="blue" />
        <LegacyKpiTile label="Data Records Queried" value="4.2M" status="blue" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <SectionTitle tip="Natural language questions submitted by analysts to Genie AI this month, with the structured answers returned.">Recent Queries & Answers</SectionTitle>
          {GENIE_QA.map(({ q, a }, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "hsl(220 55% 10%)", border: "1px solid hsl(220 35% 22%)", borderLeft: "4px solid hsl(172 70% 45% / 0.6)" }}>
              <div className="text-xs font-semibold text-teal/80 mb-1">Q:</div>
              <p className="text-sm text-white/70 mb-2 leading-snug">{q}</p>
              <div className="text-xs font-semibold text-muted-foreground mb-1">A:</div>
              <p className="text-sm text-white font-medium leading-snug">{a}</p>
            </div>
          ))}
        </div>
        <div className="lg:w-72 xl:w-80 flex-shrink-0">
          <SectionTitle tip="Genie AI accepts plain-English questions across all JASCAYD call data.">Natural Language Query</SectionTitle>
          <div className="rounded-xl border border-navy-light p-4" style={{ background: "hsl(220 55% 10%)" }}>
            <div className="rounded-lg border border-teal/30 p-3 mb-3" style={{ background: "hsl(220 48% 8%)" }}>
              <div className="text-sm text-muted-foreground mb-2">Ask anything about JASCAYD calls...</div>
              <div className="text-sm text-white/80 italic">"Show refill adherence trend for patients on JASCAYD in Q2..."</div>
              <div className="flex justify-end mt-3">
                <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center text-navy">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Powered by Genie AI · AssistRx</p>
          </div>
          <div className="mt-4 rounded-xl border border-navy-light p-4 space-y-3" style={{ background: "hsl(220 55% 10%)" }}>
            <SectionTitle tip="Distribution of analyst query topics submitted to Genie AI this month.">Top Query Categories</SectionTitle>
            {[
              { cat: "PA Status & Escalation", share: 31 }, { cat: "Refill & Adherence", share: 26 },
              { cat: "Enrollment Trends", share: 21 }, { cat: "Side Effect Reports", share: 14 }, { cat: "Other", share: 8 },
            ].map(({ cat, share }) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{cat}</span>
                  <span className="text-teal font-bold">{share}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(220 45% 16%)" }}>
                  <div className="h-full rounded-full bg-teal/60" style={{ width: `${share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2 — Call Quality Analysis ───────────────────────────────────────────

const SENT_COLORS = { vn: "#e74c3c", ng: "#e8784d", nt: "#b0b0b0", ps: "#7dba7d", vp: "#27ae60" };
const SENT_ZONES = [
  { from: -2, to: -1.2, color: SENT_COLORS.vn },
  { from: -1.2, to: -0.4, color: SENT_COLORS.ng },
  { from: -0.4, to: 0.4, color: SENT_COLORS.nt },
  { from: 0.4, to: 1.2, color: SENT_COLORS.ps },
  { from: 1.2, to: 2.0, color: SENT_COLORS.vp },
];
const SENT_GAUGES = [
  { title: "Call Clarity", value: 0.84 },
  { title: "Agent Professionalism", value: 0.92 },
  { title: "Overall Call Quality", value: 0.88 },
];
const SENT_BARS = [
  { label: "Clarity",        vn: 0,    ng: 12.0,  nt: 0,     ps: 43.0,  vp: 45.0 },
  { label: "Professionalism", vn: 0,    ng: 10.0,  nt: 0,     ps: 44.0,  vp: 46.0 },
  { label: "Issue Resolution", vn: 0,   ng: 12.0,  nt: 0,     ps: 45.0,  vp: 43.0 },
];
const SENT_FILTERS = [
  { label: "Dates All dates", active: true },
  { label: "Pharmacy Location (All)", active: false },
  { label: "Call Reason (All)", active: false },
  { label: "Queue Type (All)", active: false },
  { label: "Time Period (All)", active: false },
];

function SentimentGauge({ value, title }: { value: number; title: string }) {
  const cx = 110, cy = 108, r = 80, sw = 16;
  const toA = (v: number) => Math.PI - ((v + 2) / 4) * Math.PI;
  const arcPath = (v1: number, v2: number) => {
    const a1 = toA(v1), a2 = toA(v2);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy - r * Math.sin(a2);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const na = toA(value);
  const nx = cx + r * Math.cos(na), ny = cy - r * Math.sin(na);
  const scaleVals = [-2, -1.2, -0.4, 0.4, 1.2, 2];
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a202c", marginBottom: 2 }}>{title}</div>
      <svg viewBox="0 0 220 125" style={{ width: "100%", height: "auto", display: "block" }}>
        {SENT_ZONES.map(z => (
          <path key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth={sw} strokeLinecap="butt" />
        ))}
        <circle cx={nx.toFixed(1)} cy={ny.toFixed(1)} r="7" fill="#cccccc" stroke="white" strokeWidth="2.5" />
        {scaleVals.map(v => {
          const a = toA(v), lr = r + 17;
          const lx = cx + lr * Math.cos(a), ly = cy - lr * Math.sin(a);
          const anchor = Math.cos(a) < -0.15 ? "end" : Math.cos(a) > 0.15 ? "start" : "middle";
          return <text key={v} x={lx.toFixed(1)} y={(ly + 3).toFixed(1)} fontSize="8" textAnchor={anchor} fill="#555">{v}</text>;
        })}
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize="28" fontWeight="800" fill="#1a202c">{value}</text>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fill="#888">Average Sentiment Score</text>
      </svg>
    </div>
  );
}

function SentimentBarChart() {
  const LW = 130, CW = 620, BH = 34, GAP = 18;
  const totalH = SENT_BARS.length * (BH + GAP) + 60;
  const segs = ["vn","ng","nt","ps","vp"] as const;
  const segColors = [SENT_COLORS.vn, SENT_COLORS.ng, SENT_COLORS.nt, SENT_COLORS.ps, SENT_COLORS.vp];
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const barsY = SENT_BARS.length * (BH + GAP) - GAP + 8;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", padding: 16, marginTop: 0, marginBottom: 50 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1a202c", marginBottom: 8 }}>Sentiment Distribution by Channel</div>
      <svg viewBox={`0 0 ${LW + CW + 36} ${totalH}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {SENT_BARS.map((bar, bi) => {
          const y = bi * (BH + GAP);
          let x = LW;
          return (
            <g key={bar.label}>
              <text x={LW - 12} y={y + BH / 2 + 4} textAnchor="end" fontSize="11" fill="#444">{bar.label}</text>
              {segs.map((seg, si) => {
                const pct = bar[seg];
                const w = (pct / 100) * CW;
                const rx = x; x += w;
                return (
                  <g key={seg}>
                    <rect x={rx} y={y} width={w} height={BH} fill={segColors[si]} />
                    {pct >= 4 && (
                      <text x={rx + w / 2} y={y + BH / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">
                        {pct}%
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={LW + CW + 5} y={y + BH / 2 + 4} fontSize="10" fill="#666">100%</text>
            </g>
          );
        })}
        {/* X-axis ticks */}
        {ticks.map(t => {
          const tx = LW + (t / 100) * CW;
          return (
            <g key={t}>
              <line x1={tx} y1={barsY} x2={tx} y2={barsY + 5} stroke="#ccc" />
              <text x={tx} y={barsY + 14} textAnchor="middle" fontSize="9" fill="#888">{t}%</text>
            </g>
          );
        })}
        <text x={LW + CW / 2} y={barsY + 26} textAnchor="middle" fontSize="10" fill="#888">Interactions %</text>
        {/* Legend */}
        {[
          { color: SENT_COLORS.vn, label: "Very Negative" },
          { color: SENT_COLORS.ng, label: "Negative" },
          { color: SENT_COLORS.nt, label: "Neutral" },
          { color: SENT_COLORS.ps, label: "Positive" },
          { color: SENT_COLORS.vp, label: "Very Positive" },
        ].map((item, i) => {
          const lx = LW + (i / 5) * CW + 10;
          const ly = barsY + 42;
          return (
            <g key={item.label}>
              <rect x={lx} y={ly - 8} width={10} height={10} fill={item.color} rx="1" />
              <text x={lx + 14} y={ly} fontSize="10" fill="#555">{item.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TabSentimentAnalysis() {
  const [filters, setFilters] = useState(SENT_FILTERS);
  return (
    <div style={{ background: "#f4f6f9", minHeight: "calc(100vh - 48px)", fontFamily: "Inter, sans-serif", marginBottom: 100 }}>
      {/* Title area */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 20px 10px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
          All Dashboards
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#4a5568", flexShrink: 0 }}>AL</div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#1a202c", margin: 0 }}>Sentiment Analysis</h1>
              {[
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
              ].map((icon, i) => (
                <button key={i} style={{ color: "#9ca3af", background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 2 }}>{icon}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {["Verint", "Sentiment Scoring Bot", "IA Categories"].map(tag => (
                <span key={tag} style={{ fontSize: 11, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 12, padding: "2px 8px", color: "#475569" }}>🏷 {tag}</span>
              ))}
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Updated 21 hours ago</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", minWidth: 260 }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>V</div>
            <input type="text" placeholder="Search in AOS Workspace" style={{ flex: 1, fontSize: 12, outline: "none", border: "none", background: "transparent", color: "#374151" }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", padding: "8px 20px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        {filters.map((f, i) => (
          <button key={f.label} onClick={() => setFilters(prev => prev.map((p, j) => ({ ...p, active: i === j })))}
            style={{
              fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 12, cursor: "pointer",
              border: f.active ? "none" : `1px solid ${TEAL}`,
              background: f.active ? TEAL : "#fff",
              color: f.active ? "#fff" : TEAL,
              display: "flex", alignItems: "center", gap: 4,
            }}>
            {f.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 20 }}>
        {/* Gauge row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
          {SENT_GAUGES.map(g => <SentimentGauge key={g.title} title={g.title} value={g.value} />)}
        </div>
        {/* Bar chart */}
        <SentimentBarChart />
      </div>
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

const TAB_PANELS = [
  Tab0QualityDashboard,
  ExplorePerformance,
  TabSentimentAnalysis,
  DiscoverTrends,
  GenieAI,
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const [activeTab, setActiveTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ActivePanel = TAB_PANELS[activeTab];
  const isFullPage = activeTab === 1 || activeTab === 2 || activeTab === 3 || activeTab === 4;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", height: "100vh" }}>
      <VerintHeader onMenuClick={() => setMobileOpen(true)} />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <NarrowSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <MobileDrawer
          open={mobileOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setMobileOpen(false)}
        />

        <main style={{ background: PAGE_BG, flex: 1, overflowY: "auto", paddingTop: HEADER_H }} className="lg:pl-12">
        {!isFullPage && <PageTitleArea activeTab={activeTab} />}
        {activeTab === 0 && <FilterBar />}

        {isFullPage
          ? activeTab === 3
            ? <DiscoverTrends onNavigate={setActiveTab} />
            : activeTab === 4
              ? <GenieAI />
              : <ActivePanel />
          : (
            <div
              className="p-5"
              style={activeTab === 0
                ? { background: PAGE_BG, marginTop: 20, marginBottom: 20 }
                : { background: "hsl(220 50% 9%)", minHeight: "calc(100vh - 160px)", marginTop: 20, marginBottom: 20 }
              }
            >
              <ActivePanel />
            </div>
          )
        }
      </main>
      </div>
    </div>
  );
}
