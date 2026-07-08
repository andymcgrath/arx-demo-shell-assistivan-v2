/**
 * NewCaseRx — Step 6 (Rx / Electronic Prescription) of the iAssist eRx
 * case-creation wizard. The final step.
 *
 * Built from the "Step 6 (Rx).pdf" Figma spec. Self-contained, local-state
 * form, same pattern as Steps 1-5 — no ties to the shared XState workflow
 * machine, so it can't affect WF1/WF2/WF3 isolation.
 *
 * All prescriber/medication/diagnosis summary values shown here are the
 * spec's own placeholder design content (fictional prescriber, fictional
 * "Assistivan" product line already used elsewhere in this demo, generic
 * ICD-10 example) — not real patient data.
 *
 * The spec's SIG/Directions box has a real (non-demo) toggle: by default it
 * shows an auto-generated, disabled/read-only instructions block built from
 * the dosing selections above; checking "Edit manually" makes it editable
 * and clears it to blank so the user's own text is all that's kept.
 * Unchecking it again discards manual edits and reverts to auto-generated
 * text — exactly as the spec's callout describes.
 */
import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { X, Info, Plus } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";

const FORM_OPTIONS = ["Tablet", "Capsule", "Injection", "Solution", "Gel"];
const SUBSTITUTION_OPTIONS = ["Dispense as written", "Substitutions allowed"];
const SUBMITTING_OFFICE_OPTIONS = ["Four Oaks Cardio", "Lakeside Family Medicine", "Riverbend Internal Medicine"];
const STATE_OPTIONS = ["New York", "New Jersey", "Connecticut", "Pennsylvania"];

const AUTO_SIG =
  "Infuse subcutaneously. Pump rate: titrate initial and maintenance IV per product label. " +
  "Vascular access: central. IV method: pump. Infuse 10 gms IV every 2 weeks; split total dose over 3 days " +
  "(where clinically appropriate, round to nearest vial size). Infuse total dose of immune globulin " +
  "subcutaneously in 1 to multiple sites. Premeds (30 mins before IV): diphenhydramine 10mg PO for mild " +
  "reactions, increase to 20mg for moderate/severe; acetaminophen 10-15mg/kg PO. PRN meds: epinephrine " +
  "auto-inject 0.3mg IM for anaphylaxis.";

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

  // Read-only summary values carried in from earlier steps — sample/spec
  // placeholder content, per the file-header note above.
  const prescriber = "1234567890, James Kodaak";
  const medicationName = "ASSISTIVAN 80 UNIT/ML INJECTION GEL 5 ML";
  const ndc = "123456789";
  const icd10 = "270.0: Nephrotic Syndrome";
  const icd10Skipped = !icd10;

  // Dosing Information
  const [form, setForm] = useState(FORM_OPTIONS[0]);
  const [quantity, setQuantity] = useState("30");
  const [daysSupply, setDaysSupply] = useState("30");
  const [refills, setRefills] = useState("1");
  const [substitutions, setSubstitutions] = useState(SUBSTITUTION_OPTIONS[0]);

  // SIG/Directions
  const [sigManualEdit, setSigManualEdit] = useState(false);
  const [sigText, setSigText] = useState(AUTO_SIG);

  function toggleSigManualEdit() {
    setSigManualEdit((prev) => {
      const next = !prev;
      // Unchecking discards manual edits and reverts to the auto-generated
      // text; checking clears the box so only the user's own text remains.
      setSigText(next ? "" : AUTO_SIG);
      return next;
    });
  }

  const [notesForPharmacy, setNotesForPharmacy] = useState("");
  const [submittingOffice, setSubmittingOffice] = useState(SUBMITTING_OFFICE_OPTIONS[0]);

  // Shipping Information
  const [officeContactName, setOfficeContactName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [showAddressLine2, setShowAddressLine2] = useState(false);
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Completing (or skipping) the last wizard step is this demo's stand-in for
  // "case submitted" — dispatching ENROLL flips the live-wired sample patient
  // (Keanu Reeves) out of enrollmentStatus "none" so he surfaces on the
  // Dashboard's active-patient list, same event CoaRxForm's onSend dispatches
  // on WF3 (client/portals/provider/index.tsx).
  function finishCase() {
    dispatch("ENROLL", { portal: "provider" });
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
                <select value={form} onChange={(e) => setForm(e.target.value)} className={`${inputCls} appearance-none`}>
                  {FORM_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Quantity">
                  <div className="flex items-center gap-1.5">
                    <input value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
                    <Info size={14} className="text-[#999] flex-shrink-0" aria-hidden="true" />
                  </div>
                </Field>
                <Field label="Days Supply">
                  <input value={daysSupply} onChange={(e) => setDaysSupply(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Refills">
                  <input value={refills} onChange={(e) => setRefills(e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="Substitutions">
                <select value={substitutions} onChange={(e) => setSubstitutions(e.target.value)} className={`${inputCls} appearance-none`}>
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
                  value={sigText}
                  onChange={(e) => setSigText(e.target.value.slice(0, SIG_MAX))}
                  disabled={!sigManualEdit}
                  rows={7}
                  maxLength={SIG_MAX}
                  className={`${inputCls} resize-none ${!sigManualEdit ? "bg-[#F5F5F5] text-[#6F7276]" : ""}`}
                  placeholder={sigManualEdit ? "Enter directions for the pharmacy" : undefined}
                />
                <p className="text-xs text-[#999] text-right mt-1">{sigText.length}/{SIG_MAX}</p>
              </Field>

              <label className="flex items-start gap-2 text-xs text-[#6F7276]">
                <input type="checkbox" checked={sigManualEdit} onChange={toggleSigManualEdit} className="accent-[#007178] mt-0.5" />
                <span>
                  Edit SIG/Directions manually. By unchecking this box you'll revert back to the auto-generated
                  text based on the selections above — manual edits will be lost.
                </span>
              </label>

              <Field label="Notes for Pharmacy" optional>
                <textarea
                  value={notesForPharmacy}
                  onChange={(e) => setNotesForPharmacy(e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Any note needed to communicate with the pharmacy can go here."
                />
              </Field>
            </section>

            {/* Submitting office */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <Field label="Which office are you submitting this Rx on behalf of?">
                <select value={submittingOffice} onChange={(e) => setSubmittingOffice(e.target.value)} className={`${inputCls} appearance-none`}>
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
                <input value={officeContactName} onChange={(e) => setOfficeContactName(e.target.value)} className={inputCls} />
              </Field>

              <Field label="Address Line 1">
                <input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} />
              </Field>

              {!showAddressLine2 ? (
                <button
                  type="button"
                  onClick={() => setShowAddressLine2(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#007178] hover:underline"
                >
                  <Plus size={14} /> Add apartment, suite, etc.
                </button>
              ) : (
                <Field label="Address Line 2" optional>
                  <input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} />
                </Field>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="City">
                  <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
                </Field>
                <Field label="State">
                  <select value={state} onChange={(e) => setState(e.target.value)} className={`${inputCls} appearance-none`}>
                    <option value="">Select</option>
                    {STATE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="max-w-[240px]">
                <Field label="Zip Code">
                  <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className={inputCls} />
                </Field>
              </div>
            </section>

            <div className="flex justify-end pb-8">
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
