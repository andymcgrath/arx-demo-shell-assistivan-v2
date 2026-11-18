/**
 * The client's PES site, patient start (mock): the patient enrolls themself on a desktop site in the PrES site's chrome. The steps
 * are the cost-and-coverage page's: a welcome, the HIPAA authorization, patient information, and prescription information with the
 * prescriber. The last step's submit (PES_SUBMIT) enrolls the case and starts benefits checking, as the HCP's submit does on the PrES
 * site. The patient's part ends on the thank-you page. The agent works the case in the CRM from there.
 *
 * Which step shows is local, except the thank-you: a reload or Reset All lands on the right page from the machine.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BRAND } from "@/brand";
import { useScrollTopOnChange } from "@/hooks/useScrollTopOnChange";
import { useWorkflowDispatch, usePersonaState } from "@/engine/WorkflowProvider";
import { usePatientCase } from "@/hooks/usePatientCase";
import { usePatientStore } from "@/store/patientStore";
import { START_OVER_EVENT } from "../events";
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";
import { SiteFooter } from "../hcp/SiteChrome";
import { Check, Radio, Section, TextInput, Field, inputCls, ghostBtn, primaryBtn } from "../hcp/fields";
import ProviderSearch, { isNpi, type Provider } from "../ProviderSearch";

const DOSES = BRAND.program.dosages?.length ? BRAND.program.dosages : ["0.8 mg", "2.5 mg", "5.5 mg", "17.2 mg"];
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const OFFER = BRAND.program.copayOffer;
const STEPS = ["welcome", "hipaa", "patient", "rx", "pricing", "confirm", "submitted"] as const;
type Step = (typeof STEPS)[number];
const TOP_LINKS = ["For Healthcare Professionals", "Prescribing Information", "Important Safety Information"];

function Header() {
  return (
    <header>
      <div className="bg-arx-black px-8 py-2 text-xs text-white">
        <ul className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1">{TOP_LINKS.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <div className="flex items-center gap-4 border-b border-arx-borders bg-white px-8 py-4">
        <ProgramLogo variant="colors" size="small" />
        <span className="h-8 w-px bg-arx-borders" />
        <ManufacturerLogo variant="colors" size="footer" />
      </div>
    </header>
  );
}

const Nav = ({ onBack, onNext, nextLabel, nextDisabled }: { onBack?: () => void; onNext: () => void; nextLabel: string; nextDisabled?: boolean }) => (
  <div className="mt-8 flex items-center gap-3">
    {onBack && <button type="button" className={ghostBtn} onClick={onBack}>Back</button>}
    <button type="button" className={primaryBtn} disabled={nextDisabled} onClick={onNext}>{nextLabel} <ArrowRight className="h-4 w-4" /></button>
  </div>
);

export default function PesSite() {
  const dispatch = useWorkflowDispatch();
  const { workflowData: w } = usePersonaState("patient");
  const { data: patient } = usePatientCase();
  const caseGender = usePatientStore((s) => s.gender);
  const submitted = w.enrollmentStatus !== "none";
  const [step, setStep] = useState<Step>(submitted ? "submitted" : "welcome");
  const [agreed, setAgreed] = useState(false);
  const [first = "", ...rest] = patient.patientName.split(" ");
  const [details, setDetails] = useState({ first, last: rest.join(" "), dob: patient.patientDob, gender: GENDERS.includes(caseGender) ? caseGender : "", zip: patient.deliveryAddress.match(/\b(\d{5})(?:-\d{4})?\s*$/)?.[1] ?? "", email: patient.email, phone: patient.phone });
  const [prescribed, setPrescribed] = useState("");
  const [dose, setDose] = useState("");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [npi, setNpi] = useState("");
  const [optional, setOptional] = useState({ marketing: false, medical: false, market: false });
  // Undo of the submit puts the patient back on the last step with their answers kept.
  useEffect(() => {
    if (!submitted) setStep((s) => (s === "submitted" ? "rx" : s));
  }, [submitted]);

  const rootRef = useRef<HTMLDivElement>(null);
  useScrollTopOnChange(rootRef, step);
  // A brand with no copay offer skips the Benefit Pricing step.
  const go = (d: 1 | -1) => {
    let i = STEPS.indexOf(step) + d;
    if (STEPS[i] === "pricing" && !OFFER) i += d;
    setStep(STEPS[i]);
  };
  const set = (k: keyof typeof details) => (v: string) => setDetails((d) => ({ ...d, [k]: v }));

  function submit() {
    dispatch("PES_SUBMIT", { portal: "patient", prescriberNpi: npi });
    setStep("submitted");
  }

  return (
    <div ref={rootRef} className="portal-patient flex min-h-full flex-col overflow-y-auto bg-arx-neutral-100 text-arx-neutral-800">
      <Header />
      <main className="flex-1">
        {step === "welcome" && (
          <section className="bg-arx-primary px-12 py-16 text-arx-on-primary">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-arx-on-primary">For patients and caregivers</p>
            <h1 className="mb-4 max-w-3xl text-4xl font-black leading-tight">You are ready to get started</h1>
            <p className="mb-2 max-w-2xl text-base opacity-90">This page guides you through a few steps to enroll in the {PROGRAM.name} support program.</p>
            <p className="mb-8 max-w-2xl text-sm opacity-80">Enrolling does not guarantee coverage or program benefits.</p>
            <button type="button" onClick={() => go(1)} className={primaryBtn}>Get started <ArrowRight className="h-4 w-4" /></button>
          </section>
        )}

        {(step === "hipaa" || step === "patient" || step === "rx") && (
          <div className="mx-auto max-w-3xl px-6 py-10">
            <p className="mb-2 text-right text-xs font-semibold">{STEPS.indexOf(step)} / {STEPS.length - 2}</p>

            {step === "hipaa" && (
              <>
                <h1 className="mb-2 text-3xl font-black text-arx-primary">Confirm your HIPAA authorization</h1>
                <p className="mb-5 text-sm text-arx-body-copy">Review the authorization, then confirm you authorize the use and disclosure of your health information.</p>
                <div className="mb-4 h-56 overflow-y-auto rounded-lg border border-arx-borders bg-white p-5 text-sm leading-relaxed">
                  <p className="mb-3 font-bold">HIPAA authorization for {PROGRAM.name} enrollment</p>
                  <p className="mb-3">By using this page, you authorize {MANUFACTURER.name}, its agents, and any pharmacy, prescriber, or health plan involved in your care to use and disclose your protected health information, including your diagnosis, prescription history, and insurance eligibility and coverage information, to verify your coverage, determine your eligibility for the support program, and process your enrollment.</p>
                  <p>This authorization is voluntary. You may revoke it at any time by contacting {MANUFACTURER.name}. Once disclosed, your information may no longer be protected by federal privacy law.</p>
                </div>
                <Check checked={agreed} onChange={setAgreed} label="I have reviewed and agree to the HIPAA authorization above, and I consent to the use and disclosure of my health information as described." />
                <Nav onBack={() => go(-1)} onNext={() => go(1)} nextLabel="Agree and continue" nextDisabled={!agreed} />
              </>
            )}

            {step === "patient" && (
              <>
                <h1 className="mb-6 text-3xl font-black text-arx-primary">Patient information</h1>
                <Section n={1} title="About you">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="First name" required value={details.first} onChange={set("first")} />
                    <TextInput label="Last name" required value={details.last} onChange={set("last")} />
                    <TextInput label="Date of birth" required value={details.dob} onChange={set("dob")} />
                    <Field label="Gender" required>
                      <select className={inputCls} value={details.gender} onChange={(e) => set("gender")(e.target.value)}>
                        <option value="">Select one</option>
                        {GENDERS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <TextInput label="Zip code" required value={details.zip} onChange={set("zip")} />
                    <TextInput label="Mobile phone" required value={details.phone} onChange={set("phone")} />
                    <TextInput label="Email" className="md:col-span-2" value={details.email} onChange={set("email")} />
                  </div>
                </Section>
                <Nav onBack={() => go(-1)} onNext={() => go(1)} nextLabel="Continue" nextDisabled={!details.gender || !/^\d{5}$/.test(details.zip)} />
              </>
            )}

            {step === "rx" && (
              <>
                <h1 className="mb-1 text-3xl font-black text-arx-primary">Prescription information</h1>
                <p className="mb-6 text-sm text-arx-body-copy">Share your current {PROGRAM.name} dose below. All fields are required.</p>
                <Section n={1} title={`Has your healthcare provider prescribed you ${PROGRAM.name}?`}>
                  <div className="space-y-2">{["Yes", "No"].map((o) => <Radio key={o} name="prescribed" label={o} checked={prescribed === o} onChange={() => setPrescribed(o)} />)}</div>
                </Section>
                <Section n={2} title="Current prescribed dose">
                  <div className="space-y-2">{DOSES.map((d) => <Radio key={d} name="dose" label={d} checked={dose === d} onChange={() => setDose(d)} />)}</div>
                </Section>
                <Section n={3} title="Your prescriber">
                  <ProviderSearch value={provider} onChange={setProvider} npi={npi} onNpi={setNpi} />
                </Section>
                <Nav onBack={() => go(-1)} onNext={() => go(1)} nextLabel="Continue" nextDisabled={!dose || !prescribed || !isNpi(npi)} />
              </>
            )}
          </div>
        )}

        {step === "pricing" && OFFER && (
          <div className="mx-auto max-w-3xl px-6 py-10">
            <p className="mb-2 text-right text-xs font-semibold">5 / {STEPS.length - 2}</p>
            <h1 className="mb-1 text-3xl font-black text-arx-primary">Benefit pricing</h1>
            <p className="mb-6 text-sm text-arx-body-copy">Your {PROGRAM.name} support options.</p>
            <div className="relative max-w-sm rounded-xl border border-arx-borders bg-white p-6">
              <span className="absolute -top-3 right-4 rounded-full bg-arx-primary px-3 py-1 text-[10px] font-bold uppercase text-arx-on-primary">Best value</span>
              <p className="text-sm">Copay price</p>
              <p className="text-3xl font-black">{OFFER.price}</p>
              <p className="mb-4 text-xs text-arx-body-copy">{OFFER.unit}</p>
              <p className="text-xs text-arx-body-copy">Pharmacy</p>
              <p className="mb-2 text-sm font-semibold">{OFFER.pharmacy}</p>
              <p className="text-xs text-arx-body-copy">Code</p>
              <p className="mb-2 text-sm font-semibold">{OFFER.code}</p>
              <p className="text-xs text-arx-body-copy">Details</p>
              <p className="mb-4 text-xs">{OFFER.details}</p>
              <button type="button" className={`${primaryBtn} w-full`} onClick={() => go(1)}>Enroll <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="mt-8"><button type="button" className={ghostBtn} onClick={() => go(-1)}>Back</button></div>
          </div>
        )}

        {step === "confirm" && (
          <div className="mx-auto max-w-3xl px-6 py-10">
            <p className="mb-2 text-right text-xs font-semibold">{OFFER ? 6 : 5} / {STEPS.length - 2}</p>
            <h1 className="mb-1 text-3xl font-black text-arx-primary">Confirm your information</h1>
            <p className="mb-6 text-sm text-arx-body-copy">Review your details below before completing your {PROGRAM.name} enrollment.</p>
            <div className="mb-8 rounded-lg border border-arx-borders bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold">Your information</h2>
                <button type="button" className="text-sm font-semibold text-arx-link" onClick={() => setStep("patient")}>Edit <ArrowRight className="inline h-3 w-3" /></button>
              </div>
              <dl className="grid gap-4 text-sm md:grid-cols-2">
                {[["Full name", `${details.first} ${details.last}`], ["Date of birth", details.dob], ["Gender", details.gender], ["Zip code", details.zip], ["Email", details.email], ["Phone number", details.phone]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-arx-body-copy">{k}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
            </div>
            <h2 className="mb-2 text-base font-bold">Terms of participation and program disclosures</h2>
            <p className="mb-8 text-sm leading-relaxed text-arx-body-copy">Your healthcare provider has talked with you about using {PROGRAM.name}, a {MANUFACTURER.name} medicine. The support program offers personalized support to patients at no charge. By enrolling, you authorize {MANUFACTURER.name} to retain and use your personal information to administer the program, to contact you about your condition and therapy, to answer your service requests, and to share your enrollment and use of these services with your doctors and insurers. To cancel your participation, contact {MANUFACTURER.name}. For more information, see the Privacy Statement.</p>
            <h2 className="mb-3 text-base font-bold">Optional consents</h2>
            <div className="mb-2 space-y-3">
              <Check checked={optional.marketing} onChange={(v) => setOptional((o) => ({ ...o, marketing: v }))} label={<><strong>Marketing consent</strong> - I consent to {MANUFACTURER.name}'s use and disclosure of my personal information to contact me about developments and programs, and to improve my experience.</>} />
              <Check checked={optional.medical} onChange={(v) => setOptional((o) => ({ ...o, medical: v }))} label={<><strong>Medical research</strong> - I agree to be contacted to participate in medical research studies.</>} />
              <Check checked={optional.market} onChange={(v) => setOptional((o) => ({ ...o, market: v }))} label={<><strong>Market research</strong> - I agree to be contacted to participate in market research studies about products and services.</>} />
            </div>
            <Nav onBack={() => go(-1)} onNext={submit} nextLabel="Submit enrollment" />
          </div>
        )}

        {step === "submitted" && (
          <div className="mx-auto max-w-xl px-6 py-16 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-arx-success" />
            <h1 className="mb-3 text-3xl font-black text-arx-primary">Enrollment submitted</h1>
            <p className="text-base text-arx-body-copy">Thank you, {details.first}. We are checking your coverage for {PROGRAM.drugDisplayName}. We will text you as soon as there is an update. No further action is needed right now.</p>
            <button type="button" className={`${primaryBtn} mt-8`} onClick={() => window.dispatchEvent(new Event(START_OVER_EVENT))}>Start over</button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
