import { useState } from "react";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { SPECIALTY_PHARMACIES, ARX_PHARMACY, SITES_OF_CARE, type PharmacyOption } from "../caseData";
import type { Stage } from "../stages/types";
import type { CrmAction } from "../stages/actions";
import type { WorkflowData } from "@/engine/types";
import { SF_SECTION_BG, FieldRow } from "./SfPrimitives";
import { FC_BLUE } from "./SfControls";
import { Zap } from "lucide-react";
import { PharmacyModal } from "./PharmacyModal";

interface TriageDetailProps {
  workflowData: WorkflowData;
  stage: Stage;
  action: (id: string) => CrmAction | undefined;
  onAction: (action: CrmAction) => void;
  deliveryAddress: string;
  /** The pharmacy hand-off shows "Transferring" for a few seconds after dispatch. Visual only. */
  triageDispatched: boolean;
  onSelectPharmacy: (pharmacy: PharmacyOption) => void;
}

/** The Triage to Pharmacy stage (TP-14277): the pharmacy pick, the dispatch button and the hand-off status. */
export function TriageDetail({ workflowData, stage, action, onAction, deliveryAddress, triageDispatched, onSelectPharmacy }: TriageDetailProps) {
  const facts = scenarioFacts(workflowData.flowType);
  const { dispatchStatus, selectedPharmacy, pharmacyStatus, pharmacyBenefitStatus, medicalBenefitStatus } = workflowData;
  // Coverage scenario 1: the pharmacy benefit covers, the medical benefit does not, and the patient picked retail.
  const coverageRetailPick = facts.isCoverageScenario && pharmacyBenefitStatus === "covered" && medicalBenefitStatus !== "covered" && workflowData.pricingOption === "retail";
  // Triage pharmacy dropdowns include ARx Pharmacy only for PAP/Income Verification workflows.
  const pharmacyOptions = facts.isNoPaIntake ? [...SPECIALTY_PHARMACIES, ARX_PHARMACY] : SPECIALTY_PHARMACIES;
  // The drug goes to a site of care in the appeal and free drug scenarios, so only the Office Dispense dropdown swaps
  // to SITES_OF_CARE. The other three still describe an outside pharmacy the case could have used.
  const officeDispenseOptions = facts.dispensesAtSiteOfCare ? SITES_OF_CARE : pharmacyOptions;
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
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
              style={{ width: 24, height: 24, background: dispatchStatus === "none" || dispatchStatus === "pending_selection" ? "#9a9a9a" : FC_BLUE, borderRadius: 5 }}
            >
              <Zap size={12} className="text-white" fill="white" />
            </div>
            <span className="text-[13px] font-semibold text-[#3e3e3c]">
              {stage.name} {stage.id}
            </span>
            {/* Shown while the machine accepts FILL_RX. A flow that dispatches on its own when a site of care is
                picked (the free drug program) never reaches a state where it does. */}
            {action("triage.dispatch") && (
              <button
                onClick={() => onAction(action("triage.dispatch")!)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: FC_BLUE }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                Triage to Pharmacy
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6 px-4 pt-4 pb-4">
            {/* Left column: Address and Pharmacy Details */}
            <div className="col-span-2 space-y-4">
              {/* Address Dropdown */}
              <div>
                <label className="text-[11px] text-[#706e6b] mb-2 block uppercase tracking-wide font-medium">Shipping TO Address</label>
                <div className="relative">
                  <select className="w-full px-3 py-2 border border-[#dddbda] rounded text-[13px] text-[#3e3e3c] bg-white hover:bg-[#f3f3f3]">
                    <option value="default">{deliveryAddress || "Select an address"}</option>
                  </select>
                </div>
              </div>

              {/* Pharmacy Details Section — relabeled for WF5, which
                  dispatches to a site of care instead of a pharmacy. */}
              <div className="border border-[#dddbda] rounded">
                <div className="px-3 py-2 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                  <span className="text-[12px] font-semibold text-[#3e3e3c]">{facts.dispensesAtSiteOfCare ? "Site of Care Details" : "Triage Pharmacy Details"}</span>
                </div>
                <div className="space-y-0">
                  <FieldRow label={facts.dispensesAtSiteOfCare ? "Site of Care Name" : "Pharmacy Name"} value={selectedPharmacy?.name || ""} />
                  <FieldRow label="Address" value={selectedPharmacy?.address || ""} />
                  <FieldRow label="City" value={selectedPharmacy?.city || ""} />
                  <FieldRow label="State" value={selectedPharmacy?.state || ""} />
                  <FieldRow label="Zip" value={selectedPharmacy?.zip || ""} />
                  <FieldRow label="Phone" value={selectedPharmacy?.phone || ""} />
                </div>
              </div>
            </div>

            {/* Right column: Pharmacy/Site of Care Selection Card */}
            <div>
              <div className="border border-[#dddbda] rounded flex flex-col">
                <div className="px-4 py-3 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
                  <span className="text-[12px] font-semibold text-[#3e3e3c]">{facts.dispensesAtSiteOfCare ? "Select Site of Care" : "Select Triage Pharmacy"}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 gap-4">
                  {facts.dispensesAtSiteOfCare ? (
                    // WF5 dispatches the instant a site of care is picked —
                    // no separate "Triage to Pharmacy" click, no
                    // Processing/Shipping cosmetic states (those all belong
                    // to the Rx Processing/Shipped/Delivered chain this
                    // flow doesn't have — see tpStage above).
                    selectedPharmacy ? (
                      <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)" }}>
                        <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                          Dispatched — Keanu to Facility
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPharmacyModalOpen(true)}
                        className="w-full px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: FC_BLUE }}
                      >
                        Select Site of Care
                      </button>
                    )
                  ) : (pharmacyStatus === "shipped" || pharmacyStatus === "delivered" || triageDispatched) ? (
                    <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "var(--crm-primary-30, #e8f4ef)" }}>
                      <span className="text-[12px] font-semibold" style={{ color: "#2e844a" }}>
                        Dispatched
                      </span>
                    </div>
                  ) : dispatchStatus === "dispatched" ? (
                    <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "var(--crm-primary-30, #e8f0fa)" }}>
                      <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                        Transferring to pharmacy…
                      </span>
                    </div>
                  ) : pharmacyStatus === "processing" ? (
                    <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "var(--crm-primary-30, #e8f0fa)" }}>
                      <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                        Processing…
                      </span>
                    </div>
                  ) : pharmacyStatus === "ready" ? (
                    <div className="w-full flex items-center justify-center py-3 px-4 rounded animate-pulse" style={{ background: "var(--crm-primary-30, #e8f0fa)" }}>
                      <span className="text-[12px] font-semibold" style={{ color: FC_BLUE }}>
                        Shipping…
                      </span>
                    </div>
                  ) : facts.hasPricingFork || (facts.isCoverageScenario && !coverageRetailPick && !!selectedPharmacy) ? (
                    // Coverage cash pay (No Coverage) also lands here: the scenario
                    // sets the pharmacy when the patient picks self-pay, so
                    // there is nothing to choose. The button would only
                    // hesitate the presenter before "Triage to Pharmacy".
                    // CoA_DTP's pharmacy is auto-assigned at pricing selection
                    // (see coaDtp.ts) — there's nothing to choose here, so no
                    // CTA. Dispatching is done from the "Triage to Pharmacy"
                    // button in the header above instead.
                    <div className="w-full flex items-center justify-center py-3 px-4 rounded" style={{ background: "#f5f5f5" }}>
                      <span className="text-[12px] font-semibold text-[#706e6b]">
                        Pharmacy assigned — ready to dispatch
                      </span>
                    </div>
                  ) : coverageRetailPick ? (
                    // CoA_Coverage Scenario 1 — the patient picks their own
                    // network pharmacy on NetworkPharmacySelection.tsx
                    // (SELECT_PHARMACY, only valid once the PA chain
                    // reaches paApprovedOtpVerified — see workflows/coassist/), not
                    // the CRM agent. The generic "Choose Pharmacy" button
                    // below let an agent pick one from here instead — but
                    // the machine isn't in a state that accepts
                    // SELECT_PHARMACY that early (e.g. right after a
                    // "Reset to Pharmacy Coverage Confirmed," before the PA
                    // chain has run), so the click silently did nothing and
                    // left this section blank for the rest of the case.
                    // Kept as a real (disabled) button rather than swapped
                    // out for plain text — same slot, same shape as the
                    // generic branch below, just inert — so the form
                    // visibly stays prepopulated from the patient's own
                    // selection (Triage Pharmacy Details, left column)
                    // without implying there's a CRM action left to take.
                    <button
                      disabled
                      title={selectedPharmacy ? "Already selected by the patient — nothing to do here." : "The patient selects their own pharmacy on this flow; this isn't an available CRM action."}
                      className="w-full px-4 py-2 rounded text-[13px] font-semibold text-[#9a9a9a] bg-[#f3f3f3] border border-[#dddbda] cursor-not-allowed"
                    >
                      {selectedPharmacy ? "Pharmacy selected by patient" : "Awaiting pharmacy selection by patient"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setPharmacyModalOpen(true)}
                      disabled={facts.isFreeDrug && workflowData.infusionDate === null}
                      title={facts.isFreeDrug && workflowData.infusionDate === null ? "Triage after the patient confirms the appointment date." : undefined}
                      className="w-full px-4 py-2 rounded text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: FC_BLUE }}
                    >
                      Choose Pharmacy
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metadata in footer */}
          <div className="grid grid-cols-2 gap-x-6 px-4 pt-2 pb-2 border-t border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
            <FieldRow label="Status" value={`${stage.statusLabel} – ${stage.statusDetail}`} />
            <FieldRow
              label="Last Updated"
              value={
                stage.lastUpdated
                  ? `${stage.lastUpdated} ${stage.lastUpdatedAgo}`
                  : ""
              }
            />
          </div>
        </div>

        {/* Pharmacy Selection Modal */}
        {pharmacyModalOpen && (
          <PharmacyModal
            pharmacyOptions={pharmacyOptions}
            officeDispenseOptions={officeDispenseOptions}
            dispensesAtSiteOfCare={facts.dispensesAtSiteOfCare}
            onSelect={(pharmacy) => onSelectPharmacy(pharmacy)}
            onClose={() => setPharmacyModalOpen(false)}
          />
        )}

      </div>
    </>
  );
}
