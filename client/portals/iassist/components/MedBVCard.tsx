/**
 * MedBVCard: the Medical benefit verification card on the Insurance step (Buy and Bill). "Run eMedBV" shows a short
 * progress bar (about 2.7 seconds) and then hands off to the results. Once it has run, the card shows a check and a
 * one-line summary, so the viewer sees the answer without opening the results.
 */
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { medbvHeadline, medbvSummary } from "../data/medbvResult";

const STEPS = ["Verifying patient and insurance", "Submitting to eMedBV", "Retrieving results"];
const STEP_MS = 900;

export default function MedBVCard({
  done,
  covered = true,
  canRun,
  onRun,
  onViewResults,
}: {
  done: boolean;
  /** False when the BI pick in the story is no coverage. */
  covered?: boolean;
  canRun: boolean;
  /** Fires when the progress finishes. The parent sends RUN_MEDBV. */
  onRun: () => void;
  onViewResults: () => void;
}) {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (step === null) return;
    if (step >= STEPS.length) {
      onRun();
      setStep(null);
      onViewResults();
      return;
    }
    const t = setTimeout(() => setStep(step + 1), STEP_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const running = step !== null && step < STEPS.length;

  return (
    <section className="bg-white rounded-xl p-6 space-y-3" style={{ boxShadow: "0 0 10px 0 rgba(196,196,196,0.3)" }}>
      <h2 className="text-base font-semibold text-[#1D1D1D] flex items-center gap-2.5">
        {done && <CheckCircle2 size={24} strokeWidth={2.25} className="text-[#007178] flex-shrink-0" />}
        Medical benefit verification
      </h2>

      {done ? (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-[#1D1D1D]">{medbvHeadline(covered)}</p>
            <p className="text-sm text-[#6F7276]">{medbvSummary(covered)}</p>
          </div>
          <button type="button" onClick={onViewResults} className="text-sm font-semibold text-[#007178] hover:underline flex-shrink-0">
            View results
          </button>
        </div>
      ) : running ? (
        <div className="space-y-2" aria-live="polite">
          <p className="text-sm text-[#1D1D1D]">{STEPS[step!]}...</p>
          <div className="h-2 rounded-full bg-[#E8E8E8] overflow-hidden">
            <div className="h-full bg-[#007178] transition-all ease-linear" style={{ width: `${((step! + 1) / STEPS.length) * 100}%`, transitionDuration: `${STEP_MS}ms` }} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#6F7276]">{canRun ? "Run eMedBV to check the patient's medical benefit." : "Select or add the patient's insurance to run eMedBV."}</p>
          <button
            type="button"
            disabled={!canRun}
            onClick={() => setStep(0)}
            className="bg-[#007178] text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-[#03656B] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run eMedBV
          </button>
        </div>
      )}
    </section>
  );
}
