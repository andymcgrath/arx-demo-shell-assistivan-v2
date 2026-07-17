import { useState } from "react";
import { CheckCircle, ChevronRight, Users, DollarSign } from "lucide-react";
import { usePersonaState } from "@/engine/WorkflowProvider";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import ProgramLogo from "@/components/brand/ProgramLogo";
import { useChatContext } from "@/components/ChatContext";
import { CHATBOT_ICON, PROGRAM } from "@/config/branding";
import { hexToColorFilter } from "@/lib/brandFilter";

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

  const [householdSize, setHouseholdSize] = useState("");
  const [incomeRaw, setIncomeRaw] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const incomeDisplay = formatIncome(incomeRaw);
  const canSubmit = householdSize !== "" && incomeRaw !== "";

  function handleIncomeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setIncomeRaw(digits);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitted(true);
  }

  function handleConfirm() {
    dispatch('VERIFY_INCOME', { portal: 'patient' });
  }

  if (incomeStatus === "verified") {
    return (
      <main className="flex-grow pb-8">
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
            <div className="flex items-center justify-between mb-4">
              <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-7 h-7 flex-shrink-0" style={{ color: "#16a34a" }} />
              <h2 className="text-xl font-bold leading-snug text-arx-slate">You're eligible!</h2>
            </div>
            <p className="text-sm leading-relaxed text-arx-body-copy mb-5">
              Based on your household information, you qualify for the {PROGRAM.drugDisplayName} free drug program. Your application has been submitted and is being reviewed.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm font-semibold text-green-800">Application submitted</p>
              <p className="text-xs text-green-700 mt-0.5">We'll notify you once your eligibility has been confirmed and your medication is ready to ship.</p>
            </div>
            <button
              onClick={openChat}
              className="w-full font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 border-2 border-arx-primary text-arx-primary hover:bg-arx-sky/30 transition-colors"
            >
              <img src={CHATBOT_ICON} alt="" className="w-4 h-4 object-contain" style={{ filter: hexToColorFilter(PROGRAM.colors.primary) }} />
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
              <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-7 h-7 flex-shrink-0" style={{ color: "#16a34a" }} />
              <h2 className="text-xl font-bold leading-snug text-arx-slate">You qualify!</h2>
            </div>

            <p className="text-sm leading-relaxed text-arx-body-copy mb-5">
              Great news — based on the information you provided, you appear to be eligible for the {PROGRAM.drugDisplayName} free drug program. Since this medication is provided at no cost, no insurance is required.
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
              <div className="flex justify-between text-sm">
                <span className="text-arx-body-copy">Eligibility result</span>
                <span className="font-semibold" style={{ color: "#16a34a" }}>Eligible</span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-arx-primary text-white font-semibold py-3.5 rounded-lg hover:bg-arx-primary-dark transition-colors flex items-center justify-center gap-2"
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
            <ProgramLogo variant="colors" className="h-10 w-auto max-w-[120px] object-contain" />
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
              <Users className="w-4 h-4 text-arx-primary" />
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
              <DollarSign className="w-4 h-4 text-arx-primary" />
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

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full text-white font-semibold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: canSubmit ? "hsl(var(--arx-primary))" : "#c4c4c4",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            Check eligibility
            <ChevronRight className="w-4 h-4" />
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
