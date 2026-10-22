import { useState } from "react";
import { CheckCircle, ChevronRight, Users, DollarSign, Loader2 } from "lucide-react";
import { usePersonaState } from "@/engine/WorkflowProvider";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import ProgramLogo from "@/portals/patient/components/brand/ProgramLogo";
import { useChatContext } from "@/portals/patient/components/ChatContext";
import { CHATBOT_ICON, PROGRAM } from "@/portals/patient/config/branding";
import { hexToColorFilter } from "@/portals/patient/lib/brandFilter";
import { useFreeDrug } from "@/hooks/useFreeDrug";
import { useCaseWizardStore } from "@/store/caseWizardStore";
import { MANUFACTURER } from "@/portals/patient/config/branding";

const HOUSEHOLD_SIZES = ["1", "2", "3", "4", "5", "6", "7", "8+"];

function formatIncome(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return "$" + Number(digits).toLocaleString("en-US");
}

export default function IncomeQualification() {
  const dispatch = useWorkflowDispatch();
  const { workflowData } = usePersonaState('patient');
  const incomeStatus = workflowData.incomeStatus;
  const { openChat } = useChatContext();

  // Free drug (Buy and Bill PAP): the HCP already entered the household in iAssist, so the patient confirms it. The
  // credit check consent comes with the application.
  const freeDrug = useFreeDrug();
  const hcpEntered = useCaseWizardStore((s) => s.patient);
  const [householdSize, setHouseholdSize] = useState(freeDrug ? hcpEntered.householdSize : "");
  const [incomeRaw, setIncomeRaw] = useState(freeDrug ? hcpEntered.householdIncome.replace(/\D/g, "") : "");
  const [creditConsent, setCreditConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const incomeDisplay = formatIncome(incomeRaw);
  const canSubmit = householdSize !== "" && incomeRaw !== "" && (!freeDrug || creditConsent);

  function handleIncomeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setIncomeRaw(digits);
  }

  function handleSubmit() {
    if (!canSubmit || checkingEligibility) return;
    setCheckingEligibility(true);
    setTimeout(() => {
      setCheckingEligibility(false);
      setSubmitted(true);
    }, 2000);
  }

  function handleConfirm() {
    dispatch('VERIFY_INCOME', { portal: 'patient', householdSize, householdIncome: incomeRaw });
  }

  if (incomeStatus === "verified") {
    return (
      <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-center justify-between mb-4">
              <ProgramLogo variant="colors" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-7 h-7 flex-shrink-0" style={{ color: "#16a34a" }} />
              <h2 className="text-xl font-bold leading-snug text-arx-slate">{freeDrug ? "Application received" : "You're eligible!"}</h2>
            </div>
            <p className="text-sm leading-relaxed text-arx-body-copy mb-5">
              {freeDrug
                ? `We've received your ${PROGRAM.drugDisplayName} free drug application. Our team is reviewing it and will contact you with next steps.`
                : `Based on your household information, you qualify for the ${PROGRAM.drugDisplayName} free drug program. Your application has been submitted and is being reviewed.`}
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm font-semibold text-green-800">Application submitted</p>
              <p className="text-xs text-green-700 mt-0.5">{freeDrug ? "No action is needed right now. We'll message you when there's an update." : "We'll notify you once your eligibility has been confirmed and your medication is ready to ship."}</p>
            </div>
            <button
              onClick={openChat}
              className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-link hover:bg-arx-sky/30 transition-colors"
            >
              <img src={CHATBOT_ICON} alt="" className="w-4 h-4 object-contain" style={{ filter: hexToColorFilter(PROGRAM.colors.brand) }} />
              <span>Have questions? Start a chat</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-center justify-between mb-4">
              <ProgramLogo variant="colors" />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-7 h-7 flex-shrink-0" style={{ color: "#16a34a" }} />
              <h2 className="text-xl font-bold leading-snug text-arx-slate">{freeDrug ? "Review your application" : "You qualify!"}</h2>
            </div>

            <p className="text-sm leading-relaxed text-arx-body-copy mb-5">
              {freeDrug
                ? `Confirm your answers and submit. Our team will review your ${PROGRAM.drugDisplayName} free drug application and contact you with next steps.`
                : `Great news — based on the information you provided, you appear to be eligible for the ${PROGRAM.drugDisplayName} free drug program. Since this medication is provided at no cost, no insurance is required.`}
            </p>

            <div className="bg-arx-sky/20 border border-arx-sky rounded-xl px-4 py-3 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-arx-body-copy">Household size</span>
                <span className="font-semibold text-arx-slate">{householdSize}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-arx-body-copy">Annual income</span>
                <span className="font-semibold text-arx-slate">{incomeDisplay}</span>
              </div>
              {!freeDrug && (
                <div className="flex justify-between text-sm">
                  <span className="text-arx-body-copy">Eligibility result</span>
                  <span className="font-semibold" style={{ color: "#16a34a" }}>Eligible</span>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-arx-action text-arx-on-action font-semibold py-3.5 rounded-lg hover:bg-arx-action-hover transition-colors flex items-center justify-center gap-2"
            >
              Submit application
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow pb-8">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* Intro card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
          <div className="flex items-center justify-between mb-4">
            <ProgramLogo variant="colors" />
          </div>
          <h2 className="text-xl font-bold leading-snug text-arx-slate mb-2">Check your eligibility</h2>
          <p className="text-sm leading-relaxed text-arx-body-copy">
            {PROGRAM.drugDisplayName} is available at <strong>no cost</strong> to eligible patients. Answer a few quick questions to see if you qualify.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders space-y-5">
          {/* Household size */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-arx-slate mb-3">
              <Users className="w-4 h-4 text-arx-link" />
              Household size
            </label>
            <div className="grid grid-cols-4 gap-2">
              {HOUSEHOLD_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setHouseholdSize(s)}
                  className="py-2.5 rounded-lg border text-sm font-semibold transition-colors"
                  style={{
                    borderColor: householdSize === s ? "hsl(var(--arx-primary))" : "#e5e5e5",
                    backgroundColor: householdSize === s ? "hsl(var(--arx-sky) / 0.25)" : "white",
                    color: householdSize === s ? "hsl(var(--arx-primary))" : "#414042",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Annual income */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-arx-slate mb-2">
              <DollarSign className="w-4 h-4 text-arx-link" />
              Annual household income
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={incomeDisplay}
                onChange={handleIncomeChange}
                placeholder="$0"
                className="w-full border border-arx-borders rounded-lg px-4 py-3 text-sm text-arx-slate placeholder:text-arx-inactive focus:outline-none focus:ring-2 focus:ring-arx-primary/30 focus:border-arx-primary transition-colors"
              />
            </div>
            <p className="text-xs text-arx-inactive mt-1.5">Include all sources of income for your household</p>
          </div>

          {freeDrug && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={creditConsent} onChange={(e) => setCreditConsent(e.target.checked)} className="mt-1 w-4 h-4 flex-shrink-0 accent-arx-primary" />
              <span className="text-xs leading-relaxed text-arx-body-copy">
                I authorize {MANUFACTURER.name} to check my credit profile and other sources for my income and financial status. It is used only to decide my eligibility for the free drug program. I can cancel this authorization in writing at any time.
              </span>
            </label>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || checkingEligibility}
            className="w-full text-arx-on-action font-semibold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: canSubmit ? "hsl(var(--arx-action))" : "#c4c4c4",
              cursor: canSubmit && !checkingEligibility ? "pointer" : "not-allowed",
            }}
          >
            {checkingEligibility ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking eligibility…
              </>
            ) : (
              <>
                Check eligibility
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs text-arx-inactive px-4">
          Your information is kept private and used only to determine program eligibility.
        </p>
      </div>
    </main>
  );
}
