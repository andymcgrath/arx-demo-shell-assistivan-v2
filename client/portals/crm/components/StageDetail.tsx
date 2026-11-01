import type { Stage } from "../stages/types";
import type { CrmAction } from "../stages/actions";
import { SF_SECTION_BG, FieldRow } from "./SfPrimitives";
import { FC_BLUE } from "./SfControls";
import { Zap } from "lucide-react";

interface StageDetailProps {
  stage: Stage;
  action: (id: string) => CrmAction | undefined;
  onAction: (action: CrmAction) => void;
}

/** The generic stage view: the stage's header, fields and buttons. */
export function StageDetail({ stage, action, onAction }: StageDetailProps) {
  return (
    <>
      <div className="p-4 max-w-3xl">
        <div className="border border-[#dddbda] rounded">
          <div
            className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
            style={{ background: SF_SECTION_BG, minHeight: 36 }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 24, height: 24, background: stage.isNotStarted ? "#9a9a9a" : FC_BLUE, borderRadius: 5 }}
            >
              <Zap size={12} className="text-white" fill="white" />
            </div>
            <span className="text-[13px] font-semibold text-[#3e3e3c]">
              {stage.id === "BI-14273" ? "Benefit Investigation Result" : stage.name} {stage.id}
            </span>
            {action("bi.check_status") && (
              <button
                onClick={() => onAction(action("bi.check_status")!)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: FC_BLUE }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Check Status
              </button>
            )}
            {action("pap.approve") && (
              <button
                onClick={() => onAction(action("pap.approve")!)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: FC_BLUE }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Approve Application
              </button>
            )}
            {action("pap.approved") && (
              <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>
                Approved
              </span>
            )}
            {action("provider_transfer.notify") && (
              <button
                onClick={() => onAction(action("provider_transfer.notify")!)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: FC_BLUE }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Notify Provider
              </button>
            )}
            {action("provider_transfer.transferred") && (
              <span className="ml-auto text-[12px] font-semibold px-2.5 py-0.5 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)", color: "#2e844a" }}>
                Transferred
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
            <div>
              <FieldRow label="Status" value={`${stage.statusLabel} – ${stage.statusDetail}`} />
              {stage.fields.map((f) => (
                <FieldRow key={f.label} label={f.label} value={f.value ?? "No Data Available"} />
              ))}
            </div>
            <div>
              <FieldRow label="Stage Type" value={stage.name} />
              <FieldRow label="Stage ID" value={stage.id} />
              <FieldRow label="Service Type" value="Onboarding" />
              <FieldRow label="Sequence" value="1" />
              <FieldRow
                label="Last Updated"
                value={
                  stage.lastUpdated
                    ? `${stage.lastUpdated} ${stage.lastUpdatedAgo}`
                    : "No Data Available"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
