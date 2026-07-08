/**
 * NewCaseMedication — Step 2 (Medication Details) of the iAssist eRx
 * case-creation wizard.
 *
 * Built from the "Step 2 (Med Details).pdf" Figma spec. Like Step 1, this is
 * a self-contained, local-state form with no ties to the shared XState
 * workflow machine — case-creation data entry is separate from the
 * pharmacy-status parallel machine iAssist.ts models.
 *
 * The spec shows three different pharmacy sub-flows depending on the
 * medication/client config (standard search, Site of Care for buy-and-bill
 * products, and Limited Distribution Pharmacies). Rather than guess which
 * one a given medication should trigger, this demo exposes all three behind
 * a mode switcher — consistent with this app's existing pattern of letting
 * the presenter pick which state to show (e.g. the shell's stage-jump menu).
 */
import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { Info, X, Search } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";

type PharmacyMode = "standard" | "soc" | "ldd";

const MEDICATION_OPTIONS = [
  "Assistivan 10 MG ORAL TABLET 100 EA NDC 123456789",
  "Assistimab 40MG/ML SUBCUTANEOUS SOLN PREF SRY 1ML",
  "Ramoni 20MG ORAL TABLET 30 EA",
  "Voloxivan 5MG/ML INJECTION 10ML VIAL",
];

const FORM_OPTIONS = ["Tablet", "Capsule", "Oral Solution", "Injection", "Infusion"];

const LDD_PHARMACIES = ["Accredo", "Amber", "Centerwell", "CVS", "Maxor", "Optum", "Walgreens"];

const SITE_OF_CARE_OPTIONS = ["Hospital Outpatient Department", "Four Oaks Clinic", "Patient Home", "Prescriber Office"];

interface PharmacyResult {
  name: string;
  address: string;
}

const STANDARD_PHARMACIES: PharmacyResult[] = [
  { name: "CVS Pharmacy", address: "412 Main St, Warrior AL 35180" },
  { name: "Accredo", address: "Specialty Pharmacy" },
];

const WALGREENS_RESULTS: PharmacyResult[] = [
  { name: "Walgreens Pharmacy Inc", address: "219 Main St, Warrior AL 35180" },
  { name: "Walgreens Pharmacy", address: "606 N. Brindlee Mtn Parkway, Arab, AL 35016" },
  { name: "Walgreens Pharmacy", address: "3100 Hough Rd, Florence, AL 35630" },
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

function PharmacySearchResults({ results, onSelect, selected }: { results: PharmacyResult[]; onSelect: (name: string) => void; selected: string }) {
  return (
    <div className="space-y-2 mt-3">
      {results.map((p) => (
        <label
          key={p.name + p.address}
          className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
            selected === p.name ? "border-[#007178] bg-[#EEF9F9]" : "border-[#D9D9D9] hover:bg-neutral-50"
          }`}
        >
          <input type="radio" name="pharmacy" checked={selected === p.name} onChange={() => onSelect(p.name)} className="mt-1 accent-[#007178]" />
          <span>
            <span className="block text-sm font-semibold text-[#1D1D1D]">{p.name}</span>
            <span className="block text-xs text-[#6F7276]">{p.address}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export default function NewCaseMedication() {
  const navigate = useNavigate();

  const [medication, setMedication] = useState(MEDICATION_OPTIONS[0]);
  const [jcode, setJcode] = useState("");
  const [cptCode, setCptCode] = useState("");
  const [form, setForm] = useState("");
  const [quantity, setQuantity] = useState("");
  const [daysSupply, setDaysSupply] = useState("");

  const [pharmacyMode, setPharmacyMode] = useState<PharmacyMode>("standard");

  // Standard search
  const [pharmacySearch, setPharmacySearch] = useState("");
  const [zip, setZip] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState("");
  const searchResults = pharmacySearch.trim()
    ? WALGREENS_RESULTS.filter((p) => p.name.toLowerCase().includes(pharmacySearch.toLowerCase()))
    : STANDARD_PHARMACIES;

  // Site of Care
  const [siteOfCare, setSiteOfCare] = useState("");
  const [hopdNpi, setHopdNpi] = useState("");
  const [tin, setTin] = useState("");
  const [specialtyPharmacy, setSpecialtyPharmacy] = useState<"yes" | "no" | "">("");

  // Limited Distribution
  const [lddPharmacy, setLddPharmacy] = useState(LDD_PHARMACIES[0]);

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={2} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <IAssistLogo className="h-6 w-auto" />
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
                <select value={medication} onChange={(e) => setMedication(e.target.value)} className={`${inputCls} appearance-none`}>
                  {MEDICATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="JCode" optional>
                  <input value={jcode} onChange={(e) => setJcode(e.target.value)} placeholder="JCode" className={inputCls} />
                </Field>
                <Field label="CPT Code" optional>
                  <input value={cptCode} onChange={(e) => setCptCode(e.target.value)} placeholder="CPT Code" className={inputCls} />
                </Field>
              </div>

              <Field label="Form">
                <select value={form} onChange={(e) => setForm(e.target.value)} className={`${inputCls} appearance-none`}>
                  <option value="">Select form</option>
                  {FORM_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Quantity">
                  <input value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} placeholder="0" className={inputCls} />
                </Field>
                <Field label="Days Supply">
                  <input value={daysSupply} onChange={(e) => setDaysSupply(e.target.value.replace(/\D/g, ""))} placeholder="0" className={inputCls} />
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
                  ["standard", "Pharmacy Search"],
                  ["soc", "Site of Care"],
                  ["ldd", "Limited Distribution"],
                ] as [PharmacyMode, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPharmacyMode(val)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      pharmacyMode === val ? "bg-white text-[#007178] shadow-sm" : "text-[#6F7276]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {pharmacyMode === "standard" && (
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                      <input
                        value={pharmacySearch}
                        onChange={(e) => setPharmacySearch(e.target.value)}
                        placeholder="Search for pharmacy"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                    <input
                      value={zip}
                      onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter zip code"
                      maxLength={5}
                      className={`${inputCls} w-36`}
                    />
                  </div>
                  <PharmacySearchResults results={searchResults} onSelect={setSelectedPharmacy} selected={selectedPharmacy} />
                </div>
              )}

              {pharmacyMode === "soc" && (
                <div className="space-y-4">
                  <div className="bg-[#FFF7ED] border border-[#FDE7C7] rounded-lg p-3 text-xs text-[#92400E] flex gap-2">
                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                    Site of Care applies only to buy-and-bill products (e.g. SYFOVRE).
                  </div>
                  <Field label="Single NDC Medication Name">
                    <input value={medication} disabled className={`${inputCls} bg-neutral-50 text-[#6F7276]`} />
                  </Field>
                  <Field label="Site of Care">
                    <select value={siteOfCare} onChange={(e) => setSiteOfCare(e.target.value)} className={`${inputCls} appearance-none`}>
                      <option value="">Select</option>
                      {SITE_OF_CARE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="HOPD NPI">
                      <input value={hopdNpi} onChange={(e) => setHopdNpi(e.target.value.replace(/\D/g, ""))} placeholder="1245319599" className={inputCls} />
                    </Field>
                    <Field label="TIN">
                      <input value={tin} onChange={(e) => setTin(e.target.value)} placeholder="12-1234567" className={inputCls} />
                    </Field>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1D] mb-2">Are you working with a Specialty Pharmacy?</p>
                    <div className="flex gap-4">
                      {(["yes", "no"] as const).map((v) => (
                        <label key={v} className="flex items-center gap-2 text-sm text-[#1D1D1D] capitalize">
                          <input type="radio" name="specialtyPharmacy" checked={specialtyPharmacy === v} onChange={() => setSpecialtyPharmacy(v)} className="accent-[#007178]" />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {pharmacyMode === "ldd" && (
                <div className="space-y-4">
                  <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg p-3 text-xs text-[#6F7276] leading-relaxed">
                    This medication has a limited pharmacy network. If you select a pharmacy not provided in the
                    limited network, it may result in a delay.
                  </div>
                  <Field label="Limited Distribution Pharmacies">
                    <select value={lddPharmacy} onChange={(e) => setLddPharmacy(e.target.value)} className={`${inputCls} appearance-none`}>
                      {LDD_PHARMACIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => setPharmacyMode("standard")}
                    className="text-sm font-semibold text-[#007178] hover:underline"
                  >
                    Select a preferred pharmacy instead
                  </button>
                </div>
              )}
            </section>

            <div className="flex justify-end pb-8">
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
