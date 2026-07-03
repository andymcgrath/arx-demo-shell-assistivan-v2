import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
];

function formatIncome(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

export default function PapIncomeVerification() {
  const dispatch = useWorkflowDispatch();

  const [incomeRaw, setIncomeRaw] = useState("");
  const [householdSize, setHouseholdSize] = useState("");
  const [state, setState] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [errors, setErrors] = useState<{ income?: string; size?: string; state?: string }>({});

  const incomeDisplay = formatIncome(incomeRaw);

  function validate() {
    const next: typeof errors = {};
    if (!incomeRaw) next.income = "Annual household income is required";
    if (!householdSize || Number(householdSize) < 1 || Number(householdSize) > 20)
      next.size = "Enter a household size between 1 and 20";
    if (!state) next.state = "Please select a state";
    return next;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setCalculating(true);
    setTimeout(() => {
      dispatch('VERIFY_INCOME', { portal: 'patient' });
    }, 1800);
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell title="Income verification" stepsFilled={3} stepsTotal={3}>
        <p className="text-sm mb-5 text-arx-body-copy">
          This information helps us determine which financial assistance programs you may qualify for.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            {/* Annual Household Income */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-arx-slate">
                Annual Household Income
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-sm text-arx-body-copy">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={incomeDisplay}
                  onChange={(e) => {
                    setIncomeRaw(e.target.value.replace(/\D/g, ""));
                    if (errors.income) setErrors((p) => ({ ...p, income: undefined }));
                  }}
                  className="w-full pl-8 pr-4 py-3.5 rounded-xl text-sm outline-none transition-colors border border-arx-borders bg-white text-arx-slate focus:border-arx-primary"
                />
              </div>
              {errors.income && <p className="text-xs text-arx-errors mt-1">{errors.income}</p>}
            </div>

            {/* Household Size */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-arx-slate">
                Household Size
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                placeholder="Number of people in household"
                value={householdSize}
                onChange={(e) => {
                  setHouseholdSize(e.target.value);
                  if (errors.size) setErrors((p) => ({ ...p, size: undefined }));
                }}
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-colors border border-arx-borders bg-white text-arx-slate focus:border-arx-primary"
              />
              {errors.size && <p className="text-xs text-arx-errors mt-1">{errors.size}</p>}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-arx-slate">
                State
              </label>
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  if (errors.state) setErrors((p) => ({ ...p, state: undefined }));
                }}
                className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-colors appearance-none border border-arx-borders bg-white text-arx-slate focus:border-arx-primary"
              >
                <option value="">Select your state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.state && <p className="text-xs text-arx-errors mt-1">{errors.state}</p>}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <button
              type="submit"
              disabled={calculating}
              className="w-full bg-arx-primary text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 transition-colors hover:bg-arx-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Calculating…</span>
                </>
              ) : (
                <>
                  <span>Submit</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              type="button"
              disabled={calculating}
              onClick={() => {
                setErrors({});
                setCalculating(true);
                setTimeout(() => {
                  dispatch('VERIFY_INCOME', { portal: 'patient' });
                }, 1800);
              }}
              className="text-sm underline underline-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-arx-primary hover:text-arx-primary-dark"
            >
              {calculating ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Calculating eligibility…
                </span>
              ) : (
                "Simple Eligibility Check"
              )}
            </button>
          </div>
        </form>
      </EnrollmentShell>
    </main>
  );
}
