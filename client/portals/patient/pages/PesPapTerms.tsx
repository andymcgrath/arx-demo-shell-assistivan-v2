import { ClipboardCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";
import YesNoToggle from "@/components/enrollment/YesNoToggle";
import { usePresPapStore } from "@/store/presPapStore";
import { PROGRAM } from "@/config/branding";

const PAP_TERMS = `${PROGRAM.name} Patient Assistance Program — Terms and Conditions

- The Patient Assistance Program is not health insurance and is available for uninsured and underinsured patients only.
- Patient must be of legal age to participate in this program.
- The patient's diagnosis must be for an FDA-approved or FDA-authorized indication.
- Participants must meet eligibility requirements including income guidelines and residency status.
- All information provided in this application must be accurate and truthful.
- Program benefits are subject to change at any time without notice.
- By participating in this program, you acknowledge you have read and agree to these terms and conditions.`;

/**
 * WF5 (PrES_PAP) PAP terms agreement — ported from
 * arx-pes-prototype-omniplan's USGPAP.tsx, the final gate before enrollment
 * is considered complete.
 *
 * On Continue, fires VERIFY_INCOME — the same event WF2's eIncome check
 * fires — which is what flips incomeStatus 'verified', papStatus 'active',
 * and opens dispatch. Everything downstream (delivery address/date,
 * dispatch, order tracking) reuses WF2's existing screens unchanged.
 */
export default function PesPapTerms() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const agreePAPTerms = usePresPapStore((s) => s.agreePAPTerms);
  const setField = usePresPapStore((s) => s.setField);

  const canContinue = agreePAPTerms === "Yes";

  function handleContinue() {
    if (!canContinue) return;
    dispatch("VERIFY_INCOME", { portal: "patient" });
    navigate("/delivery-address");
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell icon={<ClipboardCheck className="w-7 h-7" />} title={`${PROGRAM.name} Patient Assistance Program`} stepsFilled={3} stepsTotal={3}>
        <p className="text-sm text-arx-body-copy mb-5">
          Please review and agree to the program terms and conditions to continue the enrollment.
        </p>

        <div className="flex flex-col gap-4">
          <div className="max-h-56 overflow-y-auto rounded-lg border border-arx-borders bg-arx-neutral-100 p-3 text-xs leading-relaxed text-arx-body-copy whitespace-pre-line">
            {PAP_TERMS}
          </div>

          <label className="text-sm font-bold text-arx-slate">
            I agree with the program terms, conditions, and requirements that apply.
          </label>
          <YesNoToggle name="agreePAPTerms" value={agreePAPTerms} onChange={(v: "Yes" | "No") => setField("agreePAPTerms", v)} />

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full font-semibold py-4 rounded-lg flex items-center justify-center gap-2 mt-2 transition-colors ${
              canContinue ? "bg-arx-primary text-white hover:bg-arx-primary-dark" : "bg-arx-borders text-arx-inactive cursor-not-allowed"
            }`}
          >
            <span>Continue</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </EnrollmentShell>
    </main>
  );
}
