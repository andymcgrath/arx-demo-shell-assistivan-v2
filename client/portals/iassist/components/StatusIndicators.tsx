/**
 * StatusDot / StatusDots / StatusBadge — ported verbatim from CoaDashboard
 * (wf3-coassist-v2, client/portals/provider/index.tsx). These are brand-
 * agnostic: colors are semantic (pipeline-stage dots, success/warning/error
 * badges), not tied to CoA's Heroic blue or iAssist's teal, so no recoloring
 * was needed — only the file location changed, to keep WF4 decoupled from
 * WF3's provider portal file.
 */
import type { PatientStatus } from "../data/samplePatients";

export function StatusDot({ color }: { color: string }) {
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

export function StatusDots({ dots }: { dots: PatientStatus["dots"] }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 border border-neutral-300 rounded-full bg-white w-fit">
      {dots.map((d, i) => (
        <StatusDot key={i} color={d} />
      ))}
    </div>
  );
}

export function StatusBadge({ status, color }: { status: string; color: "success" | "warning" | "error" }) {
  const bgColor = color === "success" ? "bg-neutral-100" : color === "warning" ? "bg-orange-100" : "bg-red-100";
  const textColor = color === "success" ? "text-neutral-600" : color === "warning" ? "text-orange-800" : "text-red-600";

  return <div className={`px-3 py-1 rounded text-xs font-semibold ${bgColor} ${textColor}`}>{status}</div>;
}
