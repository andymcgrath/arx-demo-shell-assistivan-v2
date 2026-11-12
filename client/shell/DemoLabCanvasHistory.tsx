import { useState } from "react";
import { useDraft } from "./DemoLabDraft";
import { INK, LINE, MUTED } from "./DemoLabCanvasParts";

/** Undo, Redo, Reset, and the change history. Every edit on the canvas is one entry. Reset is one more entry, so it can be undone. */

const btn = "rounded border bg-white px-2 py-0.5 text-xs font-semibold text-black disabled:opacity-60";

export function EditTools() {
  const { history, undo, redo, reset, jumpTo, dirty } = useDraft();
  const [open, setOpen] = useState(false);
  const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
  return (
    <div className="relative flex flex-wrap items-center gap-1" role="toolbar" aria-label="Edit tools">
      <button type="button" className={btn} style={{ borderColor: LINE }} disabled={!history.canUndo} onClick={undo}>Undo</button>
      <button type="button" className={btn} style={{ borderColor: LINE }} disabled={!history.canRedo} onClick={redo}>Redo</button>
      <button type="button" className={btn} style={{ borderColor: LINE }} disabled={!dirty} onClick={reset} title="Go back to the draft as loaded. You can undo it.">Reset</button>
      <button type="button" className={btn} style={{ borderColor: open ? INK : LINE }} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        History ({history.entries.length - 1})
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-72 w-72 overflow-y-auto rounded border bg-white p-2 shadow" style={{ borderColor: INK }} data-testid="canvas-history" aria-label="Change history">
          <p className="mb-1 text-[11px]" style={{ color: MUTED }}>Newest first. Pick a line to go back to that point. Edits after it stay available with Redo until you make a new change.</p>
          <ol className="space-y-1">
            {history.entries.map((e, i) => ({ e, i })).reverse().map(({ e, i }) => (
              <li key={i}>
                <button type="button" onClick={() => jumpTo(i)} aria-current={i === history.pos} className="w-full rounded border px-2 py-1 text-left text-xs" style={{ borderColor: i === history.pos ? INK : LINE, background: i === history.pos ? INK : i > history.pos ? "#f1f5f9" : "#ffffff", color: i === history.pos ? "#ffffff" : i > history.pos ? MUTED : INK }}>
                  <span className="block font-semibold">{e.label}</span>
                  <span className="block text-[10px] opacity-80">{time(e.at)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
