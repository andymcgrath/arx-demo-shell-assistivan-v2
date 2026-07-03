import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { usePatientStore } from "@/store/patientStore";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { MessageCircle } from "lucide-react";

export default function PhoneVerification() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const patientName = usePatientStore((s) => s.patientName);
  const phone = usePatientStore((s) => s.phone);
  const firstName = patientName.split(" ")[0];

  const [lastFourInput, setLastFourInput] = useState("");
  const [error, setError] = useState("");

  // Extract area code (middle 3 digits) and last 4 from phone number
  // Phone format: (555) 310-4200 → digits: 5553104200
  // Display: 310- (area code) + input for last 4 (4200)
  const phoneDigitsOnly = phone.replace(/\D/g, "");
  const actualLastFour = phoneDigitsOnly.slice(-4);
  const displayPrefix = phoneDigitsOnly.slice(3, 6); // Area code (positions 3-5)

  const isValidated = lastFourInput.length === 4 && lastFourInput === actualLastFour;
  const isDisabled = !isValidated;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setLastFourInput(value);

    // Clear error when user starts typing
    if (error && value) {
      setError("");
    }

    // Show error if user has entered 4 digits and they don't match
    if (value.length === 4 && value !== actualLastFour) {
      setError("Those digits don't match what we have on file. Please try again or contact support.");
    }
  };

  const handleSendCode = () => {
    if (isValidated) {
      dispatch('VERIFY_SMS', { portal: 'patient' });
      navigate("/otp-verification");
    }
  };

  return (
    <div className="bg-arx-neutral-100 px-4 py-4 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Step Indicator */}
        <p className="text-xs text-arx-inactive text-center mb-6 font-medium">
          Step 1 of 3
        </p>

        {/* Greeting */}
        <h1 className="text-4xl font-bold text-arx-slate text-center mb-2">
          Hi, {firstName}.
        </h1>

        {/* Subhead */}
        <p className="text-lg text-arx-body-copy text-center mb-6">
          Let's confirm it's you before we start.
        </p>

        {/* Phone Number Verification Section */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-arx-slate text-center mb-4">
            Enter the last 4 digits of your phone number beginning with {displayPrefix}
          </label>

          {/* Phone Number Input */}
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={lastFourInput}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isDisabled) {
                handleSendCode();
              }
            }}
            placeholder="0000"
            className="w-full px-4 py-4 text-4xl font-bold text-center border-2 border-arx-borders rounded-lg focus:outline-none focus:border-arx-primary focus:ring-2 focus:ring-arx-primary focus:ring-opacity-30 focus:ring-offset-1 transition-all placeholder:text-arx-inactive placeholder:opacity-40"
          />

          {/* Error Message */}
          {error && (
            <p className="text-xs text-arx-errors text-center mt-2 leading-relaxed">
              {error}
            </p>
          )}

          {/* Helper Text */}
          {isDisabled && !error && (
            <p className="text-xs text-arx-inactive text-center mt-3">
              Enter the last 4 digits to continue
            </p>
          )}
          {!isDisabled && !error && (
            <p className="text-xs text-arx-inactive text-center mt-3">
              We'll text a 6-digit code to confirm it's you.
            </p>
          )}
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleSendCode}
          disabled={isDisabled}
          className={`w-full font-semibold py-4 px-6 rounded-lg transition-all shadow-sm mb-6 ${
            isDisabled
              ? "bg-arx-primary/40 text-white cursor-not-allowed"
              : "bg-arx-primary text-white hover:bg-arx-primary-dark"
          }`}
        >
          Send code
        </button>

        {/* Support Link */}
        <p className="text-xs text-arx-inactive/70 text-center">
          Is this the right number?{" "}
          <button className="text-arx-links hover:underline font-medium">
            Get help
          </button>
        </p>
      </div>
    </div>
  );
}
