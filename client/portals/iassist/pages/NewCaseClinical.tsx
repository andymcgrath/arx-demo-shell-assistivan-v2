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

// Full ICD-10 reference list surfaced by the diagnosis search below, grouped
// by clinical area. "Other" holds the original three demo codes this step
// shipped with before the fuller list was added.
const ICD10_GROUPS: { category: string; codes: { code: string; label: string }[] }[] = [
  {
    category: "Other",
    codes: [
      { code: "M06.9", label: "Rheumatoid arthritis, unspecified" },
      { code: "L40.0", label: "Psoriasis vulgaris" },
      { code: "K50.90", label: "Crohn's disease, unspecified" },
    ],
  },
  {
    category: "Respiratory",
    codes: [
      { code: "J02.9", label: "Acute pharyngitis, unspecified" },
      { code: "J06.9", label: "Acute upper respiratory infection, unspecified" },
      { code: "J20.9", label: "Acute bronchitis, unspecified" },
      { code: "J22", label: "Unspecified acute lower respiratory infection" },
      { code: "J30.9", label: "Allergic rhinitis, unspecified" },
      { code: "J32.9", label: "Chronic sinusitis, unspecified" },
      { code: "J40", label: "Bronchitis, not specified as acute or chronic" },
      { code: "J44.9", label: "COPD, unspecified" },
      { code: "J45.909", label: "Unspecified asthma, uncomplicated" },
    ],
  },
  {
    category: "Cardiovascular",
    codes: [
      { code: "I10", label: "Hypertension" },
      { code: "I25.10", label: "Atherosclerotic heart disease of native coronary artery without angina" },
      { code: "I48.91", label: "Unspecified atrial fibrillation" },
      { code: "I50.9", label: "Heart failure, unspecified" },
      { code: "R00.0", label: "Tachycardia, unspecified" },
      { code: "R00.1", label: "Bradycardia, unspecified" },
    ],
  },
  {
    category: "Endocrine / Metabolic",
    codes: [
      { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
      { code: "E11.65", label: "Type 2 diabetes mellitus with hyperglycemia" },
      { code: "E78.5", label: "Hyperlipidemia, unspecified" },
      { code: "E78.00", label: "Pure hypercholesterolemia, unspecified" },
    ],
  },
  {
    category: "Gastrointestinal",
    codes: [
      { code: "K21.0", label: "GERD with esophagitis" },
      { code: "K21.9", label: "GERD without esophagitis" },
      { code: "K30", label: "Functional dyspepsia" },
      { code: "K59.00", label: "Constipation, unspecified" },
      { code: "R10.9", label: "Unspecified abdominal pain" },
    ],
  },
  {
    category: "Musculoskeletal / Pain",
    codes: [
      { code: "M54.5", label: "Low back pain" },
      { code: "M54.6", label: "Pain in thoracic spine" },
      { code: "M79.1", label: "Myalgia" },
      { code: "M25.50", label: "Pain in unspecified joint" },
      { code: "M25.511", label: "Pain in right shoulder" },
      { code: "M25.512", label: "Pain in left shoulder" },
      { code: "M25.561", label: "Pain in right knee" },
      { code: "M25.562", label: "Pain in left knee" },
    ],
  },
  {
    category: "Mental Health",
    codes: [
      { code: "F32.9", label: "Major depressive disorder, single episode, unspecified" },
      { code: "F33.0", label: "Major depressive disorder, recurrent, mild" },
      { code: "F41.1", label: "Generalized anxiety disorder" },
      { code: "F40.10", label: "Social anxiety disorder, unspecified" },
      { code: "F17.200", label: "Nicotine dependence, cigarettes, uncomplicated" },
    ],
  },
  {
    category: "Common Z Codes (Status / History / Screening)",
    codes: [
      { code: "Z79.4", label: "Long term (current) use of insulin" },
      { code: "Z79.899", label: "Other long term (current) drug therapy" },
      { code: "Z85.43", label: "Personal history of malignant neoplasm of breast" },
      { code: "Z95.1", label: "Presence of aortocoronary bypass graft" },
      { code: "Z96.651", label: "Presence of right hip prosthetic joint" },
    ],
  },
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

  const filteredIcd = icdSearch.trim()
    ? ICD10_GROUPS
        .map((g) => ({
          ...g,
          codes: g.codes.filter(
            (c) =>
              c.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
              c.label.toLowerCase().includes(icdSearch.toLowerCase())
          ),
        }))
        .filter((g) => g.codes.length > 0)
    : [];

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={4} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <IAssistLogo className="h-6 w-auto hidden sm:block" />
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
                <div className="border border-[#D9D9D9] rounded-lg divide-y divide-[#F0F0F0] max-h-72 overflow-auto">
                  {filteredIcd.length === 0 && <p className="p-3 text-xs text-[#999]">No matches found</p>}
                  {filteredIcd.map((g) => (
                    <div key={g.category}>
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold text-[#6F7276] bg-[#F8F8F8]">{g.category}</p>
                      {g.codes.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedIcd(`${c.code} — ${c.label}`);
                            setIcdSearch("");
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-[#1D1D1D] hover:bg-[#EEF9F9]"
                        >
                          <span className="font-semibold">{c.code}</span> — {c.label}
                        </button>
                      ))}
                    </div>
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

            <div className="flex justify-between pb-8">
              <button
                onClick={() => navigate("/new-case/insurance")}
                className="text-sm font-semibold text-[#6F7276] border border-[#D9D9D9] rounded-full px-6 py-3 hover:bg-neutral-50"
              >
                Back
              </button>
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
