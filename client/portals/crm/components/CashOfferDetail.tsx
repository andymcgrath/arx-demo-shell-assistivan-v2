import type { Stage } from "../stages/types";
import type { CrmAction } from "../stages/actions";
import type { WorkflowData } from "@/engine/types";
import { SF_SECTION_BG, FieldRow } from "./SfPrimitives";
import { FC_BLUE } from "./SfControls";

interface CashOfferDetailProps {
  workflowData: WorkflowData;
  stage: Stage;
  /** The stage's buttons and badges: the machine's answer for each (stages/actions.ts). */
  action: (id: string) => CrmAction | undefined;
  onAction: (action: CrmAction) => void;
}

/** The Cash Offer stage (CO-14281) of the pricing scenarios. */
export function CashOfferDetail({ workflowData, stage, action, onAction }: CashOfferDetailProps) {
  const { paymentVerified, cashOfferStatus, patientShipDate, biStatus } = workflowData;
  return (
    <>
      <div className="p-4 max-w-5xl">
        <div className="border border-[#dddbda] rounded">
          <div
            className="flex items-center gap-3 px-3 border-b border-[#dddbda]"
            style={{ background: SF_SECTION_BG, minHeight: 36 }}
          >
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 24, height: 24, background: paymentVerified ? "#2e844a" : FC_BLUE, borderRadius: 5 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M7 12.5l3 3 7-7"/></svg>
            </div>
            <span className="text-[13px] font-semibold text-[#3e3e3c]">
              Cash Offer — {stage.id}
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Cash Offer Details */}
            <div className="border border-[#dddbda] rounded">
              <div className="px-3 py-2 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                <span className="text-[12px] font-semibold text-[#3e3e3c]">Cash Offer Details</span>
              </div>
              <div className="space-y-0">
                <FieldRow label="Offer Status" value={cashOfferStatus === "none" ? "Not Started" : cashOfferStatus === "sent" ? "Sent" : "Paid"} />
                <FieldRow label="Payment Status" value={paymentVerified ? "Verified" : "Pending Verification"} />
                <FieldRow label="Ship Date" value={patientShipDate ? new Date(patientShipDate).toLocaleDateString() : "Not set"} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 items-center">
              {/* CoA_Coverage (Scenario 3) never submits a PA, so this
                  button's original "Send Cash Offer" gate — which
                  requires paStatus === "denied" — can never pass;
                  that's a CoA_DTP/Copay-only precondition (cash offer
                  there only exists after a PA denial). CoA_Coverage's price
                  is shown straight to the patient in-app (PADenied.tsx's
                  facts.isCoverageScenario branch) with no CRM "send" action at all —
                  there's no SEND_CASH_OFFER handler in workflows/coassist/ for
                  this button to even dispatch to — so skip it for this
                  flow and show a status label instead. */}
              {!action("cash_offer.send") ? (
                <span className="text-[12px] font-semibold px-2.5 py-1.5 rounded" style={{ background: "#f3f2f2", color: "#3e3e3c" }}>
                  {biStatus === "complete" ? "Cash price presented to patient in-app" : "Awaiting Benefits Investigation"}
                </span>
              ) : (
                <button
                  onClick={() => onAction(action("cash_offer.send")!)}
                  disabled={!action("cash_offer.send")!.enabled}
                  className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: action("cash_offer.send")!.enabled ? FC_BLUE : "#ccc" }}
                >
                  Send Cash Offer
                </button>
              )}
              <button
                onClick={() => onAction(action("cash_offer.verify")!)}
                disabled={!action("cash_offer.verify")!.enabled}
                className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: action("cash_offer.verify")!.enabled ? FC_BLUE : "#ccc" }}
              >
                Verify Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
