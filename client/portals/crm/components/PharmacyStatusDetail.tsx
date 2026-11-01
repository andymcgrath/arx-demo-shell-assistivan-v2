import type { CrmAction } from "../stages/actions";
import type { WorkflowData } from "@/engine/types";
import { SF_SECTION_BG, FieldRow } from "./SfPrimitives";
import { FC_BLUE } from "./SfControls";
import { Zap } from "lucide-react";

interface PharmacyStatusDetailProps {
  workflowData: WorkflowData;
  action: (id: string) => CrmAction | undefined;
  onAction: (action: CrmAction) => void;
}

/** The Pharmacy Status stage (PS-14278). */
export function PharmacyStatusDetail({ workflowData, action, onAction }: PharmacyStatusDetailProps) {
  const { selectedPharmacy, pharmacyStatus } = workflowData;
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
              style={{ width: 24, height: 24, background: FC_BLUE, borderRadius: 5 }}
            >
              <Zap size={12} className="text-white" fill="white" />
            </div>
            <span className="text-[13px] font-semibold text-[#3e3e3c]">
              Pharmacy Status PS-14278
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 px-4 pt-3 pb-3">
            <div>
              <FieldRow label="Pharmacy" value={selectedPharmacy?.name ?? "Not yet selected"} />
              <FieldRow
                label="Status"
                value={
                  pharmacyStatus === "none" ? "Awaiting dispatch" :
                  pharmacyStatus === "processing" ? "Preparing medication" :
                  pharmacyStatus === "shipped" ? "In transit" :
                  pharmacyStatus === "delivered" ? "Delivered" :
                  pharmacyStatus
                }
              />
            </div>
            <div>
              <FieldRow label="Stage Type" value="Pharmacy Status" />
              <FieldRow label="Stage ID" value="PS-14278" />
            </div>
          </div>

          <div
            className="px-4 pb-4 border-t border-[#dddbda] pt-3"
            style={{ background: SF_SECTION_BG }}
          >
            <p className="text-[11px] text-[#706e6b] mb-2 font-medium">
              ADVANCE PHARMACY STATUS
            </p>

            {(pharmacyStatus === "none" || pharmacyStatus === "processing") && (
              <div className="flex items-center gap-2 py-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#e8a900" }}
                />
                <span className="text-[12px] text-[#706e6b]">
                  {pharmacyStatus === "none"
                    ? "Awaiting pharmacy dispatch from Triage tab"
                    : "Rx in transit to triage pharmacy…"}
                </span>
              </div>
            )}

            {action("pharmacy.received") && (
              <button
                onClick={() => onAction(action("pharmacy.received")!)}
                className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90 mt-2"
                style={{ background: FC_BLUE }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Mark as Received at Pharmacy
              </button>
            )}

            {action("pharmacy.shipped") && (
              <button
                onClick={() => onAction(action("pharmacy.shipped")!)}
                className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: FC_BLUE }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                Mark as Shipped
              </button>
            )}

            {action("pharmacy.delivered") && (
              <button
                onClick={() => onAction(action("pharmacy.delivered")!)}
                className="flex items-center gap-2 px-4 py-2 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#2e844a" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Mark as Delivered
              </button>
            )}

            {pharmacyStatus === "delivered" && (
              <div className="flex items-center gap-2 py-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "var(--crm-primary-30, #e8f4ef)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2e844a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                  Medication delivered
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
