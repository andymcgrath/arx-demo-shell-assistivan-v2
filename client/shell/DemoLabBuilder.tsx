import { useState } from "react";
import { BRAND } from "@/brand";
import type { DemoRequest } from "@/workflows/catalog/request";
import {
  addBlock, addDemo, addGhost, blankDraft, draftFromScenario, editorProblems, EDITOR_WORKFLOWS, exportable, moveCard, removeCard,
  removeDemo, setPick, toggleFork, updateCard, updateDemo, type EditorWorkflow,
} from "@/workflows/catalog/editor";
import { useItems } from "./DemoLabItems";
import { CardList, ForkCards, Palette } from "./DemoLabBuilderPanels";

/**
 * Demo Lab, Builder tab. Build a demo request from the block palette, mark what is new with ghost cards, pick each
 * outcome per demo, and export. Export is blocked until the draft has no problems. The only write is the dev endpoint
 * (POST /__demo-lab/export), which puts two files under docs/demos/.
 */

const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#cbd5e1";
const field = "w-full rounded border px-2 py-1 text-sm";
const WORKFLOW_LABEL: Record<EditorWorkflow, string> = { iassist: "iAssist", coassist: "CoAssist" };

type Exported = { ok: true; written: string[] } | { ok: false; problems: string[] };

export default function Builder() {
  const items = useItems();
  const ready = items.filter((i) => i.group !== "Whole demos (no recipe yet)");
  const [draft, setDraft] = useState<DemoRequest>(() => blankDraft("iassist", BRAND.slug));
  const [active, setActive] = useState(0);
  const [start, setStart] = useState("blank:iassist");
  const [result, setResult] = useState<Exported>();
  const [busy, setBusy] = useState(false);

  const edit = (fn: (d: DemoRequest) => DemoRequest) => {
    setResult(undefined);
    setDraft(fn);
  };
  const problems = editorProblems(draft);
  const set = <K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) => edit((d) => ({ ...d, [key]: value }));

  const begin = () => {
    const [kind, rest] = start.split(/:(.*)/s);
    setActive(0);
    setResult(undefined);
    if (kind === "blank") return setDraft(blankDraft(rest as EditorWorkflow, BRAND.slug));
    const item = items.find((i) => i.key === start);
    const next = item && draftFromScenario(item.flow, { title: item.title, client: BRAND.slug, choices: item.choices });
    if (next) setDraft(next);
  };

  const send = async () => {
    setBusy(true);
    try {
      const res = await fetch("/__demo-lab/export", { method: "POST", body: JSON.stringify(exportable(draft)) });
      const json = await res.json();
      setResult(res.ok ? { ok: true, written: json.written } : { ok: false, problems: json.problems ?? ["The export failed."] });
    } catch (e) {
      setResult({ ok: false, problems: [(e as Error).message] });
    } finally {
      setBusy(false);
    }
  };

  const demo = draft.demos[active] ?? draft.demos[0];

  return (
    <div className="flex min-h-0 flex-1">
      <Palette draft={draft} onAdd={(c) => edit((d) => addBlock(d, c))} onGhost={() => edit(addGhost)} />

      <main className="min-w-0 flex-1 overflow-y-auto p-5">
        <section className="mb-5 flex flex-wrap items-end gap-2 rounded border bg-white p-3" style={{ borderColor: LINE }} aria-label="Start from">
          <label className="text-xs font-semibold">
            Start from
            <select className={field} style={{ borderColor: LINE }} value={start} onChange={(e) => setStart(e.target.value)}>
              {EDITOR_WORKFLOWS.map((w) => <option key={w} value={`blank:${w}`}>Blank {WORKFLOW_LABEL[w]} demo</option>)}
              {[...new Set(ready.map((i) => i.group))].map((g) => (
                <optgroup key={g} label={g}>
                  {ready.filter((i) => i.group === g).map((i) => <option key={i.key} value={i.key}>{i.title}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <button type="button" onClick={begin} className="rounded border px-3 py-1 text-sm font-semibold" style={{ borderColor: INK }}>
            Start over from this
          </button>
          <p className="text-xs" style={{ color: MUTED }}>Replaces the draft. Nothing is saved until you export.</p>
        </section>

        <section className="mb-5 grid max-w-3xl grid-cols-2 gap-3" aria-label="Request">
          <label className="col-span-2 text-xs font-semibold">
            Title
            <input className={field} style={{ borderColor: LINE }} value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Client (folder name)
            <input className={field} style={{ borderColor: LINE }} value={draft.client} onChange={(e) => set("client", e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Request name (file name)
            <input className={field} style={{ borderColor: LINE }} value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Intake channel
            <select className={field} style={{ borderColor: LINE }} value={draft.intake} onChange={(e) => set("intake", e.target.value as DemoRequest["intake"])}>
              <option value="erx">eRx</option>
              <option value="fax">Fax</option>
              <option value="esign">E-sign</option>
            </select>
          </label>
          <label className="col-span-2 text-xs font-semibold">
            Win theme
            <input className={field} style={{ borderColor: LINE }} value={draft.winTheme} onChange={(e) => set("winTheme", e.target.value)} />
          </label>
          {(["name", "drug"] as const).map((k) => (
            <label key={k} className="text-xs font-semibold">
              Brand {k}
              <input className={field} style={{ borderColor: LINE }} value={draft.brand[k]} onChange={(e) => edit((d) => ({ ...d, brand: { ...d.brand, [k]: e.target.value } }))} />
            </label>
          ))}
          <label className="text-xs font-semibold">
            Source URL
            <input className={field} style={{ borderColor: LINE }} value={draft.brand.sourceUrl ?? ""} onChange={(e) => edit((d) => ({ ...d, brand: { ...d.brand, sourceUrl: e.target.value || undefined } }))} />
          </label>
          <label className="col-span-2 text-xs font-semibold">
            Documents (one per line)
            <textarea className={field} style={{ borderColor: LINE }} rows={2} value={draft.brand.documents.join("\n")} onChange={(e) => edit((d) => ({ ...d, brand: { ...d.brand, documents: e.target.value.split("\n").filter((l) => l.trim()) } }))} />
          </label>
          <label className="col-span-2 text-xs font-semibold">
            Open questions (one per line)
            <textarea className={field} style={{ borderColor: LINE }} rows={3} value={draft.openQuestions.join("\n")} onChange={(e) => set("openQuestions", e.target.value.split("\n").filter((l) => l.trim()))} />
          </label>
        </section>

        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Cards, in order</h2>
        <CardList draft={draft} onMove={(i, by) => edit((d) => moveCard(d, i, by))} onRemove={(i) => edit((d) => removeCard(d, i))} onGhostChange={(i, p) => edit((d) => updateCard(d, i, p))} />
      </main>

      <aside className="w-[380px] shrink-0 overflow-y-auto border-l bg-[#f8fafc] p-4" style={{ borderColor: LINE }} aria-label="Outcomes and export">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Demos (one per outcome)</h2>
        <div className="mb-2 flex flex-wrap gap-1">
          {draft.demos.map((d, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} aria-current={i === active} className="rounded border px-2 py-1 text-xs" style={{ borderColor: i === active ? INK : LINE, background: i === active ? INK : "#ffffff", color: i === active ? "#ffffff" : INK }}>
              {d.label || `Demo ${i + 1}`}
            </button>
          ))}
          <button type="button" onClick={() => { edit(addDemo); setActive(draft.demos.length); }} className="rounded border px-2 py-1 text-xs" style={{ borderColor: LINE }}>Add demo</button>
        </div>
        {demo && (
          <div className="mb-3 space-y-2">
            <label className="block text-xs font-semibold">
              Name in the dropdown
              <input className={field} style={{ borderColor: LINE }} value={demo.label} onChange={(e) => edit((d) => updateDemo(d, active, { label: e.target.value, id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || demo.id }))} />
            </label>
            <label className="block text-xs font-semibold">
              Description
              <input className={field} style={{ borderColor: LINE }} value={demo.description ?? ""} onChange={(e) => edit((d) => updateDemo(d, active, { description: e.target.value || undefined }))} />
            </label>
            <button type="button" disabled={draft.demos.length < 2} onClick={() => { edit((d) => removeDemo(d, active)); setActive(0); }} className="rounded border px-2 py-1 text-xs disabled:opacity-40" style={{ borderColor: LINE }}>Remove this demo</button>
          </div>
        )}

        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Forks</h2>
        <ForkCards draft={draft} active={active} onToggle={(f) => edit((d) => toggleFork(d, f))} onPick={(f, e) => edit((d) => setPick(d, active, f, e))} />

        <h2 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Export</h2>
        {problems.length > 0 ? (
          <div role="alert" className="mb-3 rounded border bg-white p-3 text-xs" style={{ borderColor: INK }} data-testid="export-problems">
            <p className="mb-1 font-semibold">Export is blocked until these are fixed:</p>
            <ul className="list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        ) : (
          <p className="mb-3 text-xs" style={{ color: MUTED }}>Nothing blocks the export.</p>
        )}
        <button type="button" disabled={problems.length > 0 || busy} onClick={send} className="rounded px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40" style={{ background: INK }}>
          {busy ? "Exporting" : "Export request and prompt"}
        </button>
        {result?.ok && (
          <p className="mt-3 text-xs" data-testid="export-written">
            Wrote <code>{result.written.join("</code> and <code>")}</code>
          </p>
        )}
        {result && !result.ok && (
          <ul className="mt-3 list-disc pl-4 text-xs" data-testid="export-failed">{result.problems.map((p) => <li key={p}>{p}</li>)}</ul>
        )}
      </aside>
    </div>
  );
}
