/**
 * NewCasePA — Step 5 (Prior Authorization) of the iAssist eRx case-creation
 * wizard.
 *
 * Built from the "Step 5 (PA).pdf" Figma spec. Self-contained, local-state
 * form, same pattern as Steps 1-4 — no ties to the shared XState workflow
 * machine, so it can't affect WF1/WF2/WF3 isolation.
 *
 * The spec describes four states that in the real product happen
 * automatically as the system searches for a matching PA form (start/search,
 * loading, found, not found). Like Steps 2-3's mode switchers, this exposes
 * them as a demo-only toggle so a presenter can show any of the four without
 * waiting on a fake timer or a real search index.
 */
import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { X, Search, Star, Upload, AlertTriangle, Loader2 } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";
import { useCaseWizardStore, isoDateToMmddyyyy } from "@/store/caseWizardStore";

type PAState = "search" | "loading" | "found" | "notfound";

const SAMPLE_FORMS = [
  "CVS Caremark New York Pharmacy Benefit",
  "Express Scripts National Medical Benefit",
  "OptumRx Texas Pharmacy Benefit",
];

const DYNAMIC_QUESTIONS = [
  "Has the patient tried and failed a preferred alternative therapy for this condition?",
  "Is this prescription being written for an FDA-approved indication?",
  "Does the patient have any diagnosed conditions that would contraindicate this therapy?",
];

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#1D1D1D] mb-1.5 flex items-center gap-1">
        {label}
        {optional && <span className="text-xs font-normal text-[#999]">Optional</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-[#D9D9D9] px-3 py-2.5 text-sm text-[#1D1D1D] outline-none focus:ring-2 focus:ring-[#007178] focus:border-[#007178] placeholder:text-[#999]";

function YesNoQuestion({
  question,
  value,
  onChange,
}: {
  question: string;
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#1D1D1D] mb-2">{question}</p>
      <div className="flex gap-4">
        {(["yes", "no"] as const).map((v) => (
          <label key={v} className="flex items-center gap-2 text-sm text-[#1D1D1D] capitalize">
            <input type="radio" name={question} checked={value === v} onChange={() => onChange(v)} className="accent-[#007178]" />
            {v}
          </label>
        ))}
      </div>
    </div>
  );
}

function ModeSwitcher({ mode, setMode }: { mode: PAState; setMode: (m: PAState) => void }) {
  const options: { value: PAState; label: string }[] = [
    { value: "search", label: "Search" },
    { value: "loading", label: "Loading" },
    { value: "found", label: "Found" },
    { value: "notfound", label: "Not Found" },
  ];
  return (
    <div className="inline-flex rounded-full border border-[#D9D9D9] bg-white p-1 text-xs font-semibold">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setMode(o.value)}
          className={`px-3 py-1 rounded-full transition-colors ${
            mode === o.value ? "bg-[#007178] text-white" : "text-[#6F7276] hover:text-[#1D1D1D]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function NewCasePA() {
  const navigate = useNavigate();

  // Demo-only state switcher — see file header comment.
  const [mode, setMode] = useState<PAState>("found");

  const [formSearch, setFormSearch] = useState("");
  const selectedForm = SAMPLE_FORMS[0];

  // Insurance selected back in Step 3 (Insurance) — prefills Payer details
  // below instead of leaving it as a disconnected free-text section.
  const selectedInsurance = useCaseWizardStore((s) => s.selectedInsurance);
  // Diagnosis selected back in Step 4 (Clinical) — prefills Diagnosis /
  // Treatment Start Date below the same way.
  const clinical = useCaseWizardStore((s) => s.clinical);
  const pa = useCaseWizardStore((s) => s.pa);
  const setPA = useCaseWizardStore((s) => s.setPA);

  const derivedContactName = selectedInsurance ? `${selectedInsurance.payer} Prior Authorization Department` : "";
  const derivedDiagnosis = clinical.selectedIcd.includes("—")
    ? clinical.selectedIcd.split("—")[1]?.trim() ?? ""
    : clinical.selectedIcd;
  const derivedTreatmentStart = clinical.diagnosisDate ? isoDateToMmddyyyy(clinical.diagnosisDate) : "";

  const filteredForms = formSearch.trim()
    ? SAMPLE_FORMS.filter((f) => f.toLowerCase().includes(formSearch.toLowerCase()))
    : SAMPLE_FORMS;

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={5} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <IAssistLogo className="h-6 w-auto hidden sm:block" />
            <button onClick={() => navigate("/")} className="text-[#6F7276] hover:text-[#1D1D1D] focus:outline-none" aria-label="Close and return to dashboard">
              <X size={20} />
            </button>
            <h1 className="text-xl font-semibold text-[#1D1D1D]">Prior Authorization</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/new-case/rx")} className="text-sm font-semibold text-[#6F7276] hover:text-[#1D1D1D]">
              Skip Step
            </button>
            <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-4 py-1.5 hover:bg-[#EEF9F9]">
              Save Draft
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-end">
              <ModeSwitcher mode={mode} setMode={setMode} />
            </div>

            {mode === "search" && (
              <section className="bg-white rounded-xl p-8 text-center space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <Search size={28} className="mx-auto text-[#999]" />
                <div className="relative max-w-md mx-auto">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input
                    value={formSearch}
                    onChange={(e) => setFormSearch(e.target.value)}
                    placeholder="Start typing to search for a prior authorization form"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                {formSearch && (
                  <div className="border border-[#D9D9D9] rounded-lg divide-y divide-[#F0F0F0] max-w-md mx-auto text-left">
                    {filteredForms.length === 0 && <p className="p-3 text-xs text-[#999]">No matches found</p>}
                    {filteredForms.map((f) => (
                      <button key={f} type="button" onClick={() => setMode("found")} className="block w-full text-left px-3 py-2 text-sm text-[#1D1D1D] hover:bg-[#EEF9F9]">
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {mode === "loading" && (
              <section className="bg-white rounded-xl p-12 text-center space-y-3" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <Loader2 size={28} className="mx-auto text-[#007178] animate-spin" />
                <p className="text-sm font-semibold text-[#1D1D1D]">Sit tight. We're looking for the form.</p>
              </section>
            )}

            {mode === "notfound" && (
              <section className="bg-white rounded-xl p-8 text-center space-y-3" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <AlertTriangle size={28} className="mx-auto text-[#C4531D]" />
                <p className="text-sm font-semibold text-[#1D1D1D]">We couldn't find a prior authorization form for this plan.</p>
                <p className="text-xs text-[#6F7276]">
                  Contact the help desk at{" "}
                  <a href="tel:8774504412" className="text-[#007178] font-semibold hover:underline">877-450-4412</a>
                  {" "}or{" "}
                  <a href="mailto:helpdesk@assistrx.com" className="text-[#007178] font-semibold hover:underline">helpdesk@assistrx.com</a>.
                </p>
              </section>
            )}

            {mode === "found" && (
              <>
                <div className="flex items-start gap-3 bg-[#EEF9F9] border border-[#007178] rounded-lg p-4">
                  <Star size={18} className="text-[#007178] flex-shrink-0 mt-0.5" fill="#007178" />
                  <p className="text-sm text-[#1D1D1D]">
                    <span className="font-semibold">This form is marked for accuracy.</span> AssistRx has verified this
                    form matches the patient's plan and is up to date with the payer's latest requirements.
                  </p>
                </div>

                <section className="bg-white rounded-xl p-6 flex items-center justify-between gap-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                  <div>
                    <p className="text-xs text-[#6F7276]">Prior authorization form</p>
                    <p className="text-base font-semibold text-[#1D1D1D]">{selectedForm}</p>
                  </div>
                  <button type="button" onClick={() => setMode("search")} className="text-sm font-semibold text-[#007178] hover:underline whitespace-nowrap">
                    Search for another form
                  </button>
                </section>

                <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg p-3 text-xs text-[#6F7276] leading-relaxed">
                  Answer each question completely and accurately. Incomplete or inconsistent answers are the most
                  common reason a prior authorization is delayed or denied by the payer.
                </div>

                <section className="bg-white rounded-xl p-6 space-y-5" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                  <h2 className="text-base font-semibold text-[#1D1D1D]">Clinical questions</h2>
                  {DYNAMIC_QUESTIONS.map((q, i) => (
                    <YesNoQuestion
                      key={i}
                      question={q}
                      value={pa.dynamicAnswers[i] ?? ""}
                      onChange={(v) => setPA({ dynamicAnswers: { ...pa.dynamicAnswers, [i]: v } })}
                    />
                  ))}
                  <YesNoQuestion question="Letter of Medical Necessity" value={pa.lmn} onChange={(v) => setPA({ lmn: v })} />
                </section>

                <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                  <h2 className="text-base font-semibold text-[#1D1D1D]">Payer details</h2>
                  {selectedInsurance ? (
                    <div className="border border-[#D9D9D9] rounded-lg p-3">
                      <p className="text-sm font-semibold text-[#1D1D1D]">{selectedInsurance.payer}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-1 text-xs text-[#6F7276]">
                        <span>Plan Type {selectedInsurance.planType || "—"}</span>
                        <span>Member ID {selectedInsurance.memberId || "—"}</span>
                        <span>PBM Phone {selectedInsurance.pbmPhone || "—"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#999]">No insurance was selected in Step 3 (Insurance).</p>
                  )}
                  <Field label="Insurance Contact Name or Department">
                    <input
                      value={pa.contactName || derivedContactName}
                      onChange={(e) => setPA({ contactName: e.target.value })}
                      placeholder="e.g. Prior Auth Department"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Diagnosis">
                    <input
                      value={pa.diagnosis || derivedDiagnosis}
                      onChange={(e) => setPA({ diagnosis: e.target.value })}
                      placeholder="e.g. Rheumatoid arthritis"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Treatment Start Date">
                    <input
                      value={pa.treatmentStart || derivedTreatmentStart}
                      onChange={(e) => setPA({ treatmentStart: e.target.value })}
                      placeholder="mm/dd/yyyy"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Current Treatment Plan" optional>
                    <textarea
                      value={pa.treatmentPlan}
                      onChange={(e) => setPA({ treatmentPlan: e.target.value.slice(0, 210) })}
                      rows={3}
                      className={`${inputCls} resize-none`}
                      placeholder="Describe the patient's current treatment plan"
                    />
                    <p className="text-xs text-[#999] text-right mt-1">{pa.treatmentPlan.length}/210</p>
                  </Field>
                  <Field label="Reason for Prescribing" optional>
                    <textarea
                      value={pa.reasonForPrescribing}
                      onChange={(e) => setPA({ reasonForPrescribing: e.target.value })}
                      rows={3}
                      className={`${inputCls} resize-none`}
                      placeholder="Describe the clinical rationale for this prescription"
                    />
                  </Field>
                </section>

                <section className="bg-white rounded-xl p-6 space-y-3" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                  <h2 className="text-base font-semibold text-[#1D1D1D]">Documents</h2>
                  <div className="border-2 border-dashed border-[#D9D9D9] rounded-lg p-6 text-center">
                    <Upload size={22} className="mx-auto text-[#999] mb-2" />
                    <p className="text-sm text-[#6F7276]">
                      Drag and drop file here, or{" "}
                      <span className="text-[#007178] font-semibold cursor-pointer hover:underline">upload it here</span>
                    </p>
                    <p className="text-xs text-[#999] mt-1">Files must be 19MB or less and in JPG, PNG, or PDF format</p>
                  </div>
                </section>

                <div className="flex justify-between pb-8">
                  <button
                    onClick={() => navigate("/new-case/clinical")}
                    className="text-sm font-semibold text-[#6F7276] border border-[#D9D9D9] rounded-full px-6 py-3 hover:bg-neutral-50"
                  >
                    Back
                  </button>
                  <div className="flex gap-3">
                    <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-6 py-3 hover:bg-[#EEF9F9]">
                      Save Answers
                    </button>
                    <button
                      onClick={() => navigate("/new-case/rx")}
                      className="bg-[#007178] text-white px-8 py-3 rounded-full font-semibold text-base hover:bg-[#03656B] transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
