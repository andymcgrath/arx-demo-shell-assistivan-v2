import { useState } from "react";
import { Users, DollarSign, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";
import { usePresPapStore } from "@/store/presPapStore";

function formatIncome(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return "$" + Number(digits).toLocaleString("en-US");
}

/**
 * WF5 (PrES_PAP) household income capture — ported from
 * arx-pes-prototype-omniplan's IncomeVerificationSubmission.tsx, including
 * its "Calculating..." spinner before moving on. Pure data entry — no
 * actor dispatch here; PAP eligibility is finalized at the PAP Terms step
 * (PesPapTerms.tsx) via VERIFY_INCOME, matching how WF2 only flips
 * incomeStatus once at the end of its own income-check beat.
 */
export default function PesIncomeSubmission() {
  const navigate = useNavigate();
  const householdSize = usePresPapStore((s) => s.householdSize);
  const annualHouseholdIncome = usePresPapStore((s) => s.annualHouseholdIncome);
  const setField = usePresPapStore((s) => s.setField);
  const [isCalculating, setIsCalculating] = useState(false);

  const canContinue = householdSize.trim() && annualHouseholdIncome.trim();

  function handleContinue() {
    if (!canContinue) return;
    setIsCalculating(true);
    setTimeout(() => {
      navigate("/pes-pap-terms");
    }, 2000);
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell icon={<DollarSign className="w-7 h-7" />} title="Income Verification" stepsFilled={2} stepsTotal={3}>
        <p className="text-sm text-arx-body-copy mb-5">
          Please provide the following information to continue the enrollment.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-arx-slate mb-2">
              <Users className="w-4 h-4 text-arx-primary" />
              Household size (including yourself)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={householdSize}
              onChange={(e) => setField("householdSize", e.target.value.replace(/\D/g, ""))}
              placeholder="e.g., 4"
              className="w-full border border-arx-borders rounded-lg px-4 py-3 text-sm text-arx-slate placeholder:text-arx-inactive focus:outline-none focus:ring-2 focus:ring-arx-primary/30 focus:border-arx-primary transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-arx-slate mb-2">
              <DollarSign className="w-4 h-4 text-arx-primary" />
              Annual household income
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formatIncome(annualHouseholdIncome)}
              onChange={(e) => setField("annualHouseholdIncome", e.target.value.replace(/\D/g, ""))}
              placeholder="$0"
              className="w-full border border-arx-borders rounded-lg px-4 py-3 text-sm text-arx-slate placeholder:text-arx-inactive focus:outline-none focus:ring-2 focus:ring-arx-primary/30 focus:border-arx-primary transition-colors"
            />
          </div>

          {isCalculating ? (
            <div className="w-full flex flex-col items-center justify-center gap-3 py-6">
              <Loader2 className="w-6 h-6 animate-spin text-arx-primary" />
              <p className="text-sm font-semibold text-arx-body-copy">Calculating...</p>
            </div>
          ) : (
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                canContinue ? "bg-arx-primary text-white hover:bg-arx-primary-dark" : "bg-arx-borders text-arx-inactive cursor-not-allowed"
              }`}
            >
              <span>Continue</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </EnrollmentShell>
    </main>
  );
}
