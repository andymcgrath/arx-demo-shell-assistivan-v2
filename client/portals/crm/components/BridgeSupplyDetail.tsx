import type { Stage } from "../stages/types";
import type { CrmAction } from "../stages/actions";
import type { WorkflowData } from "@/engine/types";
import { SF_SECTION_BG, FieldRow } from "./SfPrimitives";
import { FC_BLUE } from "./SfControls";

interface BridgeSupplyDetailProps {
  workflowData: WorkflowData;
  stage: Stage;
  /** The stage's buttons and badges: the machine's answer for each (stages/actions.ts). */
  action: (id: string) => CrmAction | undefined;
  onAction: (action: CrmAction) => void;
}

/**
 * The Bridge Supply stage (CO-14281) of a recipe with the Bridge: a free supply while the PA appeal runs. It replaces the
 * Cash Offer view, so it shows no offer, price, or payment. An `erx` case sends the text on its own. A `fax` case waits for
 * the case manager's "Send Bridge Supply" click, which shows only while the machine accepts it.
 */
export function BridgeSupplyDetail({ workflowData, stage, action, onAction }: BridgeSupplyDetailProps) {
  const { bridgeStatus, copayEnrolled, patientShipDate, paStatus } = workflowData;
  const send = action("cash_offer.send_bridge");
  return (
    <div className="p-4 max-w-5xl">
      <div className="border border-[#dddbda] rounded">
        <div className="flex items-center gap-3 px-3 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG, minHeight: 36 }}>
          <div className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24, background: bridgeStatus === "active" ? "#2e844a" : FC_BLUE, borderRadius: 5 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M7 12.5l3 3 7-7"/></svg>
          </div>
          <span className="text-[13px] font-semibold text-[#3e3e3c]">Bridge Supply — {stage.id}</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="border border-[#dddbda] rounded">
            <div className="px-3 py-2 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <span className="text-[12px] font-semibold text-[#3e3e3c]">Bridge Supply Details</span>
            </div>
            <FieldRow label="Bridge Status" value={bridgeStatus === "active" ? "Active" : bridgeStatus === "sent" ? "Sent" : "Not Started"} />
            <FieldRow label="Copay" value={copayEnrolled ? "$0 enrolled" : "Not enrolled"} />
            <FieldRow label="Ship Date" value={patientShipDate ? new Date(patientShipDate).toLocaleDateString() : "Not set"} />
          </div>

          <div className="flex gap-2 items-center">
            {send ? (
              <button
                onClick={() => onAction(send)}
                disabled={!send.enabled}
                className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: send.enabled ? FC_BLUE : "#ccc" }}
              >
                Send Bridge Supply
              </button>
            ) : (
              <span className="text-[12px] font-semibold px-2.5 py-1.5 rounded" style={{ background: "#f3f2f2", color: "#3e3e3c" }}>
                {bridgeStatus ? "Bridge text sent to the patient" : paStatus === "denied" ? "Bridge text sends on its own" : "Awaiting PA denial"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
