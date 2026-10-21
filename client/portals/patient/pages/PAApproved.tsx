import { useNavigate } from "@/lib/portalRouter";
import { ArrowRight, ChevronRight, BookOpen, CreditCard } from "lucide-react";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";
import { PROGRAM } from "@/portals/patient/config/branding";
import { usePersonaState } from "@/engine/WorkflowProvider";
import { useFreeDrug } from "@/hooks/useFreeDrug";
import { KEANU_SITE_OF_CARE_FACTS } from "@/engine/WorkflowEngine";
import { MapPin } from "lucide-react";

export default function PAApproved() {
  const navigate = useNavigate();
  const { workflowData } = usePersonaState('patient');
  const flowType = workflowData.flowType;
  const pharmacyStatus = workflowData.pharmacyStatus;
  const paStatus = workflowData.paStatus;
  const isWorkflow1 = flowType === "Fax_QS_PA_Approved";
  const isCoA = flowType === "CoA_DTP" || flowType === "CoA_Copay";
  // iAssist_PAP (WF5) reaches this screen via an approved APPEAL, not a
  // straight-through PA approval (see WorkflowEngine.ts's derivePatientRoute
  // and workflows/iassist/rules.ts's appealStatus) — the generic "covered by
  // your insurance" headline reads like a non sequitur right after the
  // patient was told PA was denied, so this flow gets its own headline that
  // closes that loop instead of silently reusing WF1's copy.
  // Free drug (Buy and Bill PAP) is the other scenario that sends the drug to a site of care. Its recipe says so.
  const freeDrug = useFreeDrug();
  const isIAssistPap = flowType === "iAssist_PAP" || freeDrug;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <main className="flex-grow pt-5 pb-8">
        <div className="max-w-lg mx-auto px-4 space-y-5">

          {/* PA Approved card */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-center justify-between mb-4">
              <ProgramLogo variant="colors" />
              <span className="text-xs text-arx-body-copy">{dateStr}, {timeStr}</span>
            </div>

            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-xl font-bold leading-snug text-arx-slate">
                {freeDrug ? "Great news! You were approved for the free drug program" : isIAssistPap ? "Great news! Your appeal was approved" : `Great news! ${PROGRAM.drugDisplayName} is covered by your insurance`}
              </h2>
              <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-arx-sky">
                <span className="text-lg font-bold text-arx-link">Rx</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
              {freeDrug
                ? `Your ${PROGRAM.drugDisplayName} will go to your doctor's office at no cost to you. Now choose an appointment date that works for you.`
                : isIAssistPap
                ? "Now let's get your infusion scheduled. Choose a date that works for you."
                : "Now we can arrange for delivery. Complete a short form and choose a delivery date that works for you."}
            </p>

            {freeDrug && (
              <div className="flex items-start gap-2 rounded-xl border border-arx-borders bg-arx-sky/20 px-4 py-3 mb-5">
                <MapPin className="w-4 h-4 text-arx-link flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-arx-slate">{KEANU_SITE_OF_CARE_FACTS.facilityName}</p>
                  <p className="text-xs text-arx-body-copy">{KEANU_SITE_OF_CARE_FACTS.address}, {KEANU_SITE_OF_CARE_FACTS.city}, {KEANU_SITE_OF_CARE_FACTS.state} {KEANU_SITE_OF_CARE_FACTS.zip}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                navigate(isIAssistPap ? "/infusion-date" : isCoA ? "/benefit-pricing" : "/delivery-address");
              }}
              className="w-full bg-arx-action text-arx-on-action font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:bg-arx-action-hover transition-colors"
            >
              <span>{freeDrug ? "Choose appointment date" : isIAssistPap ? "Schedule infusion" : "Schedule delivery now"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Copay card — CoA_DTP shows its own copay banner on the Benefit
              Pricing screen that follows; iAssist_PAP (WF5) dispenses via a
              site of care, not a pharmacy copay, so skip it here too. */}
          {!isWorkflow1 && !isCoA && !isIAssistPap && (
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold leading-snug text-arx-slate">
                  You might be eligible for the {PROGRAM.drugDisplayName} Copay program!
                </h2>
                <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-arx-sky">
                  <CreditCard className="w-5 h-5 text-arx-link" />
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-2 text-arx-body-copy">
                Based on your insurance information, you are eligible for the Copay Assistance program.
              </p>
              <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                To help reduce your out-of-pocket cost, enroll in the program now.
              </p>

              <button
                onClick={() => navigate("/copay-enroll")}
                className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-link hover:bg-arx-sky/30 transition-colors"
              >
                <span>Enroll now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Prescriptions section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-arx-primary inline-block" />
                <span className="font-bold text-arx-slate text-base">Prescriptions</span>
              </div>
              <button className="flex items-center gap-1 text-sm font-semibold text-arx-link hover:text-arx-primary-80 transition-colors">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <button className="w-full flex items-center gap-4 text-arx-slate rounded-xl px-4 py-3.5 border-2 border-arx-borders hover:bg-arx-background transition-colors">
              <ProgramLogo variant="colors" className="flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-xs text-arx-body-copy">Pending delivery</p>
              </div>
              <ChevronRight className="w-5 h-5 text-arx-body-copy" />
            </button>
          </section>

          {/* Suggested section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-arx-primary inline-block" />
              <h3 className="font-semibold text-sm text-arx-link">Suggested for you</h3>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h4 className="text-lg font-bold leading-snug text-arx-slate">Get ready for {PROGRAM.drugDisplayName}</h4>
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-arx-sky">
                  <BookOpen className="w-5 h-5 text-arx-link" />
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-2 text-arx-body-copy">
                Learn everything you need to know about your new prescription — from how to store it properly to how to take it safely.
              </p>
              <p className="text-sm leading-relaxed mb-5 text-arx-body-copy">
                We'll guide you step by step so you feel prepared from day one.
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full font-semibold py-3.5 rounded-lg border-2 border-arx-primary text-arx-link hover:bg-arx-sky/30 transition-colors"
              >
                Learn more
              </button>
            </div>
          </section>

        </div>
    </main>
  );
}
