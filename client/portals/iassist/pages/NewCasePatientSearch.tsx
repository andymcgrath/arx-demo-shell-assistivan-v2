/**
 * NewCasePatientSearch — intermediate screen shown between the Dashboard's
 * "Commonly Prescribed" Start button and Step 1 (Patient Information).
 *
 * The Dashboard's other case-creation entry points (a Patients row, "Add New
 * Patient") already know which patient they mean, so they jump straight to
 * /new-case/patient. Starting from a medication card is different — the
 * presenter picked a drug, not a patient — so this screen lets them search
 * for (or add) a patient first, same as they would on the Dashboard itself.
 *
 * Reuses the Dashboard's own filter logic (name / DOB / medication) against
 * the same SAMPLE_PATIENTS roster, so results here match what you'd see
 * searching from the Dashboard. Selecting a result or adding a new patient
 * does NOT reset caseWizardStore — the medication the presenter just picked
 * on the Dashboard is already sitting in the medication slice, and this
 * screen's whole point is to carry it forward into Step 1/Step 2 intact.
 */
import { useState } from "react";
import { Search, Plus, X } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { SAMPLE_PATIENTS } from "@/store/samplePatients";
import { IAssistLogo } from "../components/IAssistSidebar";

const inputCls =
  "w-full rounded-lg border border-[#D9D9D9] px-3 py-2.5 text-sm text-[#1D1D1D] outline-none focus:ring-2 focus:ring-[#007178] focus:border-[#007178] placeholder:text-[#999]";

export default function NewCasePatientSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const results = q
    ? SAMPLE_PATIENTS.filter(
        (p) => p.name.toLowerCase().includes(q) || p.dob.includes(q) || p.medication.toLowerCase().includes(q)
      )
    : [];

  // Selecting a patient (or adding a new one) always lands on the same
  // known-patient form in this demo, same as every other entry point —
  // intentionally not resetting caseWizardStore here so the medication
  // chosen on the Dashboard carries through.
  function proceedToPatientInfo() {
    navigate("/new-case/patient");
  }

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex flex-col font-['Open_Sans']">
      <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <IAssistLogo className="h-6 w-auto hidden sm:block" />
          <button
            onClick={() => navigate("/")}
            className="text-[#6F7276] hover:text-[#1D1D1D] focus:outline-none"
            aria-label="Close and return to dashboard"
          >
            <X size={20} />
          </button>
          <h1 className="text-xl font-semibold text-[#1D1D1D]">Patient Information</h1>
        </div>
        <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-4 py-1.5 hover:bg-[#EEF9F9]">
          Save Draft
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Start typing to search for existing patient"
                className={`${inputCls} pl-10`}
                aria-label="Search for existing patient"
              />
            </div>

            {q && (
              <div className="border border-[#D9D9D9] rounded-lg divide-y divide-[#F0F0F0]">
                {results.length === 0 && <p className="p-3 text-sm text-[#999]">No patients found for "{query}"</p>}
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={proceedToPatientInfo}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#EEF9F9] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#1D1D1D]">{p.name}</p>
                      <p className="text-xs text-[#6F7276] mt-0.5">DOB {p.dob}</p>
                    </div>
                    <p className="text-xs font-semibold text-[#6F7276]">{p.medication}</p>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={proceedToPatientInfo}
              className="text-sm font-semibold text-[#007178] flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Add new patient
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
