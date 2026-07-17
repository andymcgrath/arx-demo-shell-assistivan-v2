import { HeartHandshake } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";

/**
 * PAP No Insurance Card — Fax_PAP_Audit (WF2) only. Shown on Home
 * (Index.tsx) once the patient has verified the Application Update SMS/OTP
 * code (papOtpVerified) but hasn't yet started the eIncome check
 * (incomeStatus === 'none') — see WorkflowEngine.ts's Fax_PAP_Audit branch.
 *
 * Previously PapUpdateOtp.tsx navigated straight to /income-qualification
 * the moment the code was verified. That skipped explaining *why* the
 * patient was being asked for income info — this card fills that gap: BI
 * found no active coverage, but that may make them eligible for the
 * Patient Assistance Program instead. Tapping "Enroll" dispatches
 * START_INCOME_QUALIFICATION (incomeStatus 'none' -> 'pending'), which is
 * what actually unlocks /income-qualification.
 */
export default function PapNoInsuranceCard() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-arx-borders">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold leading-snug text-arx-slate">
          We couldn't confirm active insurance coverage
        </h2>
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-arx-primary">
          <HeartHandshake className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-arx-body-copy">
        <p>
          We checked, but weren't able to find active insurance coverage on file for this
          medication. This doesn't mean you're out of options.
        </p>
        <p>
          There's good news: You may qualify for our Patient Assistance Program, which can
          provide this medication at no cost. Checking your eligibility takes just a couple of
          minutes.
        </p>
      </div>

      <button
        onClick={() => {
          dispatch("START_INCOME_QUALIFICATION", { portal: "patient" });
          navigate("/income-qualification");
        }}
        className="mt-5 w-full text-white font-semibold py-3.5 rounded-lg transition-colors bg-arx-primary hover:bg-arx-primary-dark"
      >
        Get Started
      </button>
    </div>
  );
}
