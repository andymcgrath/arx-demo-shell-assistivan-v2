/**
 * CopayOnFile: the copay card on file for the open patient. The HCP sees the program, the member ID, when the
 * card took effect, and what is left on it. Shown on the patient record once the HCP has enrolled the patient.
 */
import { CheckCircle2 } from "lucide-react";
import { BRAND } from "@/brand";
import type { WorkflowData } from "@/engine/types";
import { benefitPeriod, COPAY_ANNUAL_MAX, copayBalance, money } from "../data/copayProgram";
import CopayCardArt, { useCopayMemberId } from "./CopayCardArt";
import { formatDate } from "../data/submissionStatus";

export default function CopayOnFile({ data }: { data: WorkflowData }) {
  const balance = copayBalance(data);
  const memberId = useCopayMemberId();
  const inReview = (data.copayClaims ?? []).filter((c) => c.status === "in_review").length;
  const rows: [string, string][] = [
    ["Program", BRAND.program.name],
    ["Member ID", memberId],
    ["Effective date", formatDate(data.copayEnrolledAt ?? new Date().toISOString())],
    ["Benefit period", benefitPeriod()],
  ];

  return (
    <section className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1D1D1D]">Copay card on file</h2>
        <span className="text-sm text-[#6F7276] flex items-center gap-1.5">
          Status: <strong className="text-[#007178]">Active</strong> <CheckCircle2 size={14} className="text-[#007178]" />
        </span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-6">
        <CopayCardArt />

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[#6F7276]">{k}</dt>
              <dd className="font-semibold text-[#1D1D1D]">{v}</dd>
            </div>
          ))}
          <div className="col-span-2">
            <dt className="text-[#6F7276]">Remaining balance</dt>
            <dd className="text-2xl font-semibold text-[#007178]">{money(balance)}</dd>
            <dd className="text-xs text-[#6F7276]">of {money(COPAY_ANNUAL_MAX)} for the benefit period</dd>
            {inReview > 0 && (
              <dd className="text-xs text-[#6F7276] mt-1">
                {inReview} claim{inReview === 1 ? "" : "s"} in review. The balance updates when the program approves {inReview === 1 ? "it" : "them"}.
              </dd>
            )}
          </div>
        </dl>
      </div>
    </section>
  );
}
