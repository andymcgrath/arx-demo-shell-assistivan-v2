/**
 * NewCaseInsurance — Step 3 (Insurance) of the iAssist eRx case-creation
 * wizard.
 *
 * Built from the "Step 3 (Insurance).pdf" Figma spec. Self-contained,
 * local-state form, same pattern as Steps 1-2 — no ties to the shared
 * XState workflow machine.
 *
 * The spec shows three distinct states (searching / insurance found / none
 * found) that in the real product happen automatically as ABV runs in the
 * background. Like Step 2's pharmacy mode switcher, this exposes them as a
 * demo-only toggle so a presenter can show any of the three without waiting
 * on a fake timer.
 */
import { useEffect } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { X, Plus, Trash2, Search } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";
import { useCaseWizardStore, type ManualInsurance } from "@/store/caseWizardStore";

type SearchState = "searching" | "found" | "none";
type InsuranceKind = "medical" | "pharmacy";

interface FoundInsurance {
  id: string;
  payer: string;
  planType: string;
  rxBin: string;
  rxPcn: string;
  memberId: string;
  relationship: string;
  pbmPhone: string;
}

const FOUND_INSURANCES: FoundInsurance[] = [
  {
    id: "cvs-caremark",
    payer: "CVS Caremark Pharmacy",
    planType: "Commercial",
    rxBin: "003858",
    rxPcn: "A4",
    memberId: "HQK883883ZZ88",
    relationship: "Self",
    pbmPhone: "(555) 555-5555",
  },
];

const ON_FILE_INSURANCE: FoundInsurance = {
  id: "on-file-bcbs",
  payer: "BlueCross BlueShield",
  planType: "Commercial",
  rxBin: "119082",
  rxPcn: "003858",
  memberId: "HQK883883ZZ88",
  relationship: "Self",
  pbmPhone: "(555) 555-5555",
};

const MEDICAL_INSURANCE_TYPES = ["Medicare", "Commercial", "Medicaid", "Other"];
const PHARMACY_PLAN_TYPES = ["Commercial", "Unknown", "AIDS Drug Assistance Program", "Durable Medical Equipment", "Government", "Managed Care Medicaid"];
const RELATIONSHIP_OPTIONS = ["Self (Patient)", "Spouse", "Parent", "Child (Dependent)", "Other"];
const COB_OPTIONS = ["Primary", "Secondary", "Tertiary", "Quaternary", "Other"];

function emptyManualInsurance(kind: InsuranceKind): ManualInsurance {
  return {
    id: crypto.randomUUID(),
    kind,
    companyName: "",
    type: "",
    groupNumber: "",
    memberId: "",
    relationship: "",
    cardholderDob: "",
    cardholderFirst: "",
    cardholderLast: "",
    phone: "",
    fax: "",
    cob: "",
  };
}

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

function InsuranceCard({ insurance, selected, onSelect, onEdit }: { insurance: FoundInsurance; selected: boolean; onSelect: () => void; onEdit?: () => void }) {
  return (
    <label
      className={`block border rounded-lg p-4 cursor-pointer transition-colors ${
        selected ? "border-[#007178] bg-[#EEF9F9]" : "border-[#D9D9D9] hover:bg-neutral-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input type="radio" name="preferredInsurance" checked={selected} onChange={onSelect} className="mt-1 accent-[#007178]" />
          <div>
            <p className="text-sm font-semibold text-[#1D1D1D]">{insurance.payer}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 mt-1 text-xs text-[#6F7276]">
              <span>Plan Type {insurance.planType}</span>
              <span>RxBin {insurance.rxBin}</span>
              <span>RxPCN {insurance.rxPcn}</span>
              <span>Rx Member ID {insurance.memberId}</span>
              <span>Relationship {insurance.relationship}</span>
              <span>PBM Phone {insurance.pbmPhone}</span>
            </div>
          </div>
        </div>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-xs font-semibold text-[#007178] hover:underline flex-shrink-0">
            Edit
          </button>
        )}
      </div>
    </label>
  );
}

function ManualInsuranceForm({
  insurance,
  onChange,
  onDelete,
}: {
  insurance: ManualInsurance;
  onChange: (patch: Partial<ManualInsurance>) => void;
  onDelete: () => void;
}) {
  const typeOptions = insurance.kind === "medical" ? MEDICAL_INSURANCE_TYPES : PHARMACY_PLAN_TYPES;
  return (
    <div className="border border-[#D9D9D9] rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1D1D1D]">
          {insurance.kind === "medical" ? "Medical Insurance" : "Pharmacy Insurance"}
        </h3>
        <button type="button" onClick={onDelete} className="text-[#999] hover:text-[#D02B20] flex items-center gap-1 text-xs font-semibold">
          <Trash2 size={14} /> Delete Insurance
        </button>
      </div>
      <Field label="Insurance Company Name">
        <input value={insurance.companyName} onChange={(e) => onChange({ companyName: e.target.value })} placeholder="Insurance company" className={inputCls} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={insurance.kind === "medical" ? "Insurance Type" : "Plan Type"} optional>
          <select value={insurance.type} onChange={(e) => onChange({ type: e.target.value })} className={`${inputCls} appearance-none`}>
            <option value="">Select</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Group Number" optional>
          <input value={insurance.groupNumber} onChange={(e) => onChange({ groupNumber: e.target.value })} placeholder="Group number" className={inputCls} />
        </Field>
        <Field label="Member ID" optional>
          <input value={insurance.memberId} onChange={(e) => onChange({ memberId: e.target.value })} placeholder="Member ID" className={inputCls} />
        </Field>
        <Field label="Relationship to Cardholder" optional>
          <select value={insurance.relationship} onChange={(e) => onChange({ relationship: e.target.value })} className={`${inputCls} appearance-none`}>
            <option value="">Select</option>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Cardholder Date of Birth">
          <input type="date" value={insurance.cardholderDob} onChange={(e) => onChange({ cardholderDob: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Cardholder First Name">
            <input value={insurance.cardholderFirst} onChange={(e) => onChange({ cardholderFirst: e.target.value })} placeholder="First name" className={inputCls} />
          </Field>
          <Field label="Cardholder Last Name">
            <input value={insurance.cardholderLast} onChange={(e) => onChange({ cardholderLast: e.target.value })} placeholder="Last name" className={inputCls} />
          </Field>
        </div>
        <Field label="Phone" optional>
          <input value={insurance.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="(555) 555-5555" className={inputCls} />
        </Field>
        <Field label="Fax" optional>
          <input value={insurance.fax} onChange={(e) => onChange({ fax: e.target.value })} placeholder="Fax number" className={inputCls} />
        </Field>
        <Field label="Coordination of Benefits">
          <select value={insurance.cob} onChange={(e) => onChange({ cob: e.target.value })} className={`${inputCls} appearance-none`}>
            <option value="">Select</option>
            {COB_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

const ALL_FOUND_INSURANCES = [...FOUND_INSURANCES, ON_FILE_INSURANCE];

export default function NewCaseInsurance() {
  const navigate = useNavigate();
  const insurance = useCaseWizardStore((s) => s.insurance);
  const setInsurance = useCaseWizardStore((s) => s.setInsurance);
  const setSelectedInsurance = useCaseWizardStore((s) => s.setSelectedInsurance);
  const { searchState, preferredId, manualInsurances, notInsured } = insurance;

  // Carry whichever insurance is actually selected forward to caseWizardStore
  // so Step 5's Payer details section can prefill from it instead of being a
  // disconnected free-text section.
  useEffect(() => {
    if (searchState === "none") {
      if (notInsured || manualInsurances.length === 0) {
        setSelectedInsurance(null);
        return;
      }
      const m = manualInsurances[manualInsurances.length - 1];
      setSelectedInsurance({
        payer: m.companyName || "Manually added insurance",
        planType: m.type,
        memberId: m.memberId,
        pbmPhone: m.phone,
      });
      return;
    }

    const picked = ALL_FOUND_INSURANCES.find((ins) => ins.id === preferredId);
    setSelectedInsurance(
      picked
        ? { payer: picked.payer, planType: picked.planType, memberId: picked.memberId, pbmPhone: picked.pbmPhone }
        : null
    );
  }, [searchState, preferredId, manualInsurances, notInsured, setSelectedInsurance]);

  function addManualInsurance(kind: InsuranceKind) {
    setInsurance({ manualInsurances: [...manualInsurances, emptyManualInsurance(kind)], notInsured: false });
  }

  function updateManualInsurance(id: string, patch: Partial<ManualInsurance>) {
    setInsurance({ manualInsurances: manualInsurances.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }

  function removeManualInsurance(id: string) {
    setInsurance({ manualInsurances: manualInsurances.filter((m) => m.id !== id) });
  }

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={3} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <IAssistLogo className="h-6 w-auto hidden sm:block" />
            <button onClick={() => navigate("/")} className="text-[#6F7276] hover:text-[#1D1D1D] focus:outline-none" aria-label="Close and return to dashboard">
              <X size={20} />
            </button>
            <h1 className="text-xl font-semibold text-[#1D1D1D]">Insurance</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/new-case/clinical")} className="text-sm font-semibold text-[#6F7276] hover:text-[#1D1D1D]">
              Skip Step
            </button>
            <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-4 py-1.5 hover:bg-[#EEF9F9]">
              Save Draft
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Demo-only search-state switcher — see file header comment */}
            <div className="flex gap-1 bg-[#F0F0F0] rounded-lg p-0.5 w-fit">
              {([
                ["searching", "Searching"],
                ["found", "Insurance Found"],
                ["none", "None Found"],
              ] as [SearchState, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInsurance({ searchState: val })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    searchState === val ? "bg-white text-[#007178] shadow-sm" : "text-[#6F7276]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {searchState === "searching" && (
              <section className="bg-white rounded-xl p-10 text-center space-y-2" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <Search size={28} className="mx-auto text-[#007178] animate-pulse" />
                <p className="text-base font-semibold text-[#1D1D1D]">Sit tight.</p>
                <p className="text-sm text-[#6F7276]">We're looking for the patient's insurance.</p>
              </section>
            )}

            {searchState === "found" && (
              <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <div className="bg-[#1A7F85] text-white rounded-lg p-4 text-sm font-semibold">
                  The patient has multiple insurance benefits. Which one would you prefer is used? The preferred
                  insurance benefits will be run first at the pharmacy.
                </div>

                <h2 className="text-sm font-semibold text-[#1D1D1D]">Found Insurance</h2>
                {FOUND_INSURANCES.map((ins) => (
                  <InsuranceCard key={ins.id} insurance={ins} selected={preferredId === ins.id} onSelect={() => setInsurance({ preferredId: ins.id })} />
                ))}

                <h2 className="text-sm font-semibold text-[#1D1D1D] pt-2">On File Insurance</h2>
                <InsuranceCard insurance={ON_FILE_INSURANCE} selected={preferredId === ON_FILE_INSURANCE.id} onSelect={() => setInsurance({ preferredId: ON_FILE_INSURANCE.id })} onEdit={() => {}} />

                <p className="text-xs text-[#999]">
                  This will be saved in the patient's profile. We only save insurance added by you, not us — we
                  still check for current benefits every time you complete a submission.
                </p>
              </section>
            )}

            {searchState === "none" && (
              <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <p className="text-sm text-[#6F7276]">
                  We couldn't find insurance on file. Add it manually below, or mark the patient as not insured.
                </p>

                {manualInsurances.map((m) => (
                  <ManualInsuranceForm
                    key={m.id}
                    insurance={m}
                    onChange={(patch) => updateManualInsurance(m.id, patch)}
                    onDelete={() => removeManualInsurance(m.id)}
                  />
                ))}

                {!notInsured && (
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button type="button" onClick={() => addManualInsurance("medical")} className="text-sm font-semibold text-[#007178] flex items-center gap-1 hover:underline">
                      <Plus size={14} /> Add medical insurance
                    </button>
                    <button type="button" onClick={() => addManualInsurance("pharmacy")} className="text-sm font-semibold text-[#007178] flex items-center gap-1 hover:underline">
                      <Plus size={14} /> Add pharmacy insurance
                    </button>
                  </div>
                )}

                <div className="border-t border-[#F0F0F0] pt-4">
                  <label className="flex items-center gap-2 text-sm text-[#1D1D1D]">
                    <input
                      type="checkbox"
                      checked={notInsured}
                      onChange={(e) => setInsurance({ notInsured: e.target.checked, manualInsurances: e.target.checked ? [] : manualInsurances })}
                      className="accent-[#007178]"
                    />
                    Patient Not Insured
                  </label>
                  {notInsured && (
                    <p className="text-xs text-[#999] mt-1 ml-6">
                      The Prior Authorization step will be skipped since the patient is not insured.
                    </p>
                  )}
                </div>
              </section>
            )}

            <div className="flex justify-between pb-8">
              <button
                onClick={() => navigate("/new-case/medication")}
                className="text-sm font-semibold text-[#6F7276] border border-[#D9D9D9] rounded-full px-6 py-3 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                onClick={() => navigate("/new-case/clinical")}
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
