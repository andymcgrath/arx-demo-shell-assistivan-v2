/**
 * NewCasePatient — Step 1 (Patient) of the iAssist eRx case-creation wizard.
 *
 * Built from the "Step 1 (Patient).pdf" Figma spec. This is a self-contained
 * form — it does not touch the shared XState workflow machine or
 * WorkflowEngine routing, so it can't affect WF1/WF2/WF3 or the CoA/iAssist
 * status machines. Case-creation is a data-entry UI concern, separate from
 * the pharmacy-status parallel machine iAssist.ts models.
 *
 * This models a known/returning patient: demographic profile (name, DOB,
 * sex, height/weight, SSN last 4, language, allergies), contact info
 * (address, phone, email, additional contact), and prescriber are all
 * pre-populated as data a practice would already have on file. Consent and
 * income verification are left blank — those are live actions/attestations
 * captured fresh for each new case, not stored patient-profile data.
 *
 * Fields live in caseWizardStore (Zustand + sessionStorage), same pattern as
 * patientStore.ts, so the wizard's Back button doesn't throw away answers
 * (see that store's file header for the fuller rationale). Name/DOB/phone/
 * email/address default from PATIENT_SEED (Keanu Dixon) so this step shows
 * the same patient the user just searched for / selected on the Dashboard.
 */
import { useRef, useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { Info, X, Plus, Trash2, Upload, CalendarCheck } from "lucide-react";
import StepRail from "../components/StepRail";
import { IAssistLogo } from "../components/IAssistSidebar";
import { useCaseWizardStore, PRESCRIBER_OPTIONS, type PhoneEntry, type SignSource, type ConsentMethod } from "@/store/caseWizardStore";
import { usePersonaState } from "@/engine/WorkflowProvider";
import { KEANU_SITE_OF_CARE_FACTS } from "@/engine/WorkflowEngine";

type SignatureMode = "type" | "draw";

function emptyPhone(): PhoneEntry {
  return { id: crypto.randomUUID(), number: "", type: "Cell", bestTime: "", leaveMessage: "Yes" };
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

function SignaturePad({ onChange }: { onChange: (hasSignature: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [mode, setMode] = useState<SignatureMode>("draw");
  const [typedName, setTypedName] = useState("");

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function start(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#1D1D1D";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    drawingRef.current = true;
  }

  function move(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    onChange(true);
  }

  function end() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setTypedName("");
    onChange(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1 bg-[#F0F0F0] rounded-lg p-0.5 w-fit">
          {(["type", "draw"] as SignatureMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                mode === m ? "bg-white text-[#007178] shadow-sm" : "text-[#6F7276]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button type="button" onClick={clear} className="text-xs font-semibold text-[#007178] hover:underline">
          Clear
        </button>
      </div>
      {mode === "draw" ? (
        <div className="rounded-lg overflow-hidden border border-[#D9D9D9] bg-white">
          <canvas
            ref={canvasRef}
            width={560}
            height={140}
            className="w-full touch-none"
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
          />
        </div>
      ) : (
        <input
          value={typedName}
          onChange={(e) => {
            setTypedName(e.target.value);
            onChange(e.target.value.trim().length > 0);
          }}
          placeholder="Type full name as signature"
          className={`${inputCls} italic`}
          style={{ fontFamily: "cursive" }}
        />
      )}
    </div>
  );
}

export default function NewCasePatient() {
  const navigate = useNavigate();
  const patient = useCaseWizardStore((s) => s.patient);
  const setPatient = useCaseWizardStore((s) => s.setPatient);

  // This wizard is otherwise a self-contained, live-actor-agnostic form (see
  // file header) — but iAssist_PAP (WF5) is the one flow where reopening
  // Keanu's Patient Information after his appeal is approved and an
  // infusion date is picked (InfusionDate.tsx, PATIENT_SELECTS_INFUSION_DATE
  // — see workflows/iAssistPap.ts) should surface that appointment right
  // here, closing the "record added to iAssist" narrative beat. "provider"
  // persona id used only for tagging, same as Dashboard.tsx's own read of
  // this same live actor — no events are dispatched from this screen.
  const { workflowData } = usePersonaState("provider");
  const showInfusionCard = workflowData.flowType === "iAssist_PAP" && workflowData.infusionDate !== null;
  const infusionDateLabel = workflowData.infusionDate
    ? new Date(workflowData.infusionDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  function updatePhone(id: string, patch: Partial<PhoneEntry>) {
    setPatient({ phones: patient.phones.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }

  function addPhone() {
    setPatient({ phones: [...patient.phones, emptyPhone()] });
  }

  function removePhone(id: string) {
    setPatient({ phones: patient.phones.length > 1 ? patient.phones.filter((p) => p.id !== id) : patient.phones });
  }

  return (
    <div className="iassist-portal min-h-screen bg-[#F8F8F8] flex font-['Open_Sans']">
      <StepRail current={1} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
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
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Infusion Appointment — iAssist_PAP (WF5) only, once the
                patient has picked an infusion date post-appeal-approval. */}
            {showInfusionCard && (
              <section className="bg-white rounded-xl p-6 space-y-3" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
                <div className="flex items-center gap-2">
                  <CalendarCheck size={18} className="text-[#007178]" />
                  <h2 className="text-base font-semibold text-[#1D1D1D]">Infusion Appointment</h2>
                  <span className="text-xs font-semibold text-[#007178] bg-[#EEF9F9] rounded-full px-2 py-0.5">Scheduled</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-[#6F7276] uppercase tracking-wide mb-1">Appointment Date</div>
                    <div className="text-sm text-[#1D1D1D]">{infusionDateLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#6F7276] uppercase tracking-wide mb-1">Site of Care</div>
                    <div className="text-sm text-[#1D1D1D]">{KEANU_SITE_OF_CARE_FACTS.facilityName}</div>
                    <div className="text-sm text-[#6F7276]">{KEANU_SITE_OF_CARE_FACTS.address}, {KEANU_SITE_OF_CARE_FACTS.city}, {KEANU_SITE_OF_CARE_FACTS.state} {KEANU_SITE_OF_CARE_FACTS.zip}</div>
                  </div>
                </div>
              </section>
            )}

            {/* Demographics */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1D1D1D]">Demographics</h2>
                <span className="text-xs font-semibold text-[#007178] bg-[#EEF9F9] rounded-full px-2 py-0.5">On file</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name">
                  <input value={patient.firstName} onChange={(e) => setPatient({ firstName: e.target.value })} placeholder="First name" className={inputCls} />
                </Field>
                <Field label="Last Name">
                  <input value={patient.lastName} onChange={(e) => setPatient({ lastName: e.target.value })} placeholder="Last name" className={inputCls} />
                </Field>
                <Field label="Date of Birth">
                  <input type="date" value={patient.dob} onChange={(e) => setPatient({ dob: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Sex">
                  <div className="flex items-center gap-1.5">
                    <select value={patient.sex} onChange={(e) => setPatient({ sex: e.target.value })} className={`${inputCls} appearance-none`}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <span title="We recognize that patients may not identify as male or female, but many insurance companies still require that one of the two sex identifications is selected.">
                      <Info size={16} className="text-[#999] flex-shrink-0" />
                    </span>
                  </div>
                </Field>
                <Field label="Height">
                  <div className="flex gap-2">
                    <input value={patient.height} onChange={(e) => setPatient({ height: e.target.value })} placeholder={patient.heightUnit === "in" ? "5' 7\"" : "cm"} className={inputCls} />
                    <select value={patient.heightUnit} onChange={(e) => setPatient({ heightUnit: e.target.value as "in" | "cm" })} className="rounded-lg border border-[#D9D9D9] px-2 text-sm">
                      <option value="in">Inches (in)</option>
                      <option value="cm">Centimeters (cm)</option>
                    </select>
                  </div>
                </Field>
                <Field label="Weight">
                  <div className="flex gap-2">
                    <input value={patient.weight} onChange={(e) => setPatient({ weight: e.target.value })} placeholder="0" className={inputCls} />
                    <select value={patient.weightUnit} onChange={(e) => setPatient({ weightUnit: e.target.value as "lbs" | "kg" })} className="rounded-lg border border-[#D9D9D9] px-2 text-sm">
                      <option value="lbs">Pounds (lbs)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>
                </Field>
                <Field label="Last 4 of SSN">
                  <input
                    value={patient.ssnLast4}
                    maxLength={4}
                    onChange={(e) => setPatient({ ssnLast4: e.target.value.replace(/\D/g, "") })}
                    placeholder="1234"
                    className={inputCls}
                  />
                </Field>
                <Field label="Preferred Language">
                  <select value={patient.language} onChange={(e) => setPatient({ language: e.target.value })} className={`${inputCls} appearance-none`}>
                    <option value="">Select</option>
                    <option value="english">English</option>
                    <option value="spanish">Spanish</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                {patient.language === "other" && (
                  <Field label="Other Language">
                    <input value={patient.otherLanguage} onChange={(e) => setPatient({ otherLanguage: e.target.value })} placeholder="Enter language" className={inputCls} />
                  </Field>
                )}
                <Field label="Does patient have allergies?">
                  <select value={patient.hasAllergies} onChange={(e) => setPatient({ hasAllergies: e.target.value })} className={`${inputCls} appearance-none`}>
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
                {patient.hasAllergies === "yes" && (
                  <Field label="Known Allergies">
                    <input
                      value={patient.allergies}
                      maxLength={100}
                      onChange={(e) => setPatient({ allergies: e.target.value })}
                      placeholder='Separate with a ","'
                      className={inputCls}
                    />
                    <span className="text-xs text-[#999] mt-1 block text-right">{patient.allergies.length}/100</span>
                  </Field>
                )}
              </div>
            </section>

            {/* Address */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1D1D1D]">Address</h2>
                <span className="text-xs font-semibold text-[#007178] bg-[#EEF9F9] rounded-full px-2 py-0.5">On file</span>
              </div>
              <Field label="Address Line 1">
                <input value={patient.addr1} onChange={(e) => setPatient({ addr1: e.target.value })} placeholder="Street address" className={inputCls} />
              </Field>
              {!patient.showAddr2 ? (
                <button type="button" onClick={() => setPatient({ showAddr2: true })} className="text-sm font-semibold text-[#007178] flex items-center gap-1 hover:underline">
                  <Plus size={14} /> Add apartment, suite, etc.
                </button>
              ) : (
                <Field label="Address Line 2" optional>
                  <input value={patient.addr2} onChange={(e) => setPatient({ addr2: e.target.value })} placeholder="Apartment, suite, etc." className={inputCls} />
                </Field>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="City">
                  <input value={patient.city} onChange={(e) => setPatient({ city: e.target.value })} placeholder="City" className={inputCls} />
                </Field>
                <Field label="State">
                  <input value={patient.state} onChange={(e) => setPatient({ state: e.target.value })} placeholder="State" className={inputCls} />
                </Field>
                <Field label="Zip Code">
                  <input value={patient.zip} onChange={(e) => setPatient({ zip: e.target.value })} placeholder="Zip code" className={inputCls} />
                </Field>
              </div>
            </section>

            {/* Contact Method */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#1D1D1D]">Contact Method</h2>
                <span className="text-xs font-semibold text-[#007178] bg-[#EEF9F9] rounded-full px-2 py-0.5">On file</span>
              </div>
              <Field label="Email Address" optional>
                <input type="email" value={patient.email} onChange={(e) => setPatient({ email: e.target.value })} placeholder="name@example.com" className={inputCls} />
              </Field>

              {patient.phones.map((phone) => (
                <div key={phone.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end border-t border-[#F0F0F0] pt-4 first:border-t-0 first:pt-0">
                  <Field label="Phone Number">
                    <input
                      value={phone.number}
                      onChange={(e) => updatePhone(phone.id, { number: e.target.value })}
                      placeholder="(555) 555-5555"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={phone.type}
                      onChange={(e) => updatePhone(phone.id, { type: e.target.value as PhoneEntry["type"] })}
                      className={`${inputCls} appearance-none`}
                    >
                      <option value="Cell">Cell</option>
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                    </select>
                  </Field>
                  <Field label="Best Time to Contact?">
                    <select
                      value={phone.bestTime}
                      onChange={(e) => updatePhone(phone.id, { bestTime: e.target.value })}
                      className={`${inputCls} appearance-none`}
                    >
                      <option value="">Select</option>
                      <option>Morning (8:00 am - 12:00 pm)</option>
                      <option>Afternoon (12:00 pm - 4:00 pm)</option>
                      <option>Evening (4:00 pm - 8:00 pm)</option>
                    </select>
                  </Field>
                  <div className="flex items-end gap-2">
                    <Field label="Ok to Leave Message?">
                      <select
                        value={phone.leaveMessage}
                        onChange={(e) => updatePhone(phone.id, { leaveMessage: e.target.value as "Yes" | "No" })}
                        className={`${inputCls} appearance-none`}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </Field>
                    {patient.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePhone(phone.id)}
                        aria-label="Delete phone"
                        className="text-[#999] hover:text-[#D02B20] mb-2.5"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addPhone} className="text-sm font-semibold text-[#007178] flex items-center gap-1 hover:underline">
                <Plus size={14} /> Add phone number
              </button>

              {!patient.showAdditionalContact ? (
                <button
                  type="button"
                  onClick={() => setPatient({ showAdditionalContact: true })}
                  className="text-sm font-semibold text-[#007178] flex items-center gap-1 hover:underline border-t border-[#F0F0F0] pt-4"
                >
                  <Plus size={14} /> Add additional contact
                </button>
              ) : (
                <div className="border-t border-[#F0F0F0] pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#1D1D1D]">Additional Contact</h3>
                      <span className="text-xs font-semibold text-[#007178] bg-[#EEF9F9] rounded-full px-2 py-0.5">On file</span>
                    </div>
                    <button type="button" onClick={() => setPatient({ showAdditionalContact: false })} className="text-xs font-semibold text-[#999] hover:text-[#D02B20]">
                      Delete contact
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Name">
                      <input value={patient.altFirstName} onChange={(e) => setPatient({ altFirstName: e.target.value })} placeholder="First name" className={inputCls} />
                    </Field>
                    <Field label="Last Name">
                      <input value={patient.altLastName} onChange={(e) => setPatient({ altLastName: e.target.value })} placeholder="Last name" className={inputCls} />
                    </Field>
                    <Field label="Relationship to Patient">
                      <select value={patient.altRelationship} onChange={(e) => setPatient({ altRelationship: e.target.value })} className={`${inputCls} appearance-none`}>
                        <option value="">Select</option>
                        <option>Spouse</option>
                        <option>Sibling</option>
                        <option>Parent</option>
                        <option>Caregiver</option>
                        <option>Friend</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    {patient.altRelationship === "Other" && (
                      <Field label="Other">
                        <input value={patient.altRelationshipOther} onChange={(e) => setPatient({ altRelationshipOther: e.target.value })} placeholder="Relationship" className={inputCls} />
                      </Field>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Prescriber */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#007178] bg-[#EEF9F9] rounded-full px-2 py-0.5">On file</span>
              </div>
              <Field label="Who is the patient's prescriber?">
                <select value={patient.prescriber} onChange={(e) => setPatient({ prescriber: e.target.value })} className={`${inputCls} appearance-none`}>
                  <option value="">Select prescriber</option>
                  {PRESCRIBER_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.npi}, {p.name}</option>
                  ))}
                </select>
              </Field>
            </section>

            {/* Consent */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Consent</h2>
              <p className="text-sm font-semibold text-[#1D1D1D]">
                Will the patient or guardian/legal representative be signing the consent form?
              </p>
              <div className="flex flex-col gap-2">
                {([
                  ["patient", "Patient"],
                  ["guardian", "Guardian/Legal Representative"],
                  ["skip", "Skip Signature"],
                ] as [SignSource, string][]).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm text-[#1D1D1D]">
                    <input type="radio" name="signSource" checked={patient.signSource === val} onChange={() => setPatient({ signSource: val })} className="accent-[#007178]" />
                    {label}
                  </label>
                ))}
              </div>

              {patient.signSource === "guardian" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <input value={patient.guardianFirst} onChange={(e) => setPatient({ guardianFirst: e.target.value })} placeholder="Guardian/legal rep first name" className={inputCls} />
                  </Field>
                  <Field label="Last Name">
                    <input value={patient.guardianLast} onChange={(e) => setPatient({ guardianLast: e.target.value })} placeholder="Guardian/legal rep last name" className={inputCls} />
                  </Field>
                </div>
              )}

              {patient.signSource !== "skip" && (
                <>
                  <p className="text-sm font-semibold text-[#1D1D1D]">How do they want to complete the iAssist consent?</p>
                  <div className="flex flex-col gap-2">
                    {([
                      ["now", "Sign Right Now"],
                      ["email", "Via Email"],
                      ["text", "Via Text"],
                    ] as [ConsentMethod, string][]).map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2 text-sm text-[#1D1D1D]">
                        <input type="radio" name="consentMethod" checked={patient.consentMethod === val} onChange={() => setPatient({ consentMethod: val })} className="accent-[#007178]" />
                        {label}
                      </label>
                    ))}
                  </div>

                  {patient.consentMethod === "text" && (
                    <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg p-3 text-xs text-[#6F7276]">
                      <strong>Disclaimer</strong> — By selecting "via text", the patient agrees to receive text messages to
                      obtain program consent. Message frequency may vary. Message & data rates may apply. The patient can
                      reply STOP to opt out at any time.
                    </div>
                  )}

                  <div className="bg-[#F8F8F8] border border-[#E8E8E8] rounded-lg p-3 text-xs text-[#6F7276] leading-relaxed">
                    I authorize [Manufacturer/pharmacy], my healthcare providers, pharmacies and health plans to obtain,
                    review, use and disclose my Protected Health Information (PHI) to the drug manufacturers, their
                    affiliates, contractors, and agents, including their third-party patient support program service
                    providers and suppliers who provide my medications dispensed by [Manufacturer/pharmacy].
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[#1D1D1D]">
                    <input type="checkbox" checked={patient.phiAgreed} onChange={(e) => setPatient({ phiAgreed: e.target.checked })} className="accent-[#007178]" />
                    I agree
                  </label>

                  {patient.consentMethod === "now" && (
                    <div>
                      <p className="text-sm font-semibold text-[#1D1D1D] mb-2">Signature</p>
                      <SignaturePad onChange={(hasSignature) => setPatient({ hasSignature })} />
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Income Verification */}
            <section className="bg-white rounded-xl p-6 space-y-4" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
              <h2 className="text-base font-semibold text-[#1D1D1D]">Income Verification</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Household Size">
                  <input value={patient.householdSize} onChange={(e) => setPatient({ householdSize: e.target.value.replace(/\D/g, "") })} placeholder="Including Patient" className={inputCls} />
                </Field>
                <Field label="Annual Household Income">
                  <input value={patient.householdIncome} onChange={(e) => setPatient({ householdIncome: e.target.value.replace(/[^\d]/g, "") })} placeholder="Based on household size" className={inputCls} />
                </Field>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1D1D1D] mb-2">Please upload any relevant documents.</p>
                <div className="border-2 border-dashed border-[#D9D9D9] rounded-lg p-6 text-center">
                  <Upload size={22} className="mx-auto text-[#999] mb-2" />
                  <p className="text-sm text-[#6F7276]">
                    Drag and drop file here, or{" "}
                    <span className="text-[#007178] font-semibold cursor-pointer hover:underline">upload it here</span>
                  </p>
                  <p className="text-xs text-[#999] mt-1">Files must be 19MB or less and in JPG, PNG, or PDF format</p>
                </div>
              </div>
            </section>

            <div className="flex justify-between pb-8">
              <button
                onClick={() => navigate("/")}
                className="text-sm font-semibold text-[#6F7276] border border-[#D9D9D9] rounded-full px-6 py-3 hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                onClick={() => navigate("/new-case/medication")}
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
