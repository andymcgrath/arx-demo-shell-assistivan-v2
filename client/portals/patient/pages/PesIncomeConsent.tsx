import { FileSignature, ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import EnrollmentShell from "@/components/enrollment/EnrollmentShell";
import YesNoToggle from "@/components/enrollment/YesNoToggle";
import SignatureField from "@/components/enrollment/SignatureField";
import { usePresPapStore } from "@/store/presPapStore";

const INCOME_CONSENT = `By signing and dating below, I, the applicant named above, understand that I am providing authorization under applicable law to obtain information regarding my income and financial status. I authorize the collection of financial information from my credit profile or other sources for the purpose of determining financial eligibility for the patient assistance program. I understand that I may cancel this Authorization at any time by submitting a written request, but that this cancellation will not apply to any information already used or disclosed through this Authorization.`;

/**
 * WF5 (PrES_PAP) income-verification consent — ported from
 * arx-pes-prototype-omniplan's IncomeVerificationConsent.tsx. Shown once BI
 * comes back (mirrors WF2's pap-update-sms/otp beat, but as a single typed
 * e-signature step instead of a second SMS/OTP round).
 *
 * On Continue, fires START_INCOME_QUALIFICATION — the same event
 * PapNoInsuranceCard fires for WF2 — flipping incomeStatus 'none' -> 'pending'.
 */
export default function PesIncomeConsent() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const incomeConsent = usePresPapStore((s) => s.incomeConsent);
  const incomeSignature = usePresPapStore((s) => s.incomeSignature);
  const setField = usePresPapStore((s) => s.setField);

  const canContinue = incomeConsent === "Yes" && incomeSignature.trim();

  function handleContinue() {
    if (!canContinue) return;
    dispatch("START_INCOME_QUALIFICATION", { portal: "patient" });
    navigate("/pes-income-submission");
  }

  return (
    <main className="flex-grow">
      <EnrollmentShell icon={<FileSignature className="w-7 h-7" />} title="Income Verification Consent" stepsFilled={1} stepsTotal={3} wide>
        <p className="text-sm text-arx-body-copy mb-5">
          Please provide your consent to continue the enrollment.
        </p>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-arx-slate">Authorization for Electronic Income Verification</p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-arx-borders bg-arx-neutral-100 p-3 text-xs leading-relaxed text-arx-body-copy">
            {INCOME_CONSENT}
          </div>

          <label className="text-sm font-bold text-arx-slate">Do you agree to this consent?</label>
          <YesNoToggle name="incomeConsent" value={incomeConsent} onChange={(v: "Yes" | "No") => setField("incomeConsent", v)} />

          <SignatureField
            label="Type Signature"
            value={incomeSignature}
            onChange={(v: string) => setField("incomeSignature", v)}
            placeholder="Input legal representative name here"
            disclaimer="My signature certifies that I have read and understand the above statement, and agree to the outlined terms."
          />

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
