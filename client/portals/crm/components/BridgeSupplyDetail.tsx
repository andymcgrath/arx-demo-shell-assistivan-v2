import type { Stage } from "../stages/types";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import type { WorkflowData } from "@/engine/types";
import { SF_SECTION_BG, FieldRow } from "./SfPrimitives";
import { FC_BLUE } from "./SfControls";

interface BridgeSupplyDetailProps {
  workflowData: WorkflowData;
  stage: Stage;
}

/**
 * The Bridge Supply stage (CO-14281) of a recipe with the Bridge: a free supply while the PA appeal runs. It replaces the
 * Cash Offer view, so it shows no offer, price, or payment. An `erx` case sends the text on its own. A `fax` case waits for the
 * case manager's "Notify Patient" click on the PA result screen, the result of the event that causes the text. This stage only
 * shows where things stand.
 */
export function BridgeSupplyDetail({ workflowData, stage }: BridgeSupplyDetailProps) {
  const { bridgeStatus, copayEnrolled, patientShipDate, paStatus } = workflowData;
  const agentSends = scenarioFacts(workflowData.flowType).agentSendsBridge;
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
            <span className="text-[12px] font-semibold px-2.5 py-1.5 rounded" style={{ background: "#f3f2f2", color: "#3e3e3c" }}>
              {bridgeStatus
                ? "Bridge text sent to the patient"
                : paStatus !== "denied"
                ? "Awaiting PA denial"
                : agentSends
                ? "Open the PA result and click Notify Patient to send the Bridge text"
                : "Bridge text sends on its own"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
