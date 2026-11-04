/**
 * The HCP's enrollment form, in three steps like the live program form: the patient (authorization, details, contact,
 * consent), insurance and the Rx (pharmacy, diagnosis), then the prescriber (NPI search and certification).
 * Fields start with representative values. The prescriber's NPI and the certification are left for the presenter. Nothing is sent anywhere real.
 * The submit is the one call into the platform: HCP_ENROLL_SUBMIT, which texts the patient.
 */
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { usePatientCase } from "@/hooks/usePatientCase";
import { PROGRAM } from "@/portals/patient/config/branding";
import ProviderSearch, { isNpi, type Provider } from "../ProviderSearch";
import { hcpSite } from "./content";
import { Check, Field, Radio, Section, TextInput, ghostBtn, inputCls, primaryBtn } from "./fields";

const STEPS = ["Patient", "Insurance and Rx", "Prescriber"] as const;

export default function EnrollmentForm({ onSubmit, onCancel }: { onSubmit: (npi: string) => void; onCancel: () => void }) {
  const site = hcpSite();
  const { data: patient } = usePatientCase();
  const [step, setStep] = useState(0);

  // Step 1. The HCP completes it with the patient in the room.
  const [authorized, setAuthorized] = useState(true);
  const [name, setName] = useState(patient.patientName);
  const [dob, setDob] = useState(patient.patientDob);
  const [sex, setSex] = useState("Male");
  const [address, setAddress] = useState(patient.shippingAddress);
  const [phone, setPhone] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email);
  const [enrollConsent, setEnrollConsent] = useState(true);
  const [textConsent, setTextConsent] = useState(true);

  // Step 2
  const [insurer, setInsurer] = useState(patient.payer);
  const [memberId, setMemberId] = useState("JAS-4471-0925");
  const [strength, setStrength] = useState(site.strengths[site.strengths.length - 1]);
  const [pharmacy, setPharmacy] = useState(site.pharmacies[0].name);
  const [dx, setDx] = useState(site.diagnoses[0].code);

  // Step 3
  const [provider, setProvider] = useState<Provider | null>(null);
  const [npi, setNpi] = useState("");
  const [certified, setCertified] = useState(false);

  const ready = [
    authorized && enrollConsent && !!name && !!dob && !!sex && !!address && !!phone,
    !!insurer && !!memberId && !!strength && !!pharmacy && !!dx,
    isNpi(npi) && certified,
  ];

  return (
    <div className="px-12 py-8">
      <button type="button" onClick={step === 0 ? onCancel : () => setStep(step - 1)} className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase text-arx-primary">
        <ArrowLeft className="h-4 w-4" /> Previous step
      </button>
      <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
        <aside>
          <p className="mb-1 text-xs font-bold text-arx-neutral-800">Step {step + 1} / {STEPS.length}</p>
          <div className="mb-6 flex gap-1.5">
            {STEPS.map((s, i) => <span key={s} className={`h-2 w-2 rounded-full ${i === step ? "bg-arx-primary" : "bg-arx-borders"}`} />)}
          </div>
          <h1 className="mb-3 text-3xl font-black text-arx-primary">{STEPS[step]}</h1>
          <p className="text-sm text-arx-body-copy">
            {step === 0 && `Complete the patient's details to enroll them in ${site.programName}. The patient receives a text to review and consent.`}
            {step === 1 && `Add the patient's insurance and write the ${PROGRAM.name} prescription.`}
            {step === 2 && "Find the prescriber by NPI or name, then certify the enrollment."}
          </p>
        </aside>

        <div className="rounded-lg bg-white p-8 shadow-md">
          {step === 0 && (
            <>
              <Section n={1} title="Patient authorization">
                <Check checked={authorized} onChange={setAuthorized} label="The patient has authorized the use and disclosure of their health information for the program, and I hold that authorization on file." />
              </Section>
              <Section n={2} title="Patient information">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Patient full name" value={name} onChange={setName} required />
                  <TextInput label="Date of birth" value={dob} onChange={setDob} required />
                  <Field label="Sex" required>
                    <select className={inputCls} value={sex} onChange={(e) => setSex(e.target.value)}>
                      <option value="">Select one</option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </Field>
                  <TextInput label="Mobile phone" value={phone} onChange={setPhone} required />
                  <TextInput label="Shipping address" value={address} onChange={setAddress} required className="md:col-span-2" />
                  <TextInput label="Email" value={email} onChange={setEmail} className="md:col-span-2" />
                </div>
              </Section>
              <Section n={3} title="Consent">
                <div className="space-y-3">
                  <Check checked={enrollConsent} onChange={setEnrollConsent} label={`Yes, the patient agrees to take part in ${site.programName} and to the processing of their personal and health data for the program.`} />
                  <Check checked={textConsent} onChange={setTextConsent} label="(Optional) The patient agrees to receive automated text messages about the program." />
                </div>
                <p className="mt-3 text-xs text-arx-body-copy">The patient also reviews and confirms consent on their own phone after you submit.</p>
              </Section>
            </>
          )}

          {step === 1 && (
            <>
              <Section n={4} title="Insurance information">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Prescription drug insurance" value={insurer} onChange={setInsurer} required />
                  <TextInput label="Policy / member ID" value={memberId} onChange={setMemberId} required />
                </div>
              </Section>
              <Section n={5} title={`Prescription for ${PROGRAM.name}`}>
                <p className="mb-2 text-xs text-arx-body-copy">{PROGRAM.description || "Take one tablet by mouth twice daily."} Quantity: 30 day supply.</p>
                <div className="mb-4 flex gap-6">
                  {site.strengths.map((s) => <Radio key={s} name="strength" label={s} checked={strength === s} onChange={() => setStrength(s)} />)}
                </div>
                <p className="mb-2 text-xs font-semibold text-arx-neutral-800">Preferred specialty pharmacy<span className="text-arx-errors">*</span></p>
                <div className="space-y-2">
                  {site.pharmacies.map((p) => (
                    <Radio key={p.name} name="pharmacy" checked={pharmacy === p.name} onChange={() => setPharmacy(p.name)}
                      label={<><span className="font-semibold">{p.name}</span> <span className="text-xs text-arx-body-copy">Fax {p.fax} | Phone {p.phone}</span></>} />
                  ))}
                </div>
              </Section>
              <Section n={6} title="Clinical information">
                <p className="mb-2 text-xs font-semibold text-arx-neutral-800">Diagnosis (ICD-10 code)<span className="text-arx-errors">*</span></p>
                <div className="space-y-2">
                  {site.diagnoses.map((d) => (
                    <Radio key={d.code} name="dx" checked={dx === d.code} onChange={() => setDx(d.code)} label={<><span className="font-semibold">{d.code}</span> {d.label}</>} />
                  ))}
                </div>
              </Section>
            </>
          )}

          {step === 2 && (
            <>
              <Section n={7} title="Prescriber information">
                <ProviderSearch value={provider} onChange={setProvider} npi={npi} onNpi={setNpi} />
              </Section>
              <Section n={8} title="Prescriber certification">
                <Check checked={certified} onChange={setCertified} label={`I certify that the patient has authorized me to share their health information with the program, that the program terms are met, and that my decision to prescribe ${PROGRAM.name} was based on my professional judgment.`} />
              </Section>
            </>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className={ghostBtn} onClick={onCancel}>Cancel</button>
            {step < STEPS.length - 1 ? (
              <button type="button" className={primaryBtn} disabled={!ready[step]} onClick={() => setStep(step + 1)}>Continue</button>
            ) : (
              <button type="button" className={primaryBtn} disabled={!ready[step]} onClick={() => onSubmit(npi)}>Submit enrollment</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
