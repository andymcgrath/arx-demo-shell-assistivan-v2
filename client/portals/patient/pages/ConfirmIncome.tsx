import { useState } from "react";
import { Check } from "lucide-react";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/portals/patient/components/enrollment/EnrollmentShell";
import { usePatientStore } from "@/store/patientStore";

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
  const ready = size !== "" && incomeRaw !== "";

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
            onClick={() => dispatch("CONFIRM_INCOME", { portal: "patient", householdSize: size, householdIncome: incomeRaw })}
            disabled={!ready}
            className="w-full bg-arx-action text-arx-on-action font-semibold py-4 rounded-lg flex items-center justify-center gap-3 hover:bg-arx-action-hover transition-colors disabled:opacity-40"
          >
            <span>Confirm</span>
            <Check className="w-5 h-5" />
          </button>
        </div>
      </EnrollmentShell>
    </main>
  );
}
