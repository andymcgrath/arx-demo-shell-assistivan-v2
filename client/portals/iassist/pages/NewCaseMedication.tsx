/**
 * NewCaseMedication — Step 2 (Medication Details) of the iAssist eRx
 * case-creation wizard.
 *
 * Built from the "Step 2 (Med Details).pdf" Figma spec. Like Step 1, this is
 * a self-contained form with no ties to the shared XState workflow
 * machine — case-creation data entry is separate from the pharmacy-status
 * parallel machine iAssist.ts models. Fields live in caseWizardStore so
 * Back/Next preserve answers (see that store's file header).
 *
 * The spec shows three different pharmacy sub-flows depending on the
 * medication/client config (standard search, Site of Care for buy-and-bill
 * products, and Limited Distribution Pharmacies). Rather than guess which
 * one a given medication should trigger, this demo exposes all three behind
 * a mode switcher — consistent with this app's existing pattern of letting
 * the presenter pick which state to show (e.g. the shell's stage-jump menu).
 */
import { useNavigate } from "@/lib/portalRouter";
import { Info, X } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";
import { useCaseWizardStore } from "@/store/caseWizardStore";

const MEDICATION_OPTIONS = [
  "Assistivan 10 MG ORAL TABLET 100 EA NDC 123456789",
  "Assistimab 40MG/ML SUBCUTANEOUS SOLN PREF SRY 1ML",
  "Ramoni 20MG ORAL TABLET 30 EA",
  "Voloxivan 5MG/ML INJECTION 10ML VIAL",
];

// JCode/CPT pairs keyed by medication — prefills Step 2's billing code fields
// as soon as a medication is picked, instead of leaving them blank for the
// user to look up manually.
const MEDICATION_CODES: Record<string, { jcode: string; cptCode: string }> = {
  "Assistivan 10 MG ORAL TABLET 100 EA NDC 123456789": { jcode: "J8499", cptCode: "99070" },
  "Assistimab 40MG/ML SUBCUTANEOUS SOLN PREF SRY 1ML": { jcode: "J3590", cptCode: "96401" },
  "Ramoni 20MG ORAL TABLET 30 EA": { jcode: "J8499", cptCode: "99070" },
  "Voloxivan 5MG/ML INJECTION 10ML VIAL": { jcode: "J3490", cptCode: "96413" },
};

const FORM_OPTIONS = ["Tablet", "Capsule", "Oral Solution", "Injection", "Infusion"];

const LDD_PHARMACIES = ["Accredo", "Amber", "Centerwell", "CVS", "Maxor", "Optum", "Walgreens"];

const SITE_OF_CARE_OPTIONS = ["Hospital Outpatient Department", "Four Oaks Clinic", "Patient Home", "Prescriber Office"];

// A 2-result "search" wasn't worth the UI — this is a straight preferred-
// pharmacy dropdown instead, same pattern as the Limited Distribution list.
// CoAssist (AssistRx's own specialty pharmacy) leads the list.
const STANDARD_PHARMACY_OPTIONS = ["CoAssist", "CVS Pharmacy", "Accredo", "Walgreens Pharmacy"];

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

export default function NewCaseMedication() {
  const navigate = useNavigate();
  const med = useCaseWizardStore((s) => s.medication);
  const setMedication = useCaseWizardStore((s) => s.setMedication);

  function handleMedicationChange(value: string) {
    const codes = MEDICATION_CODES[value];
    setMedication({ medication: value, jcode: codes?.jcode ?? "", cptCode: codes?.cptCode ?? "" });
  }

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={2} />

      <div className="flex-1 flex flex-col min-w-0">
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
            <h1 className="text-xl font-semibold text-[#1D1D1D]">Medication Details</h1>
          </div>
          <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-4 py-1.5 hover:bg-[#EEF9F9]">
            Save Draft
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Medication */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg p-3 text-xs text-[#6F7276] leading-relaxed">
                Important instructions or notes should be placed inside this box. Please use the correct box size for
                the correct copy. Max character of 500.
              </div>

              <Field label="Medication Name">
                <select value={med.medication} onChange={(e) => handleMedicationChange(e.target.value)} className={`${inputCls} appearance-none`}>
                  {MEDICATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="JCode" optional>
                  <input value={med.jcode} onChange={(e) => setMedication({ jcode: e.target.value })} placeholder="JCode" className={inputCls} />
                </Field>
                <Field label="CPT Code" optional>
                  <input value={med.cptCode} onChange={(e) => setMedication({ cptCode: e.target.value })} placeholder="CPT Code" className={inputCls} />
                </Field>
              </div>

              <Field label="Form">
                <select value={med.form} onChange={(e) => setMedication({ form: e.target.value })} className={`${inputCls} appearance-none`}>
                  <option value="">Select form</option>
                  {FORM_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Quantity">
                  <input value={med.quantity} onChange={(e) => setMedication({ quantity: e.target.value.replace(/\D/g, "") })} placeholder="0" className={inputCls} />
                </Field>
                <Field label="Days Supply">
                  <input value={med.daysSupply} onChange={(e) => setMedication({ daysSupply: e.target.value.replace(/\D/g, "") })} placeholder="0" className={inputCls} />
                </Field>
              </div>
            </section>

            {/* Pharmacy */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <div>
                <h2 className="text-base font-semibold text-[#1D1D1D] mb-1">Pharmacy</h2>
                <p className="text-xs text-[#6F7276] leading-relaxed">
                  Completing this step does not submit an electronic prescription to the pharmacy. iAssist uses this
                  information to provide pricing and populate the prescription for your review (in the final step).
                </p>
              </div>

              {/* Demo-only mode switcher — see file header comment */}
              <div className="flex gap-1 bg-[#F0F0F0] rounded-lg p-0.5 w-fit">
                {([
                  ["standard", "Preferred Pharmacy"],
                  ["soc", "Site of Care"],
                  ["ldd", "Limited Distribution"],
                ] as [typeof med.pharmacyMode, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMedication({ pharmacyMode: val })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      med.pharmacyMode === val ? "bg-white text-[#007178] shadow-sm" : "text-[#6F7276]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {med.pharmacyMode === "standard" && (
                <div className="space-y-4">
                  <Field label="Preferred Pharmacy">
                    <select value={med.selectedPharmacy} onChange={(e) => setMedication({ selectedPharmacy: e.target.value })} className={`${inputCls} appearance-none`}>
                      {STANDARD_PHARMACY_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Zip Code" optional>
                    <input
                      value={med.zip}
                      onChange={(e) => setMedication({ zip: e.target.value.replace(/\D/g, "") })}
                      placeholder="Enter zip code"
                      maxLength={5}
                      className={`${inputCls} w-36`}
                    />
                  </Field>
                </div>
              )}

              {med.pharmacyMode === "soc" && (
                <div className="space-y-4">
                  <div className="bg-[#FFF7ED] border border-[#FDE7C7] rounded-lg p-3 text-xs text-[#92400E] flex gap-2">
                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                    Site of Care applies only to buy-and-bill products (e.g. SYFOVRE).
                  </div>
                  <Field label="Single NDC Medication Name">
                    <input value={med.medication} disabled className={`${inputCls} bg-neutral-50 text-[#6F7276]`} />
                  </Field>
                  <Field label="Site of Care">
                    <select value={med.siteOfCare} onChange={(e) => setMedication({ siteOfCare: e.target.value })} className={`${inputCls} appearance-none`}>
                      <option value="">Select</option>
                      {SITE_OF_CARE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="HOPD NPI">
                      <input value={med.hopdNpi} onChange={(e) => setMedication({ hopdNpi: e.target.value.replace(/\D/g, "") })} placeholder="1245319599" className={inputCls} />
                    </Field>
                    <Field label="TIN">
                      <input value={med.tin} onChange={(e) => setMedication({ tin: e.target.value })} placeholder="12-1234567" className={inputCls} />
                    </Field>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1D] mb-2">Are you working with a Specialty Pharmacy?</p>
                    <div className="flex gap-4">
                      {(["yes", "no"] as const).map((v) => (
                        <label key={v} className="flex items-center gap-2 text-sm text-[#1D1D1D] capitalize">
                          <input type="radio" name="specialtyPharmacy" checked={med.specialtyPharmacy === v} onChange={() => setMedication({ specialtyPharmacy: v })} className="accent-[#007178]" />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {med.pharmacyMode === "ldd" && (
                <div className="space-y-4">
                  <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg p-3 text-xs text-[#6F7276] leading-relaxed">
                    This medication has a limited pharmacy network. If you select a pharmacy not provided in the
                    limited network, it may result in a delay.
                  </div>
                  <Field label="Limited Distribution Pharmacies">
                    <select value={med.lddPharmacy} onChange={(e) => setMedication({ lddPharmacy: e.target.value })} className={`${inputCls} appearance-none`}>
                      {LDD_PHARMACIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => setMedication({ pharmacyMode: "standard" })}
                    className="text-sm font-semibold text-[#007178] hover:underline"
                  >
                    Select a preferred pharmacy instead
                  </button>
                </div>
              )}
            </section>

            <div className="flex justify-between pb-8">
              <button
                onClick={() => navigate("/new-case/patient")}
                className="text-sm font-semibold text-[#6F7276] border border-[#D9D9D9] rounded-full px-6 py-3 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                onClick={() => navigate("/new-case/insurance")}
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
