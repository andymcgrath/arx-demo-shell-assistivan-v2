import { useState } from "react";
import { useNavigate } from "@/lib/portalRouter";
import { usePatientStore } from "@/store/patientStore";
import { useWorkflowDispatch } from "@/engine/WorkflowProvider";
import { Smartphone } from "lucide-react";
import TwoFactorShell from "./TwoFactorShell";

/**
 * Patient-view phone check. Same check and events as pages/PhoneVerification.tsx (the last 4 digits of the number on
 * file, then VERIFY_SMS), in the shared two-factor frame.
 */
export default function PhoneVerification() {
  const navigate = useNavigate();
  const dispatch = useWorkflowDispatch();
  const patientName = usePatientStore((s) => s.patientName);
  const phone = usePatientStore((s) => s.phone);
  const firstName = patientName.split(" ")[0];

  const [lastFourInput, setLastFourInput] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  // Phone format: (555) 310-4200 → digits 5553104200. The screen shows the middle three and asks for the last four.
  const phoneDigitsOnly = phone.replace(/\D/g, "");
  const actualLastFour = phoneDigitsOnly.slice(-4);
  const displayPrefix = phoneDigitsOnly.slice(3, 6);

  const isValidated = lastFourInput.length === 4 && lastFourInput === actualLastFour;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setLastFourInput(value);
    if (error && value) setError("");
    if (value.length === 4 && value !== actualLastFour) {
      setError("Those digits don't match what we have on file. Please try again or contact support.");
    }
  };

  const handleSendCode = () => {
    if (!isValidated) return;
    dispatch("VERIFY_SMS", { portal: "patient" });
    navigate("/otp-verification");
  };

  // Presenter shortcut, same as the default screen: "Get help" looks like a support link and fills in the real digits.
  const handleGetHelp = () => {
    setLastFourInput(actualLastFour);
    setError("");
  };

  return (
    <TwoFactorShell
      icon={<Smartphone className="w-5 h-5" aria-hidden="true" />}
      title={`Hi, ${firstName}.`}
      description={
        <>
          Let's <span className="font-semibold text-arx-slate">confirm it's you</span> before we start. We'll text an
          8-digit code to your mobile.
        </>
      }
      backTo="/sms-message"
    >
      <div className="max-w-sm mx-auto">
        <p className="text-xs text-arx-inactive text-center mb-4 font-medium">Step 1 of 3</p>

        <label htmlFor="last-four" className="block text-sm font-semibold text-arx-slate mb-2">
          Enter the last 4 digits of your phone number beginning with {displayPrefix}
        </label>
        <input
          id="last-four"
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={lastFourInput}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
          placeholder="0000"
          className="w-full px-4 py-3 rounded-lg text-xl font-semibold tracking-widest text-arx-slate outline-none transition-colors placeholder:text-arx-inactive placeholder:opacity-40 border-[1.5px]"
          style={{ borderColor: focused ? "hsl(var(--arx-primary))" : "hsl(var(--arx-borders))" }}
        />

        {error && <p className="text-xs text-arx-errors mt-2 leading-relaxed">{error}</p>}

        <button
          onClick={handleSendCode}
          disabled={!isValidated}
          className={`w-full font-semibold py-4 mt-6 rounded-full transition-colors ${
            isValidated
              ? "bg-arx-action text-arx-on-action hover:bg-arx-action-hover"
              : "bg-arx-borders text-arx-inactive cursor-not-allowed"
          }`}
        >
          Get verification code
        </button>

        <p className="text-xs text-arx-inactive/70 text-center mt-6">
          Is this the right number?{" "}
          <button onClick={handleGetHelp} className="text-arx-links hover:underline font-medium">
            Get help
          </button>
        </p>
      </div>
    </TwoFactorShell>
  );
}
