import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowActor, useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { derivePatientRoute } from "@/engine/WorkflowEngine";
import TwoFactorShell from "./TwoFactorShell";
import OtpBoxes from "./OtpBoxes";

/** The re-check code the patient view asks for. Eight digits, one box each. The default screen uses six. */
export const PA_APPROVED_CODE = "20439761";

/**
 * Patient-view PA-approved re-check. Same events and next screen as pages/PaApprovedOtp.tsx
 * (VERIFY_PA_APPROVED_OTP, then wherever the workflow sends the patient), with boxed entry.
 */
export default function PaApprovedOtp() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const actor = useWorkflowActor();

  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = (code: string) => {
    if (code === PA_APPROVED_CODE) {
      setError("");
      dispatch("VERIFY_PA_APPROVED_OTP", { portal: "patient" });
      // The workflow decides what follows the code (pricing menu, network pharmacy pick, transfer confirmation).
      // The screens that follow are sticky, so state-driven navigation would not move the patient off a wrong guess.
      navigate(derivePatientRoute(actor.getSnapshot().context));
    } else {
      setError("That code didn't match. Please try again or request a new one.");
      setResetSignal((n) => n + 1);
    }
  };

  const handleResendCode = () => {
    setError("");
    setResendCooldown(30);
    setResetSignal((n) => n + 1);
  };

  return (
    <TwoFactorShell
      icon={<ShieldCheck className="w-5 h-5" aria-hidden="true" />}
      title="Confirm it's you"
      description="We sent a new 8-digit code to your mobile."
      backTo="/pa-approved-sms"
    >
      <div className="max-w-sm mx-auto">
        <div className="mb-6">
          <OtpBoxes length={8} correctCode={PA_APPROVED_CODE} onSubmit={handleSubmit} resetSignal={resetSignal} />
        </div>

        {error && <p className="text-xs text-arx-errors text-center mb-4 leading-relaxed">{error}</p>}

        <div className="text-center">
          <button
            onClick={handleResendCode}
            disabled={resendCooldown > 0}
            className="text-arx-links hover:underline font-medium text-sm disabled:text-arx-inactive disabled:cursor-not-allowed transition-colors"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </TwoFactorShell>
  );
}
