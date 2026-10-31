import { SF_BLUE } from "./SfPrimitives";
import type { Stage } from "../stages/types";
import { Zap, CornerUpRight, Loader2 } from "lucide-react";
import { FC_BLUE } from "./SfControls";


// ─── Stage Card ──────────────────────────────────────────────────────────────

export function StageCard({ stage, onHeaderClick }: { stage: Stage; onHeaderClick?: (stage: Stage) => void }) {
  const isRunning = stage.statusLabel === "Running";
  const isInProgress = stage.statusLabel === "In Progress";
  const isSubmitted = stage.statusLabel === "Submitted";
  // Active + waiting: the stage has actually started (not blocked on an
  // earlier stage, so not isNotStarted) but hasn't resolved yet (not
  // isComplete) — e.g. EA "Pending - Welcome message sent", BI "Running",
  // PA "Submitted - Awaiting Approval", PA "Letter sent". Terminal states
  // like "Not needed"/"Not Applicable" are modeled as isComplete: true, and
  // stages genuinely blocked upstream are isNotStarted: true, so neither
  // gets this treatment.
  const isActiveWaiting = !stage.isComplete && !stage.isNotStarted;
  // Skipped stages get a compact, muted row: dashed icon, gray title, short
  // reason. They stay clickable. Keyed on the status label, not the flow.
  if (stage.statusLabel === "Not needed") {
    return (
      <div
        className="flex items-center gap-2.5 py-1.5 border-b border-[#dddbda] last:border-b-0"
        data-stage-skipped
      >
        <div
          className="flex items-center justify-center shrink-0 rounded-full"
          style={{ width: 20, height: 20, border: "1.5px dashed #c9c7c5", color: "#9a9a9a" }}
        >
          <CornerUpRight size={11} />
        </div>
        <span
          className="text-[12px] text-[#706e6b] shrink-0 cursor-pointer hover:underline"
          onClick={() => onHeaderClick?.(stage)}
        >
          {stage.name} - {stage.id}
        </span>
        <span
          className="flex-1 min-w-0 truncate text-right text-[11px] italic text-[#9a9a9a]"
          title={stage.statusDetail}
        >
          Skipped - {stage.statusDetail}
        </span>
      </div>
    );
  }

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
      style={isActiveWaiting ? { background: "linear-gradient(90deg, #f0f7ff 0%, #fff 100%)" } : undefined}
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
