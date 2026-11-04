/**
 * Client web page (mock). A client-managed page starts the case: consent, patient details, the Rx, then benefit
 * pricing. The client owns this page, so it is styled as the client's own and is not a patient-experience screen.
 * What AssistRx owns is the hook: the two calls into the platform.
 *
 * - After the Rx screen, the page sends WEB_SUBMIT. That is the benefit verification (ABV) call through the gateway.
 * - On Enroll, the page sends WEB_HANDOFF and the shell moves to the Patient tab, on the copay screen.
 *
 * Which screen shows is local, except the last one: it reads BI from the machine, so it waits for the gateway.
 * Nothing here calls a real service. All data is representative.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useWorkflowDispatch, usePersonaState } from "@/engine/WorkflowProvider";
import { usePatientCase } from "@/hooks/usePatientCase";
import { MANUFACTURER, PROGRAM } from "@/portals/patient/config/branding";
import ManufacturerLogo from "@/portals/patient/components/brand/ManufacturerLogo";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";

const DOSES = ["0.8 mg", "2.5 mg", "5.5 mg", "17.2 mg"];
const STEPS = ["intro", "hipaa", "patient", "rx", "results"] as const;
type Step = (typeof STEPS)[number];

const field = "w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900";
const primary = "inline-flex items-center justify-center gap-2 rounded-full bg-arx-action px-6 py-2.5 text-sm font-semibold text-arx-on-action disabled:opacity-40";

export default function WebPortal() {
  const dispatch = useWorkflowDispatch();
  const navigate = useNavigate();
  const { workflowData: w } = usePersonaState("patient");
  const { data: patient } = usePatientCase();
  // A reload or a Reset All must land on the right screen: before the submit it is the intro, after it the results.
  const [step, setStep] = useState<Step>(w.enrollmentStatus === "none" ? "intro" : "results");
  const [agreed, setAgreed] = useState(false);
  const [dose, setDose] = useState("");
  useEffect(() => {
    if (w.enrollmentStatus === "none") setStep((s) => (s === "results" ? "intro" : s));
  }, [w.enrollmentStatus]);

  const [first, ...rest] = patient.patientName.split(" ");
  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1]);
  const back = () => setStep(STEPS[STEPS.indexOf(step) - 1]);
  const n = STEPS.indexOf(step);

  function submitRx() {
    dispatch("WEB_SUBMIT", { portal: "patient" });
    setStep("results");
  }
  function enroll() {
    dispatch("WEB_HANDOFF", { portal: "patient" });
    // The Patient tab's URL slug. Not imported from DemoShell, which imports this file.
    navigate("/patient");
  }

  return (
    <div className="portal-patient flex min-h-full flex-col bg-slate-50 text-slate-900">
      {/* The client's header: a dark pill with the logos, on a brand band. */}
      <header className="bg-arx-primary px-3 py-3">
        <div className="flex items-center rounded-full bg-slate-900 px-4 py-2.5">
          <ManufacturerLogo variant="hsl(var(--arx-white))" size="footer" />
          <span className="mx-3 h-6 w-px bg-white/30" />
          <ProgramLogo variant="hsl(var(--arx-white))" size="small" />
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        {n > 0 && <p className="mb-2 text-right text-xs font-semibold text-slate-600">{n} / 4</p>}

        {step === "intro" && (
          <section>
            <h1 className="mb-3 text-3xl font-extrabold">You're ready to get started!</h1>
            <p className="mb-2 text-sm text-slate-600">This tool will guide you to understand coverage in a few steps.</p>
            <p className="mb-8 text-xs text-slate-500">Results do not guarantee coverage benefits.</p>
            <button className={primary} onClick={next}>Get started <ArrowRight className="h-4 w-4" /></button>
          </section>
        )}

        {step === "hipaa" && (
          <section>
            <h1 className="mb-2 text-2xl font-extrabold">Confirm your HIPAA authorization</h1>
            <p className="mb-4 text-sm text-slate-600">Review the authorization, then confirm you authorize the use and disclosure of your health information.</p>
            <div className="mb-4 h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-700">
              <p className="mb-2 font-bold">HIPAA authorization for {PROGRAM.name} coverage check</p>
              <p>By using this tool, you authorize {MANUFACTURER.name}, its agents, and any pharmacy, prescriber, or health plan involved in your care to use and disclose your protected health information, including prescription history and insurance eligibility and coverage information, to verify your coverage and determine your eligibility for the copay program.</p>
            </div>
            <label className="mb-6 flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I have reviewed and agree to the HIPAA authorization above.
            </label>
            <div className="flex gap-3">
              <button className={primary} disabled={!agreed} onClick={next}>Agree and continue</button>
              <button className="rounded-full border border-slate-300 px-5 py-2.5 text-sm" onClick={back}>Back</button>
            </div>
          </section>
        )}

        {step === "patient" && (
          <section>
            <h1 className="mb-2 text-2xl font-extrabold">Patient information</h1>
            <p className="mb-4 text-sm text-slate-600">Fill out your information to check your insurance coverage.</p>
            <div className="mb-6 space-y-3">
              <input className={field} aria-label="First name" defaultValue={first} />
              <input className={field} aria-label="Last name" defaultValue={rest.join(" ")} />
              <input className={field} aria-label="Date of birth" defaultValue={patient.patientDob} />
              <input className={field} aria-label="Email" defaultValue={patient.email} />
              <input className={field} aria-label="Phone number (optional)" placeholder="Phone number (optional)" defaultValue={patient.phone} />
            </div>
            <p className="mb-6 text-[11px] leading-relaxed text-slate-500">By providing your telephone number and selecting Continue, you agree to receive automated marketing calls and texts about your {PROGRAM.name} treatment journey from and on behalf of {MANUFACTURER.name}. Message and data rates may apply.</p>
            <div className="flex gap-3">
              <button className={primary} onClick={next}>Continue <ArrowRight className="h-4 w-4" /></button>
              <button className="rounded-full border border-slate-300 px-5 py-2.5 text-sm" onClick={back}>Back</button>
            </div>
          </section>
        )}

        {step === "rx" && (
          <section>
            <h1 className="mb-2 text-2xl font-extrabold">Prescription information</h1>
            <p className="mb-4 text-sm text-slate-600">Share your current {PROGRAM.name} dose below.</p>
            <p className="mb-2 text-sm font-medium">Current prescribed dose</p>
            <div className="mb-6 space-y-2">
              {DOSES.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="dose" checked={dose === d} onChange={() => setDose(d)} /> {d}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button className={primary} disabled={!dose} onClick={submitRx}>Get results <ArrowRight className="h-4 w-4" /></button>
              <button className="rounded-full border border-slate-300 px-5 py-2.5 text-sm" onClick={back}>Back</button>
            </div>
          </section>
        )}

        {step === "results" && (
          <section>
            <h1 className="mb-1 text-2xl font-extrabold">Benefit pricing</h1>
            <p className="mb-4 text-sm text-slate-600">Your {PROGRAM.name} coverage and pricing options.</p>
            {w.biStatus !== "complete" ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your coverage…
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-4">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-arx-primary text-arx-on-primary"><Check className="h-3 w-3" /></span>
                  <div className="text-sm">
                    <p className="font-semibold">Great news! {PROGRAM.name} is covered by your insurance.</p>
                    {w.paRequired && <p className="text-xs text-slate-600">Prior Authorization is required.</p>}
                  </div>
                </div>
                <div className="space-y-4">
                  <PriceTile title="Retail price" price="$50" supply="30 tablets / 30 days" />
                  <PriceTile title="Mail order price" price="$100" supply="90 tablets / 90 days" />
                  <PriceTile title="Copay price" price="$25" supply="30 tablets / 30 days" badge="Best value" onEnroll={enroll} />
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function PriceTile({ title, price, supply, badge, onEnroll }: { title: string; price: string; supply: string; badge?: string; onEnroll?: () => void }) {
  return (
    <div className={`relative rounded-lg border-2 bg-white p-4 ${onEnroll ? "border-arx-primary" : "border-slate-200"}`}>
      {badge && <span className="absolute -top-2.5 right-4 rounded-full bg-arx-primary px-3 py-1 text-[10px] font-bold uppercase text-arx-on-primary">{badge}</span>}
      <p className="text-xs text-slate-600">{title}</p>
      <p className="text-2xl font-bold">{price}</p>
      <p className="mb-3 text-xs text-slate-500">{supply}</p>
      {onEnroll ? (
        <button className={`${primary} w-full`} onClick={onEnroll}>Enroll <ArrowRight className="h-4 w-4" /></button>
      ) : (
        <span className="text-sm font-semibold text-arx-link">Select →</span>
      )}
    </div>
  );
}
