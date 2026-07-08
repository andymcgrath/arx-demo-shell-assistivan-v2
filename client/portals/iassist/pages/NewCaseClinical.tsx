/**
 * NewCaseClinical — Step 4 (Enrollment/Clinical) of the iAssist eRx
 * case-creation wizard.
 *
 * Built from the "Step 4 - Clinical Step.pdf" Figma spec, titled
 * "Enrollment Information" on-screen (the spec notes this step is labeled
 * either "Enrollment Information" or "Clinical Information" per client —
 * kept as "Enrollment Information" here to match the actual screen text).
 * Self-contained, local-state form, same pattern as Steps 1-3.
 *
 * The spec's dropdown annotations describe three variants: a single-select,
 * a checkbox multi-select with a freeform "Other" option (displayed
 * comma-joined), and paired short inputs. All three are represented below.
 */
import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { X, Upload, Search } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";

const LINE_OF_THERAPY_OPTIONS = ["First line", "Second line", "Third line or later", "Treatment naive"];

const PRIOR_THERAPY_OPTIONS = ["Methotrexate", "Corticosteroids", "NSAIDs", "Biologic therapy", "Other"];

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
  optional,
  value,
  onChange,
}: {
  question: string;
  optional?: boolean;
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#1D1D1D] mb-2 flex items-center gap-1">
        {question}
        {optional && <span className="text-xs font-normal text-[#999]">Optional</span>}
      </p>
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

export default function NewCaseClinical() {
  const navigate = useNavigate();

  // Diagnosis
  const [icdSearch, setIcdSearch] = useState("");
  const [selectedIcd, setSelectedIcd] = useState("");
  const [diagnosisDate, setDiagnosisDate] = useState("");

  // Yes/No questions
  const [priorTherapy, setPriorTherapy] = useState<"yes" | "no" | "">("");
  const [contraindications, setContraindications] = useState<"yes" | "no" | "">("");
  const [labsAvailable, setLabsAvailable] = useState<"yes" | "no" | "">("");

  // Dropdowns
  const [lineOfTherapy, setLineOfTherapy] = useState("");
  const [priorTherapies, setPriorTherapies] = useState<string[]>([]);
  const [otherTherapy, setOtherTherapy] = useState("");

  // Paired short inputs
  const [labValue, setLabValue] = useState("");
  const [labDate, setLabDate] = useState("");

  const ICD_RESULTS = ["M06.9 — Rheumatoid arthritis, unspecified", "L40.0 — Psoriasis vulgaris", "K50.90 — Crohn's disease, unspecified"];
  const filteredIcd = icdSearch.trim()
    ? ICD_RESULTS.filter((r) => r.toLowerCase().includes(icdSearch.toLowerCase()))
    : ICD_RESULTS;

  function togglePriorTherapy(option: string) {
    setPriorTherapies((prev) => (prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]));
  }

  const priorTherapiesDisplay = [...priorTherapies.filter((o) => o !== "Other"), ...(priorTherapies.includes("Other") && otherTherapy ? [otherTherapy] : [])].join(", ");

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={4} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <IAssistLogo className="h-6 w-auto" />
            <button onClick={() => navigate("/")} className="text-[#6F7276] hover:text-[#1D1D1D] focus:outline-none" aria-label="Close and return to dashboard">
              <X size={20} />
            </button>
            <h1 className="text-xl font-semibold text-[#1D1D1D]">Enrollment Information</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/new-case/pa")} className="text-sm font-semibold text-[#6F7276] hover:text-[#1D1D1D]">
              Skip Step
            </button>
            <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-4 py-1.5 hover:bg-[#EEF9F9]">
              Save Draft
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg p-3 text-xs text-[#6F7276] leading-relaxed">
              Important instructions or notes should be placed inside this box. Please use the correct box size for
              the correct copy. Max character of 500.
            </div>

            {/* Diagnosis */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Diagnosis</h2>
              <Field label="ICD-10 Code with Diagnosis">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input
                    value={icdSearch}
                    onChange={(e) => setIcdSearch(e.target.value)}
                    placeholder="Search for a diagnosis or ICD-10 code"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </Field>
              {icdSearch && (
                <div className="border border-[#D9D9D9] rounded-lg divide-y divide-[#F0F0F0]">
                  {filteredIcd.length === 0 && <p className="p-3 text-xs text-[#999]">No matches found</p>}
                  {filteredIcd.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setSelectedIcd(r);
                        setIcdSearch("");
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-[#1D1D1D] hover:bg-[#EEF9F9]"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {selectedIcd ? (
                <p className="text-sm text-[#1D1D1D]">
                  <span className="font-semibold">Selected: </span>{selectedIcd}
                </p>
              ) : (
                <p className="text-xs text-[#999]">ICD-10 Code Skipped</p>
              )}
              <Field label="Date of Diagnosis" optional>
                <input type="date" value={diagnosisDate} onChange={(e) => setDiagnosisDate(e.target.value)} className={inputCls} />
              </Field>
            </section>

            {/* Clinical questions */}
            <section className="bg-white rounded-xl p-6 space-y-5" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <YesNoQuestion question="Has the patient tried and failed a prior therapy for this condition?" value={priorTherapy} onChange={setPriorTherapy} />
              <YesNoQuestion question="Are there any known contraindications?" optional value={contraindications} onChange={setContraindications} />
              <YesNoQuestion question="Are recent labs available for this patient?" optional value={labsAvailable} onChange={setLabsAvailable} />

              <Field label="Line of Therapy">
                <select value={lineOfTherapy} onChange={(e) => setLineOfTherapy(e.target.value)} className={`${inputCls} appearance-none`}>
                  <option value="">Select</option>
                  {LINE_OF_THERAPY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <div>
                <span className="text-sm font-semibold text-[#1D1D1D] mb-1.5 block">Prior Therapies Tried</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-[#D9D9D9] rounded-lg p-3">
                  {PRIOR_THERAPY_OPTIONS.map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm text-[#1D1D1D]">
                      <input type="checkbox" checked={priorTherapies.includes(o)} onChange={() => togglePriorTherapy(o)} className="accent-[#007178]" />
                      {o}
                    </label>
                  ))}
                </div>
                {priorTherapies.includes("Other") && (
                  <input
                    value={otherTherapy}
                    onChange={(e) => setOtherTherapy(e.target.value)}
                    placeholder="Specify other therapy"
                    className={`${inputCls} mt-2`}
                  />
                )}
                {priorTherapiesDisplay && (
                  <p className="text-xs text-[#6F7276] mt-2">Selected: {priorTherapiesDisplay}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Most Recent Lab Value" optional>
                  <input value={labValue} onChange={(e) => setLabValue(e.target.value)} placeholder="e.g. 7.2" className={inputCls} />
                </Field>
                <Field label="Lab Date" optional>
                  <input type="date" value={labDate} onChange={(e) => setLabDate(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </section>

            {/* Documents */}
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

            <div className="flex justify-end pb-8">
              <button
                onClick={() => navigate("/new-case/pa")}
                className="bg-[#007178] text-white px-8 py-3 rounded-full font-semibold text-base hover:bg-[#03656B] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
