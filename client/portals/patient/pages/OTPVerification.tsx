import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { usePatientStore } from "@/store/patientStore";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { MessageCircle } from "lucide-react";

export default function OTPVerification() {
  const navigate = useNavigate();
  const patientName = usePatientStore((s) => s.patientName);
  const dispatch = useWorkflowDispatch();
  const firstName = patientName.split(" ")[0];

  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Mock OTP for demo
  const correctOTP = "314589";

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpInput(value);

    // Clear error when user starts typing
    if (error && value) {
      setError("");
    }
  };

  const validateAndSubmit = (code: string) => {
    if (code === correctOTP) {
      dispatch('VERIFY_OTP', { portal: 'patient' });
      navigate("/confirm-details");
    } else {
      setError("That code didn't match. Please try again or request a new one.");
      setOtpInput("");
    }
  };

  const handleResendCode = () => {
    setOtpInput("");
    setError("");
    setResendCount(resendCount + 1);
    setResendCooldown(30);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length === 6) {
      setIsVerifying(true);
      validateAndSubmit(otpInput);
      setIsVerifying(false);
    } else {
      setError("Please enter all 6 digits.");
    }
  };

  return (
    <div className="bg-arx-neutral-100 px-4 py-4 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo Placeholder */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-arx-primary to-arx-secondary flex items-center justify-center text-white font-bold text-lg">
            <MessageCircle size={36} />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-arx-slate text-center mb-2">
          Check your texts
        </h1>

        {/* Subhead */}
        <p className="text-lg text-arx-body-copy text-center mb-8">
          We sent a 6-digit code to your mobile.
        </p>

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          {/* OTP Input */}
          <label
            onClick={() => setOtpInput(correctOTP)}
            className="block text-sm font-semibold text-arx-slate text-center mb-4 cursor-pointer"
          >
            Enter the code
          </label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpInput}
            onChange={handleInputChange}
            placeholder="••••••"
            className="w-full px-4 py-4 text-4xl font-bold text-center tracking-widest border-2 border-arx-borders rounded-lg focus:outline-none focus:border-arx-primary focus:ring-2 focus:ring-arx-primary focus:ring-opacity-20 transition-colors mb-3"
          />

          {/* Error Message */}
          {error && (
            <p className="text-xs text-arx-errors text-center mb-3 leading-relaxed">
              {error}
            </p>
          )}

          {/* Helper Text */}
          <p className="text-xs text-arx-inactive text-center mb-6">
            It may take a moment to arrive.
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={otpInput.length < 6 || isVerifying}
            className={`w-full font-semibold py-4 px-6 rounded-lg transition-all shadow-sm relative overflow-hidden ${
              isVerifying
                ? "bg-arx-primary text-white cursor-not-allowed animate-pulse"
                : otpInput.length < 6
                ? "bg-arx-inactive text-white cursor-not-allowed opacity-50"
                : "bg-arx-primary text-white hover:bg-arx-primary-dark"
            }`}
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce" />
                Verifying...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>

        {/* Resend Code Link */}
        <div className="text-center border-t border-arx-borders pt-6">
          <p className="text-xs text-arx-inactive mb-3">
            Didn't get a code?
          </p>
          <button
            onClick={handleResendCode}
            disabled={resendCooldown > 0}
            className="text-arx-links hover:underline font-medium text-sm disabled:text-arx-inactive disabled:cursor-not-allowed transition-colors"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
          </button>
        </div>

        {/* Support */}
        <p className="text-xs text-arx-inactive text-center mt-6">
          Need help?{" "}
          <button className="text-arx-links hover:underline font-medium">
            Contact support
          </button>
        </p>
      </div>
    </div>
  );
}
