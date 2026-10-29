/**
 * CopayClaimDetail: read-only detail for one filed copay claim. Opens from a History row on the patient record.
 */
import { X } from "lucide-react";
import { BRAND } from "@/brand";
import { usePatientStore } from "@/store/patientStore";
import type { CopayClaim } from "@/engine/types";
import { formatDate, ymdToMdy } from "../data/submissionStatus";
import { copayMemberId } from "../data/copayProgram";
import DocumentLinks from "./DocumentLinks";

const STATUS: Record<CopayClaim["status"], string> = { in_review: "In review", paid: "Paid", rejected: "Rejected" };

export default function CopayClaimDetail({ claim, onClose }: { claim: CopayClaim; onClose: () => void }) {
  const patientName = usePatientStore((s) => s.patientName);
  const rows: [string, string][] = [
    ["Claim number", claim.id],
    ["Status", STATUS[claim.status]],
    ["Patient", patientName],
    ["Program", BRAND.program.name],
    ["Member ID", copayMemberId(patientName, BRAND.program.name)],
    ["Benefit type", "Medical drug"],
    ["Date of service", ymdToMdy(claim.dateOfService)],
    ["Submitted", formatDate(claim.submittedAt)],
    ["Submitted via", "iAssist"],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Copay claim detail">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-auto relative p-8 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#6F7276] hover:text-[#1D1D1D]" aria-label="Close"><X size={20} /></button>
        <h2 className="text-xl font-semibold text-[#1D1D1D]">Copay claim {claim.id}</h2>
        <dl className="text-sm divide-y divide-[#F0F0F0]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5">
              <dt className="text-[#6F7276]">{k}</dt>
              <dd className="text-[#1D1D1D] font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="text-sm">
          <p className="text-[#6F7276] mb-1">Uploads</p>
          <DocumentLinks docs={[{ name: "CMS-1500", file: "/docs/cms-1500.pdf" }, { name: "EOB", file: "/docs/eob.pdf" }]} empty="No upload" />
        </div>
        <p className="text-xs text-[#6F7276]">The balance updates when the program approves the claim.</p>
        <button onClick={onClose} className="bg-[#007178] text-white px-8 py-2.5 rounded-full font-semibold text-sm hover:bg-[#03656B]">Close</button>
      </div>
    </div>
  );
}
