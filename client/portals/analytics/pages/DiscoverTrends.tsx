import { useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RCTooltip, ResponsiveContainer, Area,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TileData {
  name: string;
  value: number;
  color: string;
  volume: string;
  absChange: string;
  relChange: string;
  terms: string;
}

type LayoutTile = TileData & { rx: number; ry: number; rw: number; rh: number };

// ─── Treemap Data ─────────────────────────────────────────────────────────────

const TILES: TileData[] = [
  { name: "Prior Auth",         value: 35, color: "#7b2ff7", volume: "31.6%", absChange: "5.7%",  relChange: "10.2%", terms: "prior auth, denial" },
  { name: "Copay Assistance",   value: 20, color: "#9c6cd4", volume: "18.2%", absChange: "2.1%",  relChange: "3.8%",  terms: "copay, assistance" },
  { name: "Escalations",        value: 12, color: "#b39ddb", volume: "11.4%", absChange: "1.8%",  relChange: "2.4%",  terms: "supervisor, escalate" },
  { name: "Refill Status",      value: 18, color: "#90a4ae", volume: "19.1%", absChange: "-0.5%", relChange: "-0.8%", terms: "refill, status" },
  { name: "Insurance Denial",   value: 10, color: "#9575cd", volume: "9.6%",  absChange: "1.2%",  relChange: "1.9%",  terms: "denied, coverage" },
  { name: "Step Therapy",       value: 5,  color: "#8e24aa", volume: "4.8%",  absChange: "0.7%",  relChange: "1.1%",  terms: "step therapy, fail first" },
  { name: "Repeat Calls",       value: 8,  color: "#7e57c2", volume: "7.3%",  absChange: "0.9%",  relChange: "1.4%",  terms: "callback, follow-up" },
  { name: "Drug Cost",          value: 4,  color: "#ab47bc", volume: "3.9%",  absChange: "0.4%",  relChange: "0.6%",  terms: "cost, expensive" },
  { name: "Formulary",          value: 3,  color: "#ce93d8", volume: "2.8%",  absChange: "0.2%",  relChange: "0.3%",  terms: "formulary, tier" },
  { name: "Adherence",          value: 3,  color: "#d1c4e9", volume: "2.7%",  absChange: "0.1%",  relChange: "0.2%",  terms: "adherence, missed dose" },
  { name: "Specialty Benefit",  value: 2,  color: "#9c27b0", volume: "2.1%",  absChange: "0.3%",  relChange: "0.5%",  terms: "specialty benefit" },
  { name: "Patient Assistance", value: 4,  color: "#ba68c8", volume: "3.8%",  absChange: "0.5%",  relChange: "0.8%",  terms: "PAP, manufacturer" },
  { name: "Shipping Delay",     value: 2,  color: "#ce93d8", volume: "1.9%",  absChange: "0.1%",  relChange: "0.2%",  terms: "shipping, delivery" },
];

// ─── Slice-and-dice treemap layout ────────────────────────────────────────────

function layoutTiles(tiles: TileData[], x: number, y: number, w: number, h: number): LayoutTile[] {
  if (tiles.length === 0) return [];
  if (tiles.length === 1) return [{ ...tiles[0], rx: x + 1, ry: y + 1, rw: Math.max(0, w - 2), rh: Math.max(0, h - 2) }];

  const total = tiles.reduce((s, t) => s + t.value, 0);
  let acc = 0;
  let splitIdx = tiles.length - 1;
  const half = total / 2;
  for (let i = 0; i < tiles.length - 1; i++) {
    acc += tiles[i].value;
    if (acc >= half) { splitIdx = i + 1; break; }
  }

  const leftTiles = tiles.slice(0, splitIdx);
  const rightTiles = tiles.slice(splitIdx);
  const leftFrac = leftTiles.reduce((s, t) => s + t.value, 0) / total;

  if (w >= h) {
    const sw = w * leftFrac;
    return [...layoutTiles(leftTiles, x, y, sw, h), ...layoutTiles(rightTiles, x + sw, y, w - sw, h)];
  } else {
    const sh = h * leftFrac;
    return [...layoutTiles(leftTiles, x, y, w, sh), ...layoutTiles(rightTiles, x, y + sh, w, h - sh)];
  }
}

// ─── Word Cloud ───────────────────────────────────────────────────────────────

const WORDS = [
  // Large focal words
  { text: "prior auth",     size: 42, color: "#6a1b9a", x: "24%",  y: "42%" },
  { text: "denied",         size: 38, color: "#6a1b9a", x: "64%",  y: "55%" },
  { text: "copay",          size: 32, color: "#9c27b0", x: "58%",  y: "20%" },
  { text: "formulary",      size: 30, color: "#9c27b0", x: "86%",  y: "30%" },
  { text: "refill",         size: 28, color: "#9c27b0", x: "38%",  y: "64%" },
  // Medium words
  { text: "coverage",       size: 24, color: "#9c27b0", x: "8%",   y: "22%" },
  { text: "assistance",     size: 22, color: "#ab47bc", x: "78%",  y: "70%" },
  { text: "adherence",      size: 20, color: "#ab47bc", x: "90%",  y: "50%" },
  // Small words
  { text: "step therapy",   size: 14, color: "#ce93d8", x: "42%",  y: "9%"  },
  { text: "deductible",     size: 13, color: "#ba68c8", x: "18%",  y: "11%" },
  { text: "specialty drug", size: 13, color: "#ba68c8", x: "76%",  y: "11%" },
  { text: "appeal",         size: 12, color: "#ba68c8", x: "9%",   y: "50%" },
  { text: "waiting",        size: 12, color: "#ba68c8", x: "70%",  y: "38%" },
  // Tiny words
  { text: "tier",           size: 11, color: "#aaaaaa", x: "5%",   y: "66%" },
  { text: "biosimilar",     size: 11, color: "#aaaaaa", x: "5%",   y: "80%" },
  { text: "shipping",       size: 11, color: "#aaaaaa", x: "22%",  y: "78%" },
  { text: "out-of-pocket",  size: 11, color: "#aaaaaa", x: "40%",  y: "82%" },
  { text: "infusion",       size: 11, color: "#aaaaaa", x: "18%",  y: "90%" },
  { text: "exception",      size: 11, color: "#aaaaaa", x: "5%",   y: "91%" },
  { text: "PAP",            size: 11, color: "#aaaaaa", x: "58%",  y: "82%" },
  { text: "reauthorization",size: 11, color: "#aaaaaa", x: "72%",  y: "84%" },
  { text: "injection",      size: 11, color: "#aaaaaa", x: "85%",  y: "78%" },
  { text: "clinical",       size: 11, color: "#aaaaaa", x: "88%",  y: "90%" },
];

// ─── Trend Chart Data ─────────────────────────────────────────────────────────

const TREND_DATA = [
  { date: "Sep 13", churn: 29.3, newCC: 27.0, volume: 1200 },
  { date: "Sep 14", churn: 30.1, newCC: 27.3, volume: 1350 },
  { date: "Sep 15", churn: 29.7, newCC: 27.5, volume: 1280 },
  { date: "Sep 16", churn: 30.5, newCC: 27.8, volume: 1420 },
  { date: "Sep 17", churn: 31.0, newCC: 28.2, volume: 1500 },
  { date: "Sep 18", churn: 31.6, newCC: 28.7, volume: 1680 },
  { date: "Sep 19", churn: 32.0, newCC: 29.0, volume: 1800 },
]; // keys: churn = Prior Auth Denials %, newCC = Copay Assistance %

// ─── Sub-nav tabs ─────────────────────────────────────────────────────────────

const SUB_TABS = ["Trends", "Theme", "All Topics"];

// ─── Controls row (shared between treemap and word cloud panels) ──────────────

function ControlsRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "#555" }}>Size</span>
      <select style={{ fontSize: 12, border: "1px solid #e0e0e0", borderRadius: 4, padding: "2px 6px", background: "#fff", color: "#333" }}>
        <option>Volume %</option>
        <option>Count</option>
      </select>
      <span style={{ fontSize: 12, color: "#555" }}>Color</span>
      <select style={{ fontSize: 12, border: "1px solid #e0e0e0", borderRadius: 4, padding: "2px 6px", background: "#fff", color: "#333" }}>
        <option>Rel. Change</option>
        <option>Abs. Change</option>
      </select>
      {/* gradient bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
        <span style={{ fontSize: 11, color: "#888" }}>▲</span>
        <div style={{ width: 80, height: 10, borderRadius: 3, background: "linear-gradient(90deg, #4fc3f7, #9c27b0)" }} />
        <span style={{ fontSize: 11, color: "#888" }}>▼</span>
      </div>
      {/* view toggles */}
      <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
        <button style={{ width: 26, height: 26, border: "1px solid #e0e0e0", borderRadius: 4, background: "#e8e8e8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="#555"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
        </button>
        <button style={{ width: 26, height: 26, border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="#999"><rect x="1" y="3" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="11" width="14" height="2" rx="1"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── Treemap SVG Component ────────────────────────────────────────────────────

interface TreemapProps {
  onTileClick: (tile: TileData) => void;
  selectedTile: string | null;
}

function Treemap({ onTileClick, selectedTile }: TreemapProps) {
  const TW = 460;
  const TH = 280;
  const laid = layoutTiles(TILES, 0, 0, TW, TH);

  return (
    <svg
      viewBox={`0 0 ${TW} ${TH}`}
      style={{ width: "100%", height: TH, display: "block", cursor: "pointer" }}
    >
      {laid.map((tile) => {
        const isSmall = tile.rw < 60 || tile.rh < 36;
        const isSelected = tile.name === selectedTile;
        return (
          <g key={tile.name} onClick={() => onTileClick(tile)}>
            <rect
              x={tile.rx}
              y={tile.ry}
              width={tile.rw}
              height={tile.rh}
              fill={tile.color}
              stroke="#fff"
              strokeWidth={2}
              opacity={isSelected ? 1 : 0.92}
              rx={1}
            />
            {(() => {
              if (tile.rw < 40 || tile.rh < 20) return null;
              const fs = tile.rw > 140 ? 16 : tile.rw > 90 ? 13 : tile.rw > 60 ? 11 : 9;
              const fw = tile.rw > 100 ? "700" : "600";
              const cx = tile.rx + tile.rw / 2;
              const cy = tile.ry + tile.rh / 2;
              const maxChars = Math.floor((tile.rw - 8) / (fs * 0.58));
              const words = tile.name.split(" ");
              const needsWrap = tile.name.length > maxChars && words.length > 1;
              const lineH = fs * 1.25;
              if (needsWrap) {
                const mid = Math.ceil(words.length / 2);
                const line1 = words.slice(0, mid).join(" ");
                const line2 = words.slice(mid).join(" ");
                if (tile.rh < lineH * 2 + 4) {
                  // Not tall enough for two lines — show one truncated line
                  const truncated = tile.name.length > maxChars ? tile.name.slice(0, maxChars - 1) + "…" : tile.name;
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize={fs} fontWeight={fw}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {truncated}
                    </text>
                  );
                }
                return (
                  <text textAnchor="middle" fill="#fff" fontSize={fs} fontWeight={fw}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    <tspan x={cx} y={cy - lineH / 2}>{line1}</tspan>
                    <tspan x={cx} y={cy + lineH / 2}>{line2}</tspan>
                  </text>
                );
              }
              const label = tile.name.length > maxChars ? tile.name.slice(0, maxChars - 1) + "…" : tile.name;
              return (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize={fs} fontWeight={fw}
                  style={{ pointerEvents: "none", userSelect: "none" }}>
                  {label}
                </text>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Tooltip Popup ─────────────────────────────────────────────────────────────

interface TooltipCardProps {
  tile: TileData;
  onClose: () => void;
  onNavigate: (tab: number) => void;
}

function TooltipCard({ tile, onClose, onNavigate }: TooltipCardProps) {
  return (
    <div style={{
      position: "absolute",
      top: 40,
      left: 20,
      zIndex: 20,
      width: 260,
      background: "#fff",
      borderRadius: 6,
      boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      fontFamily: "Inter, sans-serif",
      fontSize: 13,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 8px", borderBottom: "1px solid #e0e0e0" }}>
        <span style={{ fontWeight: 700, color: "#1a202c" }}>{tile.name}</span>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888", lineHeight: 1, padding: "0 2px" }}
        >×</button>
      </div>
      {/* Data rows */}
      <div style={{ padding: "8px 14px" }}>
        {[
          { label: "Volume", value: tile.volume },
          { label: "Absolute change", value: tile.absChange },
          { label: "Relative change", value: tile.relChange },
          { label: "Impacting terms", value: tile.terms },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 32 }}>
            <span style={{ color: "#888" }}>{label}</span>
            <span style={{ color: "#1a202c", fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>
      {/* Divider */}
      <div style={{ height: 1, background: "#e0e0e0", margin: "0 14px" }} />
      {/* Actions */}
      <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        {["Analyze categories", "Analyze interactions", "AI Insights"].map((action) => (
          <a
            key={action}
            href="#"
            style={{ color: "#0070d2", fontSize: 13, textDecoration: "none", cursor: "pointer" }}
            onClick={(e) => {
              e.preventDefault();
              if (action === "AI Insights") onNavigate(4);
            }}
          >
            {action}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Terms & Phrases Chip Panel ──────────────────────────────────────────────

function WordCloud() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 0", alignContent: "flex-start", minHeight: 280 }}>
      {WORDS.map((w) => {
        const scale = (w.size - 11) / (42 - 11); // 0–1
        const fs = 11 + scale * 7;               // 11px–18px
        const bg = `rgba(124, 47, 247, ${0.07 + scale * 0.18})`;
        const border = `rgba(124, 47, 247, ${0.18 + scale * 0.3})`;
        const color = w.size >= 28 ? "#5b21b6" : w.size >= 18 ? "#7c3aed" : "#6d28d9";
        const fw = w.size >= 28 ? 700 : w.size >= 18 ? 600 : 400;
        return (
          <span
            key={w.text}
            style={{
              display: "inline-block",
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 20,
              padding: `${3 + Math.round(scale * 3)}px ${8 + Math.round(scale * 6)}px`,
              fontSize: fs,
              fontWeight: fw,
              color,
              whiteSpace: "nowrap",
              cursor: "default",
              userSelect: "none",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}

// ─── Custom Tooltip for Recharts ──────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 4, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "#333" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 6, alignItems: "center", color: "#555" }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span>{p.name}: <strong>{p.value}{p.name === "Daily Volume" ? "" : "%"}</strong></span>
        </div>
      ))}
    </div>
  );
}

// ─── Trend Time Range Buttons ─────────────────────────────────────────────────

const TIME_RANGES = ["1W", "1M", "3M", "6M", "YTD", "1Y", "All"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DiscoverTrends({ onNavigate }: { onNavigate?: (tab: number) => void }) {
  const [subTab, setSubTab] = useState(0);
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [activeRange, setActiveRange] = useState(0);
  const [searchLegend, setSearchLegend] = useState("");

  const getDateRange = (rangeIdx: number): { from: string; to: string } => {
    const today = new Date(2026, 5, 23); // Jun 23, 2026 (today)
    const to = new Date(today);
    let from = new Date(today);

    const ranges = TIME_RANGES;
    switch (ranges[rangeIdx]) {
      case "1W":
        from.setDate(to.getDate() - 7);
        break;
      case "1M":
        from.setMonth(to.getMonth() - 1);
        break;
      case "3M":
        from.setMonth(to.getMonth() - 3);
        break;
      case "6M":
        from.setMonth(to.getMonth() - 6);
        break;
      case "YTD":
        from = new Date(2026, 0, 1);
        break;
      case "1Y":
        from.setFullYear(to.getFullYear() - 1);
        break;
      case "All":
        from = new Date(2024, 0, 1);
        break;
      default:
        break;
    }

    const formatDate = (d: Date) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };

    return { from: formatDate(from), to: formatDate(to) };
  };

  const dateRange = getDateRange(activeRange);

  const getChartData = (rangeIdx: number) => {
    const ranges = TIME_RANGES;
    const range = ranges[rangeIdx];
    const baselineDate = new Date(2026, 5, 23); // Jun 23, 2026

    const formatDateShort = (d: Date) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    };

    let dataPoints: typeof TREND_DATA;

    if (range === "1W") {
      // Last 7 days - recent daily variation
      dataPoints = [
        { date: "Jun 17", churn: 29.3, newCC: 27.0, volume: 1200 },
        { date: "Jun 18", churn: 30.1, newCC: 27.3, volume: 1350 },
        { date: "Jun 19", churn: 29.7, newCC: 27.5, volume: 1280 },
        { date: "Jun 20", churn: 30.5, newCC: 27.8, volume: 1420 },
        { date: "Jun 21", churn: 31.0, newCC: 28.2, volume: 1500 },
        { date: "Jun 22", churn: 31.6, newCC: 28.7, volume: 1680 },
        { date: "Jun 23", churn: 32.0, newCC: 29.0, volume: 1800 },
      ];
    } else if (range === "1M") {
      // Last 30 days - smoother variation
      const d1 = new Date(baselineDate), d2 = new Date(baselineDate), d3 = new Date(baselineDate), d4 = new Date(baselineDate), d5 = new Date(baselineDate), d6 = new Date(baselineDate), d7 = new Date(baselineDate);
      d1.setDate(baselineDate.getDate() - 30);
      d2.setDate(baselineDate.getDate() - 25);
      d3.setDate(baselineDate.getDate() - 20);
      d4.setDate(baselineDate.getDate() - 15);
      d5.setDate(baselineDate.getDate() - 10);
      d6.setDate(baselineDate.getDate() - 5);
      d7.setDate(baselineDate.getDate());
      dataPoints = [
        { date: formatDateShort(d1), churn: 30.8, newCC: 27.2, volume: 1320 },
        { date: formatDateShort(d2), churn: 31.1, newCC: 27.5, volume: 1380 },
        { date: formatDateShort(d3), churn: 31.4, newCC: 27.8, volume: 1450 },
        { date: formatDateShort(d4), churn: 31.3, newCC: 28.0, volume: 1520 },
        { date: formatDateShort(d5), churn: 31.6, newCC: 28.3, volume: 1620 },
        { date: formatDateShort(d6), churn: 31.8, newCC: 28.6, volume: 1710 },
        { date: formatDateShort(d7), churn: 32.0, newCC: 29.0, volume: 1800 },
      ];
    } else if (range === "3M") {
      // Last 3 months - seasonal trend
      const d1 = new Date(baselineDate), d2 = new Date(baselineDate), d3 = new Date(baselineDate), d4 = new Date(baselineDate), d5 = new Date(baselineDate), d6 = new Date(baselineDate), d7 = new Date(baselineDate);
      d1.setDate(baselineDate.getDate() - 90);
      d2.setDate(baselineDate.getDate() - 75);
      d3.setDate(baselineDate.getDate() - 60);
      d4.setDate(baselineDate.getDate() - 45);
      d5.setDate(baselineDate.getDate() - 30);
      d6.setDate(baselineDate.getDate() - 15);
      d7.setDate(baselineDate.getDate());
      dataPoints = [
        { date: formatDateShort(d1), churn: 29.5, newCC: 26.8, volume: 1150 },
        { date: formatDateShort(d2), churn: 30.1, newCC: 27.1, volume: 1240 },
        { date: formatDateShort(d3), churn: 30.6, newCC: 27.4, volume: 1340 },
        { date: formatDateShort(d4), churn: 31.2, newCC: 27.8, volume: 1450 },
        { date: formatDateShort(d5), churn: 31.6, newCC: 28.2, volume: 1580 },
        { date: formatDateShort(d6), churn: 31.8, newCC: 28.6, volume: 1690 },
        { date: formatDateShort(d7), churn: 32.0, newCC: 29.0, volume: 1800 },
      ];
    } else if (range === "6M") {
      // Last 6 months - steady upward trend
      const d1 = new Date(baselineDate), d2 = new Date(baselineDate), d3 = new Date(baselineDate), d4 = new Date(baselineDate), d5 = new Date(baselineDate), d6 = new Date(baselineDate), d7 = new Date(baselineDate);
      d1.setDate(baselineDate.getDate() - 180);
      d2.setDate(baselineDate.getDate() - 150);
      d3.setDate(baselineDate.getDate() - 120);
      d4.setDate(baselineDate.getDate() - 90);
      d5.setDate(baselineDate.getDate() - 60);
      d6.setDate(baselineDate.getDate() - 30);
      d7.setDate(baselineDate.getDate());
      dataPoints = [
        { date: formatDateShort(d1), churn: 28.2, newCC: 26.0, volume: 1000 },
        { date: formatDateShort(d2), churn: 28.9, newCC: 26.4, volume: 1080 },
        { date: formatDateShort(d3), churn: 29.7, newCC: 26.8, volume: 1180 },
        { date: formatDateShort(d4), churn: 30.4, newCC: 27.2, volume: 1310 },
        { date: formatDateShort(d5), churn: 31.1, newCC: 27.7, volume: 1450 },
        { date: formatDateShort(d6), churn: 31.6, newCC: 28.4, volume: 1650 },
        { date: formatDateShort(d7), churn: 32.0, newCC: 29.0, volume: 1800 },
      ];
    } else if (range === "YTD") {
      // Year to date (Jan 1 - Jun 23) - strong upward trend
      dataPoints = [
        { date: "Jan 01", churn: 27.1, newCC: 25.3, volume: 850 },
        { date: "Feb 15", churn: 28.3, newCC: 25.8, volume: 950 },
        { date: "Mar 30", churn: 29.2, newCC: 26.3, volume: 1050 },
        { date: "Apr 30", churn: 30.1, newCC: 26.9, volume: 1200 },
        { date: "May 30", churn: 31.2, newCC: 27.7, volume: 1500 },
        { date: "Jun 15", churn: 31.6, newCC: 28.3, volume: 1650 },
        { date: "Jun 23", churn: 32.0, newCC: 29.0, volume: 1800 },
      ];
    } else if (range === "1Y") {
      // One year - seasonal variation with growth
      dataPoints = [
        { date: "Jun 23, 2025", churn: 27.8, newCC: 26.2, volume: 1100 },
        { date: "Aug 15, 2025", churn: 28.5, newCC: 26.6, volume: 1180 },
        { date: "Oct 10, 2025", churn: 29.1, newCC: 27.0, volume: 1250 },
        { date: "Dec 15, 2025", churn: 29.8, newCC: 27.5, volume: 1350 },
        { date: "Feb 20, 2026", churn: 30.5, newCC: 27.8, volume: 1450 },
        { date: "Apr 25, 2026", churn: 31.2, newCC: 28.4, volume: 1600 },
        { date: "Jun 23, 2026", churn: 32.0, newCC: 29.0, volume: 1800 },
      ];
    } else {
      // All time - long-term trend from 2024
      dataPoints = [
        { date: "Jan 01", churn: 25.2, newCC: 24.0, volume: 650 },
        { date: "Feb 15", churn: 26.1, newCC: 24.6, volume: 780 },
        { date: "Mar 30", churn: 27.3, newCC: 25.2, volume: 880 },
        { date: "May 15", churn: 28.8, newCC: 25.9, volume: 1050 },
        { date: "Jun 01", churn: 30.3, newCC: 27.2, volume: 1350 },
        { date: "Jun 15", churn: 31.2, newCC: 28.2, volume: 1650 },
        { date: "Jun 23", churn: 32.0, newCC: 29.0, volume: 1800 },
      ];
    }

    return dataPoints;
  };

  const chartData = getChartData(activeRange);

  const handleTileClick = (tile: TileData) => {
    setSelectedTile((prev) => (prev?.name === tile.name ? null : tile));
  };

  return (
    <div style={{ background: "#f4f6f9", minHeight: "calc(100vh - 48px)", fontFamily: "Inter, sans-serif", marginBottom: 100 }}>
      {/* Sub-navigation bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e0e0e0", paddingLeft: 24, display: "flex", alignItems: "center", height: 36 }}>
        {SUB_TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setSubTab(i)}
            style={{
              background: "none",
              border: "none",
              borderBottom: subTab === i ? "2px solid #1976d2" : "2px solid transparent",
              color: subTab === i ? "#1976d2" : "#555",
              fontWeight: subTab === i ? 600 : 400,
              fontSize: 13,
              padding: "0 14px",
              height: "100%",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px 32px", marginBottom: 100 }}>
        {/* Page title */}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a202c", marginBottom: 20 }}>Discover Trends</h2>

        {/* Two-column top section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* LEFT: Search Results (Treemap) */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a202c", marginBottom: 8 }}>Search Results</div>
            <ControlsRow />
            <div style={{ position: "relative" }}>
              <Treemap onTileClick={handleTileClick} selectedTile={selectedTile?.name ?? null} />
              {selectedTile && (
                <TooltipCard tile={selectedTile} onClose={() => setSelectedTile(null)} onNavigate={(tab) => { setSelectedTile(null); onNavigate?.(tab); }} />
              )}
            </div>
          </div>

          {/* RIGHT: Terms & Phrases (Word Cloud) */}
          <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a202c", marginBottom: 8 }}>Terms &amp; Phrases</div>
            <ControlsRow />
            <WordCloud />
          </div>
        </div>

        {/* Trend View */}
        <div style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, marginBottom: 50 }}>
          <div style={{ padding: "12px 16px 0", fontSize: 13, fontWeight: 700, color: "#1a202c" }}>Trend View</div>

          <div style={{ display: "flex", minHeight: 300 }}>
            {/* Left legend panel */}
            <div style={{ width: 210, flexShrink: 0, borderRight: "1px solid #e0e0e0", background: "#f8f8f8", padding: 12 }}>
              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff", padding: "4px 8px", marginBottom: 12 }}>
                <input
                  value={searchLegend}
                  onChange={(e) => setSearchLegend(e.target.value)}
                  placeholder="Search"
                  style={{ border: "none", outline: "none", flex: 1, fontSize: 12, color: "#333", background: "transparent" }}
                />
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>

              {/* Current View */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#333", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>▼</span> Current View
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, paddingLeft: 10 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, background: "#2196f3", borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: "#333" }}>Prior Auth Denials</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 10 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, background: "#4caf50", borderRadius: 2 }} />
                  <span style={{ fontSize: 12, color: "#333" }}>Copay Assistance</span>
                </div>
              </div>

              {/* Recent Plot */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#333", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>▼</span> Recent Plot
                </div>
                <div style={{ fontSize: 12, color: "#333", paddingLeft: 10 }}>Insurance denial appeals</div>
              </div>
            </div>

            {/* Right chart area */}
            <div style={{ flex: 1, padding: "12px 16px 16px" }}>
              {/* Controls row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                {/* Time range buttons */}
                <div style={{ display: "flex", gap: 4 }}>
                  {TIME_RANGES.map((r, i) => (
                    <button
                      key={r}
                      onClick={() => setActiveRange(i)}
                      style={{
                        fontSize: 12,
                        padding: "3px 10px",
                        borderRadius: 4,
                        border: activeRange === i ? "1px solid #1976d2" : "1px solid #e0e0e0",
                        background: activeRange === i ? "#e3f2fd" : "#fff",
                        color: activeRange === i ? "#1976d2" : "#555",
                        fontWeight: activeRange === i ? 600 : 400,
                        cursor: "pointer",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {/* Date range */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#555" }}>
                  <span>From</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #e0e0e0", borderRadius: 4, padding: "3px 8px", background: "#fff" }}>
                    <span>{dateRange.from}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <span>To</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #e0e0e0", borderRadius: 4, padding: "3px 8px", background: "#fff" }}>
                    <span>{dateRange.to}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Dual-axis chart */}
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 60, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9c27b0" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#2196f3" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="pct"
                    domain={[27, 32.5]}
                    tickCount={7}
                    tick={{ fontSize: 11, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Percentage (%)", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 10, fill: "#888" } }}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <YAxis
                    yAxisId="vol"
                    orientation="right"
                    domain={[0, 4000]}
                    ticks={[0, 1000, 2000, 3000, 4000]}
                    tick={{ fontSize: 11, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Daily volume", angle: 90, position: "insideRight", offset: 12, style: { fontSize: 10, fill: "#888" } }}
                    tickFormatter={(v) => v === 0 ? "0" : `${v / 1000}K`}
                  />
                  <RCTooltip content={<ChartTooltip />} />
                  {/* Shaded area between lines */}
                  <Area
                    yAxisId="pct"
                    type="monotone"
                    dataKey="churn"
                    fill="url(#areaFill)"
                    stroke="none"
                    fillOpacity={1}
                    name="area-fill"
                    legendType="none"
                    tooltipType="none"
                    activeDot={false}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="churn"
                    stroke="#2196f3"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="Prior Auth Denials"
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="newCC"
                    stroke="#4caf50"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name="Copay Assistance"
                  />
                  <Line
                    yAxisId="vol"
                    type="monotone"
                    dataKey="volume"
                    stroke="#e0c0f0"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
                    name="Daily Volume"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
