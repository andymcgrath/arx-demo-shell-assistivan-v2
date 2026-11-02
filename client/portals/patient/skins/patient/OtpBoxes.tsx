import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";

/**
 * Shared boxed verification-code input — one bordered square per digit,
 * used by both OTPVerification.tsx (enrollment) and PaApprovedOtp.tsx
 * (post-PA-approval re-check). Replaces each screen's old single free-text
 * <input maxLength={n}>. Extracted as a real shared component (not
 * copy-pasted, unlike most one-off UI in this codebase) because both
 * screens need identical behavior: auto-advancing focus between boxes, and
 * the simulated SMS-autofill bubble.
 *
 * The bubble appears the moment ANY box is focused (clicking box 3 shows it
 * just as clicking box 1 would) — tapping it fills every box with the code,
 * then pauses briefly before calling onSubmit, so the reviewer actually sees
 * the code land before the screen advances (mirrors a real autofill tap).
 * Manually typing the last digit calls onSubmit immediately, same as any
 * ordinary OTP field.
 */
interface OtpBoxesProps {
  length: number;
  correctCode: string;
  onSubmit: (code: string) => void;
  /** Bumped by the parent (e.g. new random value) to clear all boxes — used after a failed manual attempt. */
  resetSignal?: number;
}

export default function OtpBoxes({ length, correctCode, onSubmit, resetSignal }: OtpBoxesProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [showBubble, setShowBubble] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDigits(Array(length).fill(""));
    setShowBubble(false);
    setIsAutofilling(false);
    // Only steal focus (and thus trigger the bubble) on a real reset —
    // e.g. after a wrong code or a resend. Skip it on initial mount, so the
    // bubble stays hidden until the patient actually taps into a box
    // themselves, rather than appearing the instant the screen loads.
    if (resetSignal) inputRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const handleBoxChange = (i: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    setShowBubble(false);

    if (char && i < length - 1) {
      inputRefs.current[i + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      onSubmit(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handleBoxFocus = () => {
    if (!isAutofilling) setShowBubble(true);
  };

  // Fills every box with the real code, then pauses so the reviewer sees
  // it land before the screen advances (2s, per the requested behavior) —
  // not instant, so the "autofill" reads as a real event rather than a
  // silent skip-ahead.
  const handleAutofillTap = () => {
    setShowBubble(false);
    setIsAutofilling(true);
    setDigits(correctCode.split(""));
    inputRefs.current[length - 1]?.blur();
    setTimeout(() => {
      setIsAutofilling(false);
      onSubmit(correctCode);
    }, 2000);
  };

  return (
    <div className="relative">
      <div className="flex justify-center gap-2">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i]}
            disabled={isAutofilling}
            onChange={(e) => handleBoxChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={handleBoxFocus}
            className="w-[34px] h-11 text-lg font-bold text-center border-2 border-arx-borders rounded-lg text-arx-slate focus:outline-none focus:border-arx-primary focus:ring-2 focus:ring-arx-primary focus:ring-opacity-20 transition-colors disabled:opacity-70"
          />
        ))}
      </div>

      {/* Simulated SMS-autofill suggestion bubble */}
      <div
        className={`absolute left-1/2 top-full z-20 transition-all duration-150 ${
          showBubble ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
        style={{ marginTop: "10px", transform: "translateX(-50%)" }}
      >
        <div className="relative">
          <div
            className="absolute w-3 h-3 bg-white border-l border-t border-arx-borders"
            style={{ top: -6, left: "50%", transform: "translateX(-50%) rotate(45deg)" }}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={handleAutofillTap}
            className="relative flex items-center gap-2.5 bg-white border border-arx-borders rounded-xl shadow-lg px-4 py-2.5 hover:bg-arx-background transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-4 h-4 text-arx-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-left">
              <span className="block text-base font-bold text-arx-slate tracking-wider leading-none">
                {correctCode}
              </span>
              <span className="block text-[10px] text-arx-inactive leading-none mt-1">from Messages</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
