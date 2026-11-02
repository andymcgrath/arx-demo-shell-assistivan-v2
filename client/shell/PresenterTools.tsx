import { useState } from "react";
import { Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import TriggerPanel from "./TriggerPanel";

/**
 * The patient view's presenter tools, off until a salesperson turns them on. The view is handed to a client, who uses the
 * phase rail's Next. A salesperson running it live can switch this on to reach every step directly.
 */
export default function PresenterTools() {
  const [on, setOn] = useState(false);
  return (
    <>
      {on && <TriggerPanel />}
      <button
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        title="Presenter tools"
        className={cn(
          "flex items-center gap-1.5 h-7 px-2.5 rounded border text-[11px] font-medium transition-colors",
          on ? "border-indigo-400 bg-indigo-500 text-white" : "border-white/20 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white",
        )}
      >
        <Presentation size={12} />
        Presenter
      </button>
    </>
  );
}
