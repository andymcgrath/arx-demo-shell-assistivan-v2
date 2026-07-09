/**
 * NewCaseRx — Step 6 (Rx / Electronic Prescription) of the iAssist eRx
 * case-creation wizard. The final step.
 *
 * Built from the "Step 6 (Rx).pdf" Figma spec. Self-contained form, same
 * pattern as Steps 1-5 — no ties to the shared XState workflow machine, so
 * it can't affect WF1/WF2/WF3 isolation. Fields live in caseWizardStore so
 * Back/Next preserve answers (see that store's file header).
 *
 * Medication/NDC/ICD-10 summary values are still the spec's own placeholder
 * design content (fictional "Assistivan" product line, generic ICD-10
 * example) — not real patient data. Prescriber now reflects Step 1's actual
 * selection, and Shipping Information defaults from Step 1's patient
 * address + prescriber instead of being blank free text.
 *
 * The spec's SIG/Directions box has a real (non-demo) toggle: by default it
 * shows an auto-generated, disabled/read-only instructions block built from
 * the dosing selections above; checking "Edit manually" makes it editable
 * and clears it to blank so the user's own text is all that's kept.
 * Unchecking it again discards manual edits and reverts to auto-generated
 * text — exactly as the spec's callout describes.
 */
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { X, Info, Plus } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";
import { useCaseWizardStore, prescriberNameById, expandStateAbbreviation, AUTO_SIG } from "@/store/caseWizardStore";

const FORM_OPTIONS = ["Tablet", "Capsule", "Injection", "Solution", "Gel"];
const SUBSTITUTION_OPTIONS = ["Dispense as written", "Substitutions allowed"];
const SUBMITTING_OFFICE_OPTIONS = ["Four Oaks Cardio", "Lakeside Family Medicine", "Riverbend Internal Medicine"];
// Florida is included so it can render Step 1's default patient address
// (Orlando, FL) as a valid selection, not just the original 4 states.
const STATE_OPTIONS = ["Florida", "New York", "New Jersey", "Connecticut", "Pennsylvania"];

const SIG_MAX = 1000;

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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 text-sm">
      <span className="text-[#6F7276] w-full sm:w-56 flex-shrink-0">{label}</span>
      <span className="font-semibold text-[#1D1D1D]">{value}</span>
    </div>
  );
}

export default function NewCaseRx() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const patient = useCaseWizardStore((s) => s.patient);
  const rx = useCaseWizardStore((s) => s.rx);
  const setRx = useCaseWizardStore((s) => s.setRx);

  // Prescriber reflects Step 1's actual selection; medication/NDC/ICD-10
  // summary values are still the spec's own placeholder content.
  const prescriber = `1234567890, ${prescriberNameById(patient.prescriber) || "Sarah Chen, MD"}`;
  const medicationName = "ASSISTIVAN 80 UNIT/ML INJECTION GEL 5 ML";
  const ndc = "123456789";
  const icd10 = "270.0: Nephrotic Syndrome";
  const icd10Skipped = !icd10;

  // Shipping Information defaults — from Step 1's patient address/prescriber,
  // used only when the user hasn't typed their own value yet.
  const officeContactDefault = prescriberNameById(patient.prescriber);
  const addressLine1Default = patient.addr1;
  const addressLine2Default = patient.addr2;
  const showAddressLine2Default = patient.showAddr2 && Boolean(patient.addr2);
  const cityDefault = patient.city;
  const stateDefault = expandStateAbbreviation(patient.state);
  const zipDefault = patient.zip;

  function toggleSigManualEdit() {
    // Unchecking discards manual edits and reverts to the auto-generated
    // text; checking clears the box so only the user's own text remains.
    const next = !rx.sigManualEdit;
    setRx({ sigManualEdit: next, sigText: next ? "" : AUTO_SIG });
  }

  // Completing (or skipping) the last wizard step is this demo's stand-in for
  // "case submitted" — dispatching ENROLL flips the live-wired sample patient
  // (Keanu Reeves) out of enrollmentStatus "none" so he surfaces on the
  // Dashboard's active-patient list, same event CoaRxForm's onSend dispatches
  // on WF3 (client/portals/provider/index.tsx). Resetting the wizard after
  // submit keeps the next case from inheriting this one's answers.
  const resetCaseWizard = useCaseWizardStore((s) => s.resetCaseWizard);
  function finishCase() {
    dispatch("ENROLL", { portal: "provider" });
    resetCaseWizard();
    navigate("/");
  }

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={6} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E8E8E8] px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <IAssistLogo className="h-6 w-auto hidden sm:block" />
            <button onClick={() => navigate("/")} className="text-[#6F7276] hover:text-[#1D1D1D] focus:outline-none" aria-label="Close and return to dashboard">
              <X size={20} />
            </button>
            <h1 className="text-xl font-semibold text-[#1D1D1D]">Electronic Prescription</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={finishCase} className="text-sm font-semibold text-[#6F7276] hover:text-[#1D1D1D]">
              Skip Step
            </button>
            <button className="text-sm font-semibold text-[#007178] border border-[#007178] rounded-full px-4 py-1.5 hover:bg-[#EEF9F9]">
              Save Draft
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Summary */}
            <section className="bg-white rounded-xl p-6 space-y-2.5" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <SummaryRow label="Prescriber" value={prescriber} />
              <SummaryRow label="Medication Name" value={medicationName} />
              <SummaryRow label="NDC" value={ndc} />
              {icd10Skipped ? (
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 text-sm">
                  <span className="text-[#6F7276] w-full sm:w-56 flex-shrink-0">ICD-10 Code with Diagnosis</span>
                  <span className="font-semibold text-[#999]">Skipped</span>
                </div>
              ) : (
                <SummaryRow label="ICD-10 Code with Diagnosis" value={icd10} />
              )}
            </section>

            {/* Dosing Information */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Dosing Information</h2>

              <Field label="Form">
                <select value={rx.form} onChange={(e) => setRx({ form: e.target.value })} className={`${inputCls} appearance-none`}>
                  {FORM_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Quantity">
                  <div className="flex items-center gap-1.5">
                    <input value={rx.quantity} onChange={(e) => setRx({ quantity: e.target.value })} className={inputCls} />
                    <Info size={14} className="text-[#999] flex-shrink-0" aria-hidden="true" />
                  </div>
                </Field>
                <Field label="Days Supply">
                  <input value={rx.daysSupply} onChange={(e) => setRx({ daysSupply: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Refills">
                  <input value={rx.refills} onChange={(e) => setRx({ refills: e.target.value })} className={inputCls} />
                </Field>
              </div>

              <Field label="Substitutions">
                <select value={rx.substitutions} onChange={(e) => setRx({ substitutions: e.target.value })} className={`${inputCls} appearance-none`}>
                  {SUBSTITUTION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </section>

            {/* Instructions */}
            <section className="bg-white rounded-xl p-6 space-y-3" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Instructions</h2>

              <Field label="SIG/Directions">
                <textarea
                  value={rx.sigText}
                  onChange={(e) => setRx({ sigText: e.target.value.slice(0, SIG_MAX) })}
                  disabled={!rx.sigManualEdit}
                  rows={7}
                  maxLength={SIG_MAX}
                  className={`${inputCls} resize-none ${!rx.sigManualEdit ? "bg-[#F5F5F5] text-[#6F7276]" : ""}`}
                  placeholder={rx.sigManualEdit ? "Enter directions for the pharmacy" : undefined}
                />
                <p className="text-xs text-[#999] text-right mt-1">{rx.sigText.length}/{SIG_MAX}</p>
              </Field>

              <label className="flex items-start gap-2 text-xs text-[#6F7276]">
                <input type="checkbox" checked={rx.sigManualEdit} onChange={toggleSigManualEdit} className="accent-[#007178] mt-0.5" />
                <span>
                  Edit SIG/Directions manually. By unchecking this box you'll revert back to the auto-generated
                  text based on the selections above — manual edits will be lost.
                </span>
              </label>

              <Field label="Notes for Pharmacy" optional>
                <textarea
                  value={rx.notesForPharmacy}
                  onChange={(e) => setRx({ notesForPharmacy: e.target.value })}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Any note needed to communicate with the pharmacy can go here."
                />
              </Field>
            </section>

            {/* Submitting office */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <Field label="Which office are you submitting this Rx on behalf of?">
                <select value={rx.submittingOffice} onChange={(e) => setRx({ submittingOffice: e.target.value })} className={`${inputCls} appearance-none`}>
                  {SUBMITTING_OFFICE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </section>

            {/* Shipping Information */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Shipping Information</h2>

              <Field label="Office Contact Name">
                <input value={rx.officeContactName || officeContactDefault} onChange={(e) => setRx({ officeContactName: e.target.value })} className={inputCls} />
              </Field>

              <Field label="Address Line 1">
                <input value={rx.addressLine1 || addressLine1Default} onChange={(e) => setRx({ addressLine1: e.target.value })} className={inputCls} />
              </Field>

              {!(rx.showAddressLine2 || showAddressLine2Default) ? (
                <button
                  type="button"
                  onClick={() => setRx({ showAddressLine2: true })}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#007178] hover:underline"
                >
                  <Plus size={14} /> Add apartment, suite, etc.
                </button>
              ) : (
                <Field label="Address Line 2" optional>
                  <input value={rx.addressLine2 || addressLine2Default} onChange={(e) => setRx({ addressLine2: e.target.value })} className={inputCls} />
                </Field>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="City">
                  <input value={rx.city || cityDefault} onChange={(e) => setRx({ city: e.target.value })} className={inputCls} />
                </Field>
                <Field label="State">
                  <select value={rx.state || stateDefault} onChange={(e) => setRx({ state: e.target.value })} className={`${inputCls} appearance-none`}>
                    <option value="">Select</option>
                    {STATE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="max-w-[240px]">
                <Field label="Zip Code">
                  <input value={rx.zipCode || zipDefault} onChange={(e) => setRx({ zipCode: e.target.value })} className={inputCls} />
                </Field>
              </div>
            </section>

            <div className="flex justify-between pb-8">
              <button
                onClick={() => navigate("/new-case/pa")}
                className="text-sm font-semibold text-[#6F7276] border border-[#D9D9D9] rounded-full px-6 py-3 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                onClick={finishCase}
                className="bg-[#007178] text-white px-8 py-3 rounded-full font-semibold text-base hover:bg-[#03656B] transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
