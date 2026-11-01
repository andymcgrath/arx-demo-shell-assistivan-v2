import type { CopayClaim } from "@/engine/types";
import { SF_SECTION_BG, FieldRow, SF_BLUE } from "./SfPrimitives";
import { BRAND } from "@/brand";
import { copayMemberId } from "@/portals/iassist/data/copayProgram";
import { ymdToMdy } from "@/portals/iassist/data/submissionStatus";

interface CopayClaimModalProps {
  claim: CopayClaim;
  onClose: () => void;
  patientName: string;
}

export function CopayClaimModal({ claim, onClose, patientName }: CopayClaimModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => onClose()} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white border border-[#dddbda] rounded shadow-xl pointer-events-auto" style={{ width: 520, maxHeight: "90vh" }}>
          <div className="px-5 py-3 border-b border-[#dddbda] flex items-center justify-between" style={{ background: SF_SECTION_BG }}>
            <span className="text-[14px] font-semibold text-[#3e3e3c]">Copay Claim {claim.id}</span>
            <button onClick={() => onClose()} className="text-[#706e6b] hover:text-[#3e3e3c] text-[18px] leading-none" aria-label="Close">×</button>
          </div>
          <div className="grid grid-cols-2 gap-x-6 px-5 py-2">
            <div>
              <FieldRow label="Claim Number" value={claim.id} />
              <FieldRow label="Status" value={claim.status === "in_review" ? "In review" : claim.status === "paid" ? "Paid" : "Rejected"} />
              <FieldRow label="Patient" value={patientName} />
              <FieldRow label="Program" value={BRAND.program.name} />
            </div>
            <div>
              <FieldRow label="Member ID" value={copayMemberId(patientName, BRAND.program.name)} />
              <FieldRow label="Benefit Type" value="Medical drug" />
              <FieldRow label="Date of Service" value={ymdToMdy(claim.dateOfService)} />
              <FieldRow label="Submitted" value={`${ymdToMdy(claim.submittedAt.slice(0, 10))} via iAssist`} />
            </div>
          </div>
          <div className="px-5 pb-3">
            <div className="text-[12px] text-[#706e6b] mb-1">Documents</div>
            <div className="flex gap-4 text-[13px]">
              <a href="/docs/cms-1500.pdf" target="_blank" rel="noreferrer" className="hover:underline" style={{ color: SF_BLUE }}>CMS-1500</a>
              <a href="/docs/eob.pdf" target="_blank" rel="noreferrer" className="hover:underline" style={{ color: SF_BLUE }}>EOB</a>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#dddbda] flex justify-end">
            <button onClick={() => onClose()} className="px-4 py-1.5 border border-[#dddbda] rounded text-[13px] font-semibold text-[#3e3e3c] hover:bg-[#f3f3f3]">Close</button>
          </div>
        </div>
      </div>
    </>
  );
}
