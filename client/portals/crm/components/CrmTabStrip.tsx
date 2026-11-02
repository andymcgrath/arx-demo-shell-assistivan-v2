import type { Stage } from "../stages/types";
import { X, Zap } from "lucide-react";
import { FC_BLUE } from "./SfControls";

/** The id of the case home tab. Every other tab id is a stage id. */
export const HOME_TAB = "home";

interface CrmTabStripProps {
  /** HOME_TAB is the case home tab. Any other value is the id of an open stage. */
  activeTab: string;
  patientName: string;
  patientDob: string;
  /** Every stage the case has now, so each open tab shows the stage's live state. */
  stages: Stage[];
  openStageIds: string[];
  onSelect: (tabId: string) => void;
  onCloseStage: (stageId: string, e: React.MouseEvent) => void;
}

/** The row of tabs above the case: the patient, then one tab per open stage. */
export function CrmTabStrip({ activeTab, patientName, patientDob, stages, openStageIds, onSelect, onCloseStage }: CrmTabStripProps) {
  const patientInitials = patientName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="sticky top-0 z-10 border-b border-[#dddbda] flex items-end px-2 overflow-x-auto gap-1 overflow-y-hidden"
      style={{ background: "#f3f2f2", minHeight: 42 }}
    >
      {/* Active patient tab — identity sourced live from usePatientStore */}
      <div
        className="flex items-center gap-2 px-3 py-2 border border-[#dddbda] cursor-pointer select-none shrink-0 transition-colors"
        style={{
          borderRadius: "4px 4px 0 0",
          marginBottom: -1,
          background: activeTab === HOME_TAB ? "#fff" : "#ebe9e9",
          borderBottomColor: activeTab === HOME_TAB ? "#fff" : "#dddbda",
          boxShadow: activeTab === HOME_TAB ? "0 -1px 3px rgba(0,0,0,0.08)" : "none",
        }}
        onClick={() => onSelect(HOME_TAB)}
      >
        <div
          className="flex items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
          style={{ width: 20, height: 20, background: "linear-gradient(135deg, var(--crm-primary, #2dbcbb) 0%, var(--crm-primary-dark, #16818a) 100%)" }}
        >
          {patientInitials}
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[12px] font-semibold text-[#3e3e3c] whitespace-nowrap">{patientName}</span>
          <span className="text-[10px] text-[#706e6b]">DOB: {patientDob}</span>
        </div>
        <button className="ml-1 p-0.5 rounded hover:bg-[#e5e5e5] transition-colors">
          <X size={11} className="text-[#706e6b]" />
        </button>
      </div>

      {/* Dynamic stage tabs */}
      {openStageIds.map((stageId) => {
        const stage = stages.find((s) => s.id === stageId);
        if (!stage) return null;
        const isActive = activeTab === stage.id;
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
            onClick={() => onSelect(stage.id)}
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
              onClick={(e) => onCloseStage(stage.id, e)}
            >
              <X size={11} className="text-[#706e6b]" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
