import { useState } from "react";
import { Check, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { PROGRAM } from "@/portals/patient/config/branding";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/portals/patient/components/enrollment/EnrollmentShell";
import { usePatientStore } from "@/store/patientStore";

const CREDIT_CHECK_MS = 3000;
const HOUSEHOLD_SIZES = ["1", "2", "3", "4", "5", "6", "7", "8+"];

const formatIncome = (raw: string) => (raw ? "$" + Number(raw).toLocaleString("en-US") : "");

/**
 * Buy and Bill, patient consent by text: after consenting, the patient confirms household size and income. The
 * HCP's iAssist patient record shows the result. The values start from the demo patient so the presenter can
 * move on with one tap.
 */
export default function ConfirmIncome() {
  const dispatch = useWorkflowDispatch();
  const seed = usePatientStore();
  const [size, setSize] = useState(seed.householdSize || "2");
  const [incomeRaw, setIncomeRaw] = useState((seed.householdIncome || "62000").replace(/\D/g, ""));
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [qualified, setQualified] = useState(false);
  const ready = size !== "" && incomeRaw !== "";

  // The credit check runs for 3 seconds. The machine hears CONFIRM_INCOME when the patient taps through, so this
  // screen stays put until then.
  function confirm() {
    if (!ready || checking) return;
    setChecking(true);
    setTimeout(() => { setChecking(false); setQualified(true); }, CREDIT_CHECK_MS);
  }

  function done() {
    dispatch("CONFIRM_INCOME", { portal: "patient", householdSize: size, householdIncome: incomeRaw });
    navigate("/");
  }

  if (qualified) {
    return (
      <main className="flex-grow flex items-center justify-center px-6 py-12 bg-arx-hero">
        <div className="text-center max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-arx-on-hero mb-4 leading-snug">Congratulations!</h1>
          <div className="rounded-2xl p-5 mb-6 flex flex-col items-center gap-2 bg-arx-on-hero/15 border border-arx-on-hero/35">
            <CheckCircle className="w-9 h-9 text-arx-on-hero" />
            <p className="text-2xl font-semibold text-arx-on-hero/90 leading-9">You are qualified for the {PROGRAM.name} support programs</p>
          </div>
          <p className="text-arx-on-hero/90 text-sm leading-relaxed mb-8">
            No further action is needed at this time. We'll notify you as soon as there's an update.
          </p>
          <button onClick={done} className="w-full bg-white text-arx-link font-semibold py-4 rounded-lg hover:bg-arx-sky transition-colors">Got it</button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell title="Confirm your household income" stepsFilled={3} stepsTotal={3}>
        <p className="text-sm text-arx-body-copy mb-5">
          This helps your care team confirm which support programs apply to you.
        </p>
        <div className="space-y-4">
          <label className="block border-b border-arx-borders px-1 pt-5 pb-2 relative">
            <span className="absolute top-2 left-1 text-xs text-arx-body-copy">Household size (including you)</span>
            <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full text-base bg-transparent outline-none text-arx-slate">
              {HOUSEHOLD_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block border-b border-arx-borders px-1 pt-5 pb-2 relative">
            <span className="absolute top-2 left-1 text-xs text-arx-body-copy">Annual household income</span>
            <input
              inputMode="numeric"
              value={formatIncome(incomeRaw)}
              onChange={(e) => setIncomeRaw(e.target.value.replace(/\D/g, ""))}
              className="w-full text-base bg-transparent outline-none text-arx-slate"
            />
          </label>
        </div>
        <div className="mt-8">
          <button
            onClick={confirm}
            disabled={!ready || checking}
            className="w-full bg-arx-action text-arx-on-action font-semibold py-4 rounded-lg flex items-center justify-center gap-3 hover:bg-arx-action-hover transition-colors disabled:opacity-40"
          >
            {checking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Running credit check…</span>
              </>
            ) : (
              <>
                <span>Confirm</span>
                <Check className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </EnrollmentShell>
    </main>
  );
}
