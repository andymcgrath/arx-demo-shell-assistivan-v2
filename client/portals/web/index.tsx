/**
 * Client web page (mock). A client-managed page starts the case: consent, patient details, the Rx, then benefit
 * pricing. The client owns this page, so it is styled as the client's own and is not a patient-experience screen.
 * What AssistRx owns is the hook: the two calls into the platform.
 *
 * - After the Rx screen, the page sends WEB_SUBMIT. That is the benefit verification (ABV) call through the gateway.
 *   The page then waits on "Checking your coverage" until the gateway returns, which the presenter releases from the
 *   Gateway tab. The patient's coverage summary then appears in the patient experience.
 *
 * Which screen shows is local, except the last one: it reads BI from the machine, so it waits for the gateway.
 * Nothing here calls a real service. All data is representative.
 */
import { useEffect, useRef, useState } from "react";
import { useScrollTopOnChange } from "@/hooks/useScrollTopOnChange";
import { ArrowRight, Loader2 } from "lucide-react";
import { useDemoStore } from "@/store/demoStore";
import { useWorkflowDispatch, usePersonaState } from "@/engine/WorkflowProvider";
import { usePatientCase } from "@/hooks/usePatientCase";
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";
import Hero from "./Hero";
import ProviderSearch, { isNpi, type Provider } from "./ProviderSearch";
import PatientForm, { GENDERS } from "./PatientForm";
import { usePatientStore } from "@/store/patientStore";
import SafetySummary from "./SafetySummary";
import SiteHeader from "./SiteHeader";
import Footer from "@/portals/patient/components/Footer";

const DOSES = ["0.8 mg", "2.5 mg", "5.5 mg", "17.2 mg"];
const STEPS = ["intro", "hipaa", "patient", "rx", "results"] as const;
type Step = (typeof STEPS)[number];

const primary = "inline-flex items-center justify-center gap-2 rounded-full bg-arx-action px-6 py-2.5 text-sm font-semibold text-arx-on-action disabled:opacity-40";

/** Reset All bumps the nonce. The page remounts, so its step and its answers start over with the machine. */
export default function WebPortal() {
  const resetNonce = useDemoStore((s) => s.resetNonce);
  return <ConsumerWebPortal key={resetNonce} />;
}

function ConsumerWebPortal() {
  const dispatch = useWorkflowDispatch();
  const { workflowData: w } = usePersonaState("patient");
  const { data: patient } = usePatientCase();
  const caseGender = usePatientStore((s) => s.gender);
  // A reload or a Reset All must land on the right screen: before the submit it is the intro, after it the results.
  const [step, setStep] = useState<Step>(w.enrollmentStatus === "none" ? "intro" : "results");
  const [agreed, setAgreed] = useState(false);
  const [dose, setDose] = useState("");
  const [prescribed, setPrescribed] = useState("");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [npi, setNpi] = useState("");
  // Like the other patient fields, gender and zip start filled from the case so the demo keeps moving.
  const [gender, setGender] = useState(() => (GENDERS.includes(caseGender) ? caseGender : ""));
  const [zip, setZip] = useState(() => patient.deliveryAddress.match(/\b(\d{5})(?:-\d{4})?\s*$/)?.[1] ?? "");
  const [ongoing, setOngoing] = useState("");
  // Undo of the submit puts the patient back on the Rx screen with their answers kept. Reset All remounts the page
  // (see WebPortal), which starts at the intro.
  useEffect(() => {
    if (w.enrollmentStatus === "none") setStep((s) => (s === "results" ? "rx" : s));
  }, [w.enrollmentStatus]);

  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1]);
  const back = () => setStep(STEPS[STEPS.indexOf(step) - 1]);
  const n = STEPS.indexOf(step);
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollTopOnChange(rootRef, step);

  function submitRx() {
    dispatch("WEB_SUBMIT", { portal: "patient", prescriberNpi: npi });
    setStep("results");
  }

  return (
    <div ref={rootRef} className="portal-patient h-full overflow-y-auto overflow-x-hidden bg-arx-neutral-100 text-arx-neutral-800">
      {/* min-h-full makes the column at least one screen tall, so a short step still ends with the footer at the bottom. */}
      <div className="flex min-h-full flex-col">
      <SiteHeader />

      {step === "intro" && <Hero onStart={next} />}

      <main className={step === "intro" ? "hidden" : "flex-1 px-5 py-6"}>
        {n > 0 && <p className="mb-2 text-right text-xs font-semibold text-arx-neutral-800">{n} / 4</p>}

        {step === "hipaa" && (
          <section>
            <h1 className="mb-2 text-2xl font-extrabold">Confirm your HIPAA authorization</h1>
            <p className="mb-4 text-sm text-arx-neutral-800">Review the authorization, then confirm you authorize the use and disclosure of your health information.</p>
            <div className="mb-4 h-48 overflow-y-auto rounded-lg border border-arx-borders bg-white p-4 text-xs leading-relaxed text-arx-neutral-800">
              <p className="mb-2 font-bold">HIPAA authorization for {PROGRAM.name} coverage check</p>
              <p>By using this tool, you authorize {MANUFACTURER.name}, its agents, and any pharmacy, prescriber, or health plan involved in your care to use and disclose your protected health information, including prescription history and insurance eligibility and coverage information, to verify your coverage and determine your eligibility for the copay program.</p>
            </div>
            <label className="mb-6 flex items-start gap-2 text-xs text-arx-neutral-800">
              <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I have reviewed and agree to the HIPAA authorization above.
            </label>
            <div className="flex gap-3">
              <button className={primary} disabled={!agreed} onClick={next}>Agree and continue</button>
              <button className="rounded-full border border-arx-borders px-5 py-2.5 text-sm" onClick={back}>Back</button>
            </div>
          </section>
        )}

        {step === "patient" && (
          <PatientForm
            patient={patient}
            gender={gender}
            onGender={setGender}
            zip={zip}
            onZip={setZip}
            ongoing={ongoing}
            onOngoing={setOngoing}
            onNext={next}
            onBack={back}
          />
        )}

        {step === "rx" && (
          <section>
            <h1 className="mb-2 text-2xl font-extrabold">Prescription information</h1>
            <p className="mb-1 text-sm text-arx-neutral-800">Share your current {PROGRAM.name} dose below.</p>
            <p className="mb-5 text-xs text-arx-body-copy">All fields are required unless noted as optional.</p>

            <p className="mb-2 text-sm font-medium">Has your healthcare provider prescribed you {PROGRAM.name}?</p>
            <div className="mb-5 space-y-2">
              {["Yes", "No"].map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="prescribed" checked={prescribed === o} onChange={() => setPrescribed(o)} /> {o}
                </label>
              ))}
            </div>

            <p className="mb-2 text-sm font-medium">Current prescribed dose</p>
            <div className="mb-6 space-y-2">
              {DOSES.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="dose" checked={dose === d} onChange={() => setDose(d)} /> {d}
                </label>
              ))}
            </div>

            <div className="mb-6"><ProviderSearch value={provider} onChange={setProvider} npi={npi} onNpi={setNpi} /></div>

            <div className="flex gap-3">
              <button className={primary} disabled={!dose || !prescribed || !isNpi(npi)} onClick={submitRx}>Get results <ArrowRight className="h-4 w-4" /></button>
              <button className="rounded-full border border-arx-borders px-5 py-2.5 text-sm" onClick={back}>Back</button>
            </div>
          </section>
        )}

        {step === "results" && (
          <section>
            <h1 className="mb-1 text-2xl font-extrabold">Checking your coverage</h1>
            <p className="mb-4 text-sm text-arx-neutral-800">We are checking your {PROGRAM.name} benefits with your insurance.</p>
            {w.biStatus !== "complete" ? (
              <div className="flex items-center gap-3 rounded-lg border border-arx-borders bg-white p-4 text-sm text-arx-neutral-800">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your coverage…
              </div>
            ) : (
              <div className="rounded-lg border border-arx-borders bg-white p-4 text-sm text-arx-neutral-800">
                <p className="font-semibold">Your coverage check is done.</p>
                <p className="mt-1 text-xs text-arx-body-copy">Your coverage summary is ready in your patient experience.</p>
              </div>
            )}
          </section>
        )}
      </main>

      {step === "intro" && <SafetySummary />}
      <Footer />
      </div>
    </div>
  );
}
