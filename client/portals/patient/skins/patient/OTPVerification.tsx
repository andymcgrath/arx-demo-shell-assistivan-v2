import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { ShieldCheck } from "lucide-react";
import TwoFactorShell from "./TwoFactorShell";
import OtpBoxes from "./OtpBoxes";

/** The code the patient view asks for. Eight digits, one box each (OtpBoxes). The default screen uses six. */
export const ENROLLMENT_CODE = "83145897";

/**
 * Patient-view enrollment code. Same events as pages/OTPVerification.tsx (VERIFY_OTP, then Confirm Details), with
 * boxed entry and the SMS-autofill bubble.
 */
export default function OTPVerification() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();

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
    if (code === ENROLLMENT_CODE) {
      setError("");
      dispatch("VERIFY_OTP", { portal: "patient" });
      navigate("/confirm-details");
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
      title="Enter your verification code"
      description="Please enter the 8-digit verification code provided to you by text message."
      backTo="/phone-verification"
    >
      <div className="max-w-sm mx-auto">
        <div className="mb-6">
          <OtpBoxes length={8} correctCode={ENROLLMENT_CODE} onSubmit={handleSubmit} resetSignal={resetSignal} />
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
