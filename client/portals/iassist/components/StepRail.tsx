/**
 * StepRail — persistent 6-icon vertical step indicator for the iAssist
 * eRx case-creation wizard (Patient → Med Details → Insurance → Clinical →
 * PA → Rx), matching the left rail shown in every step of the Figma spec.
 *
 * Pure presentational component — case-creation state lives in each step
 * page, not here. This has no dependency on the shared workflow machine,
 * so it can't affect WF1/WF2/WF3 isolation.
 */
import { User, Pill, CreditCard, ClipboardList, ShieldCheck, FileText, type LucideIcon } from "lucide-react";

export type CaseStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { step: CaseStep; label: string; Icon: LucideIcon }[] = [
  { step: 1, label: "Patient", Icon: User },
  { step: 2, label: "Medication Details", Icon: Pill },
  { step: 3, label: "Insurance", Icon: CreditCard },
  { step: 4, label: "Clinical", Icon: ClipboardList },
  { step: 5, label: "Prior Authorization", Icon: ShieldCheck },
  { step: 6, label: "Rx", Icon: FileText },
];

export default function StepRail({ current }: { current: CaseStep }) {
  return (
    <nav
      aria-label="Case creation steps"
      className="flex sm:flex-col items-center gap-3 sm:gap-4 py-4 sm:py-6 px-2 sm:px-3 bg-white border-r border-[#E8E8E8] flex-shrink-0"
    >
      {STEPS.map(({ step, label, Icon }) => {
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div
            key={step}
            title={label}
            aria-current={isActive ? "step" : undefined}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isActive
                ? "bg-[#007178] text-white"
                : isDone
                ? "bg-[#EEF9F9] text-[#007178]"
                : "bg-[#F0F0F0] text-[#C4C4C4]"
            }`}
          >
            <Icon size={16} />
          </div>
        );
      })}
    </nav>
  );
}
