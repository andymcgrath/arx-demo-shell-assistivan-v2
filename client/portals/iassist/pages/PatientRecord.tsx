/**
 * PatientRecord: the iAssist patient view the HCP opens from the dashboard. Submission Status shows where the
 * enrollment, prior authorization, and copay stand. History lists the submission, and a click opens its detail.
 * Shown when the scenario's recipe lists the `patient_record` module.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Circle, X } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { usePersonaState } from "@/engine/WorkflowProvider";
import { BRAND } from "@/brand";
import { usePatientStore } from "@/store/patientStore";
import PatientRecordSidebar from "../components/PatientRecordSidebar";
import CopayClaimModal from "../components/CopayClaimModal";
import CopayClaimDetail from "../components/CopayClaimDetail";
import CopayOnFile from "../components/CopayOnFile";
import DocumentLinks, { downloadAll } from "../components/DocumentLinks";
import { useRecipeModule } from "@/hooks/useRecipeModule";
import { useFreeDrug } from "@/hooks/useFreeDrug";
import { deriveDocuments, deriveStatusCards, formatDate, submissionSummary, ymdToMdy, type CardState } from "../data/submissionStatus";

/** Done cards fill with the brand color, pending ones outline it, and idle ones stay gray. */
const CARD_STYLE: Record<CardState, { box: string; icon: JSX.Element; title: string; body: string }> = {
  done: { box: "bg-[#007178] border-[#007178]", icon: <CheckCircle2 size={22} className="text-white" />, title: "text-white", body: "text-white/85" },
  pending: { box: "bg-[#EEF9F9] border-[#007178]", icon: <Clock size={22} className="text-[#007178]" />, title: "text-[#1D1D1D]", body: "text-[#6F7276]" },
  idle: { box: "bg-white border-[#E8E8E8]", icon: <Circle size={22} className="text-[#C4C4C4]" />, title: "text-[#1D1D1D]", body: "text-[#6F7276]" },
};

export default function PatientRecord() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState("provider");
  const patientName = usePatientStore((s) => s.patientName);
  const firstName = patientName.split(" ")[0] ?? patientName;
  const freeDrug = useFreeDrug();
  const cards = deriveStatusCards(workflowData, firstName, BRAND.program.name, freeDrug);
  const docs = deriveDocuments(workflowData, freeDrug);
  const submitted = workflowData.enrollmentStatus !== "none";
  // A recipe with `copay_claim` shows the button. A claim needs a copay enrollment and an approved PA (the machine enforces it).
  const claimModule = useRecipeModule("copay_claim");
  const canClaim = workflowData.copayEnrolled && workflowData.paStatus === "approved";
  const [claimOpen, setClaimOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const doneCount = cards.filter((c) => c.state === "done").length;
  const claims = workflowData.copayClaims ?? [];

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <PatientRecordSidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 sm:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-[#6F7276]">Powered by iAssist</p>
          <button onClick={() => navigate("/")} className="text-[#6F7276] hover:text-[#1D1D1D]" aria-label="Close and return to the dashboard">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-6 sm:px-8 pb-8 space-y-6">
          <section className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
            <h1 className="text-xl font-semibold text-[#1D1D1D]">Submission Status</h1>
            <p className="text-sm text-[#6F7276] mt-1">
              {submitted ? `We'll let you know when ${firstName}'s ${freeDrug ? "free drug application" : "prior authorization"} status changes.` : `No submission yet for ${firstName}.`}
            </p>

            {submitted && (
              <div className="mt-5" aria-label={`${doneCount} of ${cards.length} steps complete`}>
                <div className="flex justify-between text-xs text-[#6F7276] mb-1.5">
                  <span>Progress</span>
                  <span>{doneCount} of {cards.length} complete</span>
                </div>
                <div className="h-2 rounded-full bg-[#E8E8E8] overflow-hidden">
                  <div className="h-full bg-[#007178] transition-all duration-500" style={{ width: `${(doneCount / cards.length) * 100}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
              {cards.map((c) => {
                const st = CARD_STYLE[c.state];
                return (
                  <div key={c.key} className={`rounded-xl border p-4 min-h-[140px] transition-colors duration-500 ${st.box}`} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    {st.icon}
                    <p className={`text-sm font-semibold mt-3 ${st.title}`}>{c.title}</p>
                    <p className={`text-sm mt-1 ${st.body}`}>{c.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              {claimModule && (
                <button
                  onClick={() => setClaimOpen(true)}
                  disabled={!canClaim}
                  title={canClaim ? undefined : "Available once the patient is enrolled in copay and the prior authorization is approved"}
                  className="bg-[#007178] text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-[#03656B] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Copay Claim
                </button>
              )}
              <button
                onClick={() => navigate("/patient/submission")}
                disabled={!submitted}
                className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-5 py-2 hover:bg-[#EEF9F9] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                View Submission
              </button>
            </div>
          </section>

          {workflowData.copayEnrolled && <CopayOnFile data={workflowData} />}

          <section className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#1D1D1D]">History</h2>
              <button onClick={() => downloadAll(docs)} disabled={!submitted} className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-5 py-2 hover:bg-[#EEF9F9] disabled:opacity-40 disabled:cursor-not-allowed">
                Download All Files
              </button>
            </div>

            <table className="w-full mt-4 text-sm">
              <thead>
                <tr className="text-left text-[#6F7276] border-b border-[#E8E8E8]">
                  <th className="py-3 font-normal">History ({(submitted ? 1 : 0) + claims.length})</th>
                  <th className="py-3 font-normal">Date</th>
                  <th className="py-3 font-normal">Notes</th>
                  <th className="py-3 font-normal">Uploads</th>
                </tr>
              </thead>
              <tbody>
                {submitted && (
                  <tr onClick={() => navigate("/patient/submission")} className="border-b border-[#F0F0F0] cursor-pointer hover:bg-[#EEF9F9]">
                    <td className="py-4">
                      <p className="font-semibold text-[#1D1D1D]">NDC 123456789</p>
                      <p className="text-[#1D1D1D]">{submissionSummary(workflowData)}</p>
                      <p className="text-xs text-[#6F7276]">Submitted via iAssist</p>
                    </td>
                    <td className="py-4 text-[#1D1D1D]">{formatDate(workflowData.paSubmittedAt ?? new Date().toISOString())}</td>
                    <td className="py-4 text-[#6F7276]">No note</td>
                    <td className="py-4 text-[#1D1D1D]"><DocumentLinks docs={docs} empty="No upload" /></td>
                  </tr>
                )}
                {claims.map((c) => (
                  <tr key={c.id} onClick={() => setOpenClaimId(c.id)} className="border-b border-[#F0F0F0] cursor-pointer hover:bg-[#EEF9F9]">
                    <td className="py-4">
                      <p className="font-semibold text-[#1D1D1D]">Copay claim {c.id}</p>
                      <p className="text-[#1D1D1D]">Date of service {ymdToMdy(c.dateOfService)}</p>
                      <p className="text-xs text-[#6F7276]">Submitted via iAssist</p>
                    </td>
                    <td className="py-4 text-[#1D1D1D]">{formatDate(c.submittedAt)}</td>
                    <td className="py-4 text-[#6F7276]">In review</td>
                    <td className="py-4 text-[#1D1D1D]">CMS-1500, EOB</td>
                  </tr>
                ))}
                {!submitted && (
                  <tr><td colSpan={4} className="py-8 text-center text-[#6F7276]">No submissions yet.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
      {openClaimId && claims.find((c) => c.id === openClaimId) && (
        <CopayClaimDetail claim={claims.find((c) => c.id === openClaimId)!} onClose={() => setOpenClaimId(null)} />
      )}
      {claimOpen && <CopayClaimModal onClose={(didSubmit) => { setClaimOpen(false); if (didSubmit) setToast(true); }} />}
      {toast && (
        <div role="status" className="fixed top-5 right-5 z-50 bg-[#1D1D1D] text-white rounded-lg shadow-lg px-4 py-3 text-sm flex items-start gap-3 max-w-sm">
          <CheckCircle2 size={18} className="text-[#59D9A5] mt-0.5 flex-shrink-0" />
          <span>Copay claim submitted. It shows in History as In review, and the balance updates when the program approves it.</span>
          <button onClick={() => setToast(false)} aria-label="Dismiss" className="ml-1 text-white/70 hover:text-white"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
