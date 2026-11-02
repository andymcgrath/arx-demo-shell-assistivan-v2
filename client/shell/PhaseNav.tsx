import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { nextStep } from "./guidedNav";
import { stageAt } from "./stageAt";
import { stageList } from "./stageJump";
import { useStageJump } from "./useStageJump";
import { useTriggerRows } from "./useTriggerRows";

/**
 * The patient view's phase rail, for a client driving the demo alone. It lists the scenario's stages, marks where the case
 * is, and says what to do next. Next sends the back-office step that moves the case on, or says which screen to use on the
 * phone when the next thing is the patient's own tap. Back and a click on a stage jump through the same replay the header's
 * stage menu uses. Everything it shows is read from the workflow: the stage list (shell/stageJump.ts), the stage the case
 * is on (shell/stageAt.ts), and the step Next takes (shell/guidedNav.ts).
 */
export default function PhaseNav() {
  const { data, rows, fire } = useTriggerRows();
  const jump = useStageJump();
  const stages = useMemo(() => stageList(data.flowType, data.choices), [data.flowType, data.choices]);
  const at = stageAt(data.flowType, data.choices, data);
  const next = nextStep(data.flowType, data, rows);

  const label = next.kind === "fire" ? `Next: ${next.row.label}` : next.kind === "done" ? "Journey complete" : next.hint;

  return (
    <aside aria-label="Your journey" className="w-[280px] shrink-0 bg-[#0f172a] border-r border-white/10 flex flex-col overflow-y-auto">
      <div className="px-5 pt-5 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
          Stage {at} of {stages.length}
        </p>
        <h2 className="text-lg font-bold text-white">Your journey</h2>
      </div>

      <ol className="px-4 flex-1">
        {stages.map(({ stage, label: name }) => {
          const done = stage < at;
          const current = stage === at;
          return (
            <li key={stage}>
              <button
                onClick={() => !current && jump(stage)}
                aria-current={current ? "step" : undefined}
                title={current ? undefined : `Jump to ${name}`}
                className={cn(
                  "w-full flex items-center gap-3 text-left rounded-lg px-2 py-2 transition-colors",
                  current ? "bg-white/10" : "hover:bg-white/5",
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold border",
                    done && "bg-indigo-400 border-indigo-400 text-[#0f172a]",
                    current && "bg-white border-white text-[#0f172a]",
                    !done && !current && "border-white/25 text-white/40",
                  )}
                >
                  {done ? <Check size={14} aria-hidden="true" /> : stage}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[13px] leading-tight", current ? "font-semibold text-white" : done ? "text-white/70" : "text-white/45")}>{name}</span>
                  {current && <span className="block text-[11px] text-indigo-300">You are here</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="px-5 py-4 border-t border-white/10 space-y-3">
        <p className="text-[12px] text-white/70 leading-snug" aria-live="polite">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => jump(at - 1)}
            disabled={at <= 1}
            className="flex items-center gap-1 text-[12px] font-medium rounded-md px-3 py-1.5 border border-white/20 bg-white/5 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={13} aria-hidden="true" />
            Back
          </button>
          <button
            onClick={() => next.kind === "fire" && fire(next.row)}
            disabled={next.kind !== "fire"}
            className="flex items-center gap-1 text-[12px] font-semibold rounded-md px-3 py-1.5 bg-indigo-400 text-[#0f172a] transition-colors hover:bg-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
