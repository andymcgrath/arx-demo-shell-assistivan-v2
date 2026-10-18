import type { FlowType } from "@/engine/types";
import { exitFor, forksForScenario } from "@/engine/workflow/forks";
import { ALL_FORKS } from "@/workflows/forks";
import { restartAtFork } from "@/shell/demos";

interface ForkButtonsProps {
  flowType: FlowType;
  /** `workflowData.choices` from the machine. */
  choices: Record<string, string> | undefined;
  /** Accent color for the buttons. */
  color: string;
}

/**
 * Branch buttons, drawn from the fork declarations in workflows/forks.ts. One button per exit of each
 * presenter-chosen fork that applies to the running scenario. The selected branch is solid. Clicking
 * another resets to the fork with that choice (shell/demos.ts, restartAtFork). A flow with no
 * presenter forks shows nothing.
 *
 * Replaces the hand-built CoA_DME coverage buttons and their React state.
 */
export default function ForkButtons({ flowType, choices, color }: ForkButtonsProps) {
  const forks = forksForScenario(ALL_FORKS, flowType).filter((f) => f.chooser === "presenter");
  if (!forks.length) return null;

  return (
    <div className="ml-auto flex items-center gap-2 self-center pr-2">
      {forks.map((fork) => {
        const selected = exitFor(fork, { choices: choices ?? {} }).id;
        return (
          <div key={fork.id} className="flex items-center gap-2">
            {forks.length > 1 && <span className="text-[11px] text-[#706e6b]">{fork.label}</span>}
            {fork.exits.map((exit) => {
              const active = exit.id === selected;
              return (
                <button
                  key={exit.id}
                  title={exit.description}
                  onClick={() => restartAtFork(fork, exit.id)}
                  className="px-3 py-1.5 rounded text-[12px] font-semibold transition-colors"
                  style={
                    active
                      ? { background: color, color: "#ffffff", border: `1px solid ${color}` }
                      : { background: "transparent", color, border: `1px solid ${color}` }
                  }
                >
                  {exit.label}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
