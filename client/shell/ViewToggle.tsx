import { cn } from "@/lib/utils";
import type { ViewId } from "@/brand/schema";
import type { ToggleOption } from "./view";

/** The Full / Patient switch in the shell header. It shows when a brand lists more than one view. */
export default function ViewToggle({ options, onChange }: { options: ToggleOption[]; onChange: (view: ViewId) => void }) {
  return (
    <div className="flex items-center rounded overflow-hidden border border-white/20" role="group" aria-label="View">
      {options.map(({ id, label, active }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={active}
          className={cn(
            "px-2.5 h-7 text-[11px] font-medium transition-colors",
            active ? "bg-indigo-500 text-white" : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
