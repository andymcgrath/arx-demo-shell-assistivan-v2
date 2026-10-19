/**
 * The CRM's benefits panel: Information, Pharmacy Benefits, Medical Benefits, and the two Product Coverage cards.
 * It reads the two benefit statuses and `paRequired` the `bi` fork's exit set. A scenario shows it by listing
 * `panels: ["benefits"]` in its recipe.
 */
import { FieldRow, SfLink, SF_SECTION_BG } from "./SfPrimitives";
import { ChevronDown } from "lucide-react";
import { PAYER } from "../payerFacts";

export interface BenefitsPanelProps {
  patientName: string;
  drugName: string;
  caseNumber: string;
  /** True once BI has resolved. Before that the benefit rows are pending, not "Not Covered". */
  biComplete: boolean;
  pharmacyBenefitStatus: "none" | "covered" | "not_covered";
  medicalBenefitStatus: "none" | "covered" | "not_covered";
  paRequired: boolean;
  /** The outside provider the case transfers to when the medical benefit covers it with no PA. */
  transferProvider: string;
  onOpenProductDetail: () => void;
}

export function BenefitsPanel(props: BenefitsPanelProps) {
  const { patientName, drugName, caseNumber, biComplete, pharmacyBenefitStatus, medicalBenefitStatus, paRequired, transferProvider, onOpenProductDetail } = props;
  // The PA belongs to the benefit that covers the order: medical when it covers, otherwise pharmacy.
  const paOn = !paRequired ? null : medicalBenefitStatus === "covered" ? "medical" : "pharmacy";
  return (
  <div className="flex gap-0 overflow-hidden">
        <div className="flex-1 min-w-0 p-4 space-y-4">
          {/* Information — case-level fields only; pharmacy-specific
              fields moved into the two benefit sections below. */}
          <div className="border border-[#dddbda] rounded">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <ChevronDown size={14} className="text-[#706e6b]" />
              <span className="text-[12px] font-semibold text-[#3e3e3c]">Information</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
              <div>
                <FieldRow label="Patient" value={patientName} isLink />
                <FieldRow label="Product" value={drugName} isLink />
                <FieldRow label="Case" value={caseNumber} isLink />
                <FieldRow label="Benefit Investigation Result Name" value="BIR-0431" />
                <FieldRow label="Stage" value="BI-14273" isLink />
                <FieldRow label="Subscriber Name" value="Dr. Sarah Chen" />
              </div>
              <div>
                <FieldRow label="Prior Authorization Phone #" value={PAYER.paPhone} />
                <FieldRow label="Internal Comments" value="" />
                <FieldRow label="External Comments" value="" />
              </div>
            </div>
          </div>

          {/* Pharmacy Benefits */}
          <div className="border border-[#dddbda] rounded">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <ChevronDown size={14} className="text-[#706e6b]" />
              <span className="text-[12px] font-semibold text-[#3e3e3c]">Pharmacy Benefits</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
              <div>
                <FieldRow label="Record Type" value="Pharmacy" />
                <FieldRow label="Benefit Type" value="Pharmacy" />
                <FieldRow label="Rank" value="Primary" />
                <FieldRow label="Selected Product Coverage" value="BIPC-0455" isLink />
                <FieldRow label="Payer" value={PAYER.name} />
                <FieldRow label="Payer Type" value={PAYER.type} />
              </div>
              <div>
                <FieldRow label="Benefit Source" value="eBV" />
                <FieldRow label="Status" value={!biComplete ? "Pending" : pharmacyBenefitStatus === "covered" ? "Active" : "Inactive"} />
                <FieldRow label="Reimbursement Plan" value={biComplete && pharmacyBenefitStatus === "covered" ? "Standard" : ""} />
                <FieldRow label="Sub-Status" value={!biComplete ? "" : pharmacyBenefitStatus === "covered" ? "Verified" : "Not Covered"} />
                <FieldRow label="Insured?" value={!biComplete ? "" : pharmacyBenefitStatus === "covered" ? "Yes" : "No"} />
                <FieldRow label="PA Required?" value={!biComplete ? "" : paOn === "pharmacy" ? "Yes" : "No"} />
              </div>
            </div>
          </div>

          {/* Medical Benefits */}
          <div className="border border-[#dddbda] rounded">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <ChevronDown size={14} className="text-[#706e6b]" />
              <span className="text-[12px] font-semibold text-[#3e3e3c]">Medical Benefits</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 px-4 pt-1 pb-2">
              <div>
                <FieldRow label="Record Type" value="Medical" />
                <FieldRow label="Benefit Type" value="Medical" />
                <FieldRow label="Rank" value="Primary" />
                <FieldRow label="Selected Product Coverage" value="BIPC-0456" isLink />
                <FieldRow label="Payer" value={PAYER.name} />
                <FieldRow label="Payer Type" value={PAYER.type} />
              </div>
              <div>
                <FieldRow label="Benefit Source" value="eBV" />
                <FieldRow label="Status" value={!biComplete ? "Pending" : medicalBenefitStatus === "covered" ? "Active" : "Inactive"} />
                <FieldRow label="Sub-Status" value={!biComplete ? "" : medicalBenefitStatus === "covered" ? "Verified" : "Not Covered"} />
                <FieldRow label="Insured?" value={!biComplete ? "" : medicalBenefitStatus === "covered" ? "Yes" : "No"} />
                <FieldRow label="PA Required?" value={!biComplete ? "" : paOn === "medical" ? "Yes" : "No"} />
                {biComplete && medicalBenefitStatus === "covered" && !paRequired && (
                  <FieldRow label="Provider" value={transferProvider} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: two stacked Product Coverage cards */}
        <div className="shrink-0 border-l border-[#dddbda] p-4 space-y-4" style={{ width: 260 }}>
          <div className="border border-[#dddbda] rounded">
            <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <span className="text-[12px] font-semibold text-[#3e3e3c]">Pharmacy Product Coverage</span>
            </div>
            <div className="space-y-0">
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <SfLink onClick={onOpenProductDetail}>BIPC-0455</SfLink>
              </div>
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Product</div>
                <SfLink>{drugName}</SfLink>
              </div>
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Status</div>
                <div className="text-[13px] text-[#3e3e3c]">{!biComplete ? "Pending" : pharmacyBenefitStatus === "covered" ? "Covered" : "Not Covered"}</div>
              </div>
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">PA Required?</div>
                <div className="text-[13px] text-[#3e3e3c]">{!biComplete ? "\u00a0" : paOn === "pharmacy" ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>
          <div className="border border-[#dddbda] rounded">
            <div className="px-3 py-1.5 border-b border-[#dddbda]" style={{ background: SF_SECTION_BG }}>
              <span className="text-[12px] font-semibold text-[#3e3e3c]">Medical Product Coverage</span>
            </div>
            <div className="space-y-0">
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <SfLink onClick={onOpenProductDetail}>BIPC-0456</SfLink>
              </div>
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Product</div>
                <SfLink>{drugName}</SfLink>
              </div>
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">Status</div>
                <div className="text-[13px] text-[#3e3e3c]">{!biComplete ? "Pending" : medicalBenefitStatus === "covered" ? "Covered" : "Not Covered"}</div>
              </div>
              <div className="px-3 py-2 border-b border-[#dddbda]">
                <div className="text-[11px] text-[#706e6b] uppercase tracking-wide font-medium mb-0.5">PA Required?</div>
                <div className="text-[13px] text-[#3e3e3c]">{!biComplete ? "\u00a0" : paOn === "medical" ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
