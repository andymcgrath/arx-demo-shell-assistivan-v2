/**
 * PatientSubmission: the detail of one submission, opened from the History row. Uploads, notes, then the
 * enrollment, Buy and Bill (copay), and prior authorization sections.
 */
import { useState } from "react";
import { ArrowLeft, Download, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { usePersonaState } from "@/engine/WorkflowProvider";
import { useFreeDrug } from "@/hooks/useFreeDrug";
import { KEANU_SITE_OF_CARE_FACTS } from "@/engine/WorkflowEngine";
import { usePatientStore } from "@/store/patientStore";
import PatientRecordSidebar from "../components/PatientRecordSidebar";
import CopayCard from "../components/CopayCard";
import DocumentLinks, { downloadAll } from "../components/DocumentLinks";
import { DEMO_AUTH_NUMBER, deriveDocuments, formatDate, paExpiration } from "../data/submissionStatus";
import { deriveTransactions } from "../data/copayProgram";

const panel = { boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" };

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-2 border-t border-[#F0F0F0] py-2.5">
          <dt className="text-[#1D1D1D]">{k}</dt>
          <dd className="text-[#1D1D1D]">{v || "N/A"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PatientSubmission() {
  const navigate = useNavigate();
  const { workflowData: d } = usePersonaState("provider");
  const p = usePatientStore();
  const [first = "", ...rest] = p.patientName.split(" ");
  const freeDrug = useFreeDrug();
  const docs = deriveDocuments(d, freeDrug);
  const [notes, setNotes] = useState<{ id: number; text: string; date: string }[]>([]);
  const [draft, setDraft] = useState<string | null>(null);
  const today = formatDate(new Date().toISOString());

  const transactions = deriveTransactions(d);

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <PatientRecordSidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 sm:px-8 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/patient")} className="text-sm text-[#1D1D1D] flex items-center gap-1.5 hover:underline">
            <ArrowLeft size={16} /> Back
          </button>
          <button onClick={() => navigate("/")} className="text-[#6F7276] hover:text-[#1D1D1D]" aria-label="Close and return to the dashboard">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-6 sm:px-8 pb-8 space-y-6">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl text-[#1D1D1D]">NDC 123456789 <span className="text-base text-[#6F7276]">{formatDate(d.paSubmittedAt ?? new Date().toISOString())} <span className="text-xs">Submitted via iAssist</span></span></h1>
            <button onClick={() => downloadAll(docs)} disabled={!docs.length} className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-5 py-2 hover:bg-[#EEF9F9] disabled:opacity-40">Download All Files</button>
          </div>

          <section className="rounded-xl bg-[#EDEDED] px-5 py-4">
            <p className="text-sm text-[#6F7276]">Uploads ({docs.length})</p>
            <p className="text-sm text-[#1D1D1D] mt-1"><DocumentLinks docs={docs} empty="No uploads" /></p>
          </section>

          <section className="bg-white rounded-2xl p-6" style={panel}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-[#1D1D1D]">Notes ({notes.length})</h2>
              <button onClick={() => setDraft("")} className="text-sm font-semibold text-[#007178] flex items-center gap-1 hover:underline"><Plus size={14} /> Add Note</button>
            </div>
            {draft !== null && (
              <div className="mt-3 flex gap-2">
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note" className="flex-1 rounded-lg border border-[#D9D9D9] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#007178]" />
                <button
                  onClick={() => {
                    if (draft.trim()) setNotes((n) => [{ id: Date.now(), text: draft.trim(), date: today }, ...n]);
                    setDraft(null);
                  }}
                  className="bg-[#007178] text-white px-4 rounded-full text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            )}
            <ul className="mt-3 divide-y divide-[#F0F0F0] text-sm">
              {notes.length === 0 && draft === null && <li className="py-3 text-[#999]">No notes.</li>}
              {notes.map((n) => (
                <li key={n.id} className="py-3 flex items-center justify-between gap-3">
                  <span className="text-[#1D1D1D]">{n.text}</span>
                  <span className="flex items-center gap-3 text-[#6F7276]">
                    {n.date}
                    <button onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))} aria-label="Delete note" className="hover:text-[#D02B20]"><Trash2 size={15} /></button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6" style={panel}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg text-[#1D1D1D]">Enrollment</h2>
              <span className="flex items-center gap-3 text-xs text-[#6F7276]">Sent to hub <Download size={16} className="text-[#007178]" /></span>
            </div>
            <p className="text-sm font-semibold text-[#1D1D1D] mb-1">Patient Information</p>
            <Rows rows={[["First Name", first], ["Last Name", rest.join(" ")], ["Date of Birth", p.patientDob], ["Sex", p.gender], ["Phone", p.phone], ["Email", p.email], ["Address", p.deliveryAddress]]} />
          </section>

          {freeDrug ? (
          <section className="bg-white rounded-2xl p-6" style={panel}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg text-[#1D1D1D]">Free Drug Program</h2>
              <span className="text-xs text-[#6F7276]">{d.papStatus === "active" ? "Approved" : "Waiting on the patient"}</span>
            </div>
            <Rows
              rows={[
                ["Coverage result", "No medical coverage found"],
                ["Credit check consent", d.creditCheckConsented ? "Yes" : ""],
                ["Household size", d.householdSize ?? ""],
                ["Annual household income", d.householdIncome ? `$${Number(d.householdIncome).toLocaleString("en-US")}` : ""],
                ["Decision", d.papStatus === "active" ? "Approved" : ""],
                ["Site of care", d.papStatus === "active" ? `${KEANU_SITE_OF_CARE_FACTS.facilityName}, ${KEANU_SITE_OF_CARE_FACTS.address}, ${KEANU_SITE_OF_CARE_FACTS.city}, ${KEANU_SITE_OF_CARE_FACTS.state} ${KEANU_SITE_OF_CARE_FACTS.zip}` : ""],
                ["Appointment", d.infusionDate ? formatDate(d.infusionDate) : ""],
              ]}
            />
          </section>
          ) : (
            <>
          <section className="bg-white rounded-2xl p-6" style={panel}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg text-[#1D1D1D]">Buy and Bill</h2>
              <span className="text-xs text-[#6F7276]">Submitted</span>
            </div>
            <CopayCard enrolled={d.copayEnrolled} transactions={transactions} />
          </section>

          <section className="bg-white rounded-2xl p-6" style={panel}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg text-[#1D1D1D]">Prior Authorization</h2>
              <span className="flex items-center gap-3 text-xs text-[#6F7276]">{d.paStatus === "none" ? "Not submitted" : "Sent to payer"} <Download size={16} className="text-[#007178]" /></span>
            </div>
            <Rows
              rows={[
                ["Form", "Medical benefit prior authorization"],
                ["Is this prior authorization request urgent?", "No"],
                ["What type of prior authorization request is this?", "New request"],
                ["Payer", p.payer],
                ["Status", d.paStatus === "none" ? "Not submitted" : d.paStatus === "approved" ? "Approved" : d.paStatus === "denied" ? "Denied" : "Submitted"],
                ["Authorization number", d.paStatus === "approved" ? DEMO_AUTH_NUMBER : ""],
                ["Expires", d.paStatus === "approved" ? paExpiration(d.paApprovedAt) : ""],
              ]}
            />
          </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
