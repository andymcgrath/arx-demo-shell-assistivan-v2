import { useMemo, useState } from "react";
import { CATALOG_BLOCKS, paletteCards, type CatalogApp, type CatalogLane } from "@/workflows/catalog";
import type { CanvasBoard, CanvasCard, CanvasFork } from "@/workflows/catalog/canvas";
import type { DemoRequest, RequestGhostCard } from "@/workflows/catalog/request";
import { addDemo, insertReasons, removeDemo, toggleFork, updateDemo } from "@/workflows/catalog/editor";
import { APP_LABEL, Chip, INK, LANE_COLOR, LANE_LABEL, LINE, MUTED, TRIGGER_LABEL } from "./DemoLabCanvasParts";

/** The canvas's editing pieces: the demo bar, the fork toggles, the insert panel, and the card detail with its actions. */

const field = "w-full rounded border px-2 py-1 text-sm";
const small = "rounded border px-2 py-0.5 text-xs font-semibold disabled:opacity-40";

export function DemoBar({ draft, active, setActive, edit }: { draft: DemoRequest; active: number; setActive: (i: number) => void; edit: (fn: (d: DemoRequest) => DemoRequest) => void }) {
  const demo = draft.demos[active];
  return (
    <section className="mb-3 flex flex-wrap items-end gap-2" aria-label="Demos">
      <div className="flex flex-wrap items-center gap-1">
        {draft.demos.map((d, i) => (
          <button key={i} type="button" onClick={() => setActive(i)} aria-current={i === active} className="rounded border px-2 py-1 text-xs" style={{ borderColor: i === active ? INK : LINE, background: i === active ? INK : "#ffffff", color: i === active ? "#ffffff" : INK }}>
            {d.label || `Demo ${i + 1}`}
          </button>
        ))}
        <button type="button" className={small} style={{ borderColor: LINE }} onClick={() => { edit(addDemo); setActive(draft.demos.length); }}>
          Add demo
        </button>
      </div>
      {demo && (
        <>
          <label className="text-xs font-semibold">
            Name in the dropdown
            <input
              className={field}
              style={{ borderColor: LINE, minWidth: 220 }}
              value={demo.label}
              onChange={(e) => edit((d) => updateDemo(d, active, { label: e.target.value, id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || demo.id }))}
            />
          </label>
          <label className="text-xs font-semibold">
            Description
            <input className={field} style={{ borderColor: LINE, minWidth: 260 }} value={demo.description ?? ""} onChange={(e) => edit((d) => updateDemo(d, active, { description: e.target.value || undefined }))} />
          </label>
          <button type="button" disabled={draft.demos.length < 2} className={small} style={{ borderColor: LINE }} onClick={() => { edit((d) => removeDemo(d, active)); setActive(0); }}>
            Remove this demo
          </button>
        </>
      )}
    </section>
  );
}

export function ForkToggles({ canvas, edit }: { canvas: CanvasBoard; edit: (fn: (d: DemoRequest) => DemoRequest) => void }) {
  const on = canvas.forks.filter((f) => f.id !== "bi");
  if (!on.length && !canvas.otherForks.length) return null;
  return (
    <section className="mb-3 flex flex-wrap items-center gap-2 text-xs" aria-label="Forks in this demo">
      <span className="font-bold uppercase tracking-wide" style={{ color: MUTED }}>Forks</span>
      <Chip strong>Benefits investigation result (always)</Chip>
      {on.map((f) => (
        <button key={f.id} type="button" className={small} style={{ borderColor: INK }} onClick={() => edit((d) => toggleFork(d, f.id))} aria-label={`Remove the ${f.label} fork`}>
          {f.label} ×
        </button>
      ))}
      {canvas.otherForks.map((f) => (
        <button key={f.id} type="button" className={small} style={{ borderColor: LINE }} onClick={() => edit((d) => toggleFork(d, f.id))} aria-label={`Add the ${f.label} fork`}>
          + {f.label}
        </button>
      ))}
    </section>
  );
}

type Row = { key: string; c: ReturnType<typeof paletteCards>[number]; reasons: string[]; off: boolean };

function Option({ row, onInsert }: { row: Row; onInsert: (c: Row["c"]) => void }) {
  const { c, reasons, off } = row;
  return (
    <li className="mb-2">
      <button type="button" disabled={off} onClick={() => onInsert(c)} className="w-full rounded border p-2 text-left" style={{ borderColor: LINE, opacity: off ? 0.5 : 1 }} data-testid="insert-option" data-module={c.moduleId} data-variant={c.variantId ?? ""} data-disabled={off}>
        <span className="block text-sm font-semibold">{c.label}</span>
        <span className="block text-xs">{c.summary}</span>
        {reasons[0] && <span className="mt-1 block text-[11px] font-semibold">{reasons[0]}</span>}
      </button>
    </li>
  );
}

/** What goes at one position: search, every block with its reasons, and a ghost card. */
export function InsertPanel({ draft, at, demoIndex, onInsert, onGhost, onCancel }: {
  draft: DemoRequest; at: number; demoIndex: number; onInsert: (c: ReturnType<typeof paletteCards>[number]) => void; onGhost: () => void; onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const all = useMemo(() => Object.values(CATALOG_BLOCKS).flatMap((b) => paletteCards(b).map((c) => ({ c, b }))), []);
  const needle = q.trim().toLowerCase();
  const shown = all.filter(({ c, b }) => !needle || [c.label, b.name, ...b.aliases].some((t) => t.toLowerCase().includes(needle)));
  // Blocks that fit come first. A block that does not fit shows its first reason only.
  const rows = shown.map(({ c }) => {
    const reasons = insertReasons(draft, at, c, demoIndex);
    return { key: `${c.moduleId}:${c.variantId ?? ""}`, c, reasons, off: reasons.length > 0 };
  });
  return (
    <div data-testid="canvas-insert">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold">Add a card at position {at + 1}</h3>
        <button type="button" className={small} style={{ borderColor: LINE }} onClick={onCancel}>Cancel</button>
      </div>
      <input className={`${field} mb-2`} style={{ borderColor: LINE }} placeholder="Search: ABV, onboarding, triage to SP" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search blocks" />
      <ul>
        {rows.filter((r) => !r.off).map((r) => (
          <Option key={r.key} row={r} onInsert={onInsert} />
        ))}
      </ul>
      {rows.some((r) => r.off) && (
        <>
          <h4 className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Not available here</h4>
          <ul>
            {rows.filter((r) => r.off).map((r) => (
              <Option key={r.key} row={r} onInsert={onInsert} />
            ))}
          </ul>
        </>
      )}
      <button type="button" onClick={onGhost} className="mt-1 w-full rounded border-2 border-dashed p-2 text-sm font-semibold" style={{ borderColor: INK }}>
        Add something new (ghost card)
      </button>
    </div>
  );
}

const APPS: CatalogApp[] = ["crm", "patient", "provider", "field", "iassist", "rules", "web", "gateway"];
const LANES: CatalogLane[] = ["hcp", "patient", "agent", "system"];

export function Detail({ card, forks, count, onMove, onRemove, onVariant, onGhost, onAddBefore, onAddAfter }: {
  card: CanvasCard; forks: CanvasFork[]; count: number;
  onMove: (by: -1 | 1) => void; onRemove: () => void; onVariant: (variantId: string | undefined) => void;
  onGhost: (patch: Partial<RequestGhostCard>) => void; onAddBefore: () => void; onAddAfter: () => void;
}) {
  const owned = forks.filter((f) => f.ownerIndex === card.index);
  const block = card.moduleId ? CATALOG_BLOCKS[card.moduleId] : undefined;
  const variants = block?.variants ? paletteCards(block) : [];
  const ghost = card.kind === "ghost";
  return (
    <div data-testid="canvas-detail">
      <p className="text-[11px] font-bold uppercase" style={{ color: LANE_COLOR[card.lane] }}>
        Card {card.index + 1} · {LANE_LABEL[card.lane]} · {TRIGGER_LABEL[card.trigger]}
      </p>
      <h3 className="text-base font-bold leading-tight">{card.label}</h3>
      {card.blockName && card.label !== card.blockName && <p className="text-xs" style={{ color: MUTED }}>{card.blockName}</p>}

      <div className="mt-2 flex flex-wrap gap-1" aria-label="Card actions">
        <button type="button" className={small} style={{ borderColor: LINE }} onClick={onAddBefore}>Add before</button>
        <button type="button" className={small} style={{ borderColor: LINE }} onClick={onAddAfter}>Add after</button>
        <button type="button" className={small} style={{ borderColor: LINE }} disabled={card.index === 0} onClick={() => onMove(-1)}>Move left</button>
        <button type="button" className={small} style={{ borderColor: LINE }} disabled={card.index === count - 1} onClick={() => onMove(1)}>Move right</button>
        <button type="button" className={small} style={{ borderColor: INK }} onClick={onRemove}>Remove</button>
      </div>

      {variants.length > 1 && (
        <label className="mt-3 block text-xs font-semibold">
          Variant
          <select className={field} style={{ borderColor: LINE }} value={card.variantId ?? ""} onChange={(e) => onVariant(e.target.value || undefined)}>
            {variants.map((v) => (
              <option key={v.variantId ?? "default"} value={v.variantId ?? ""}>{v.label}</option>
            ))}
          </select>
        </label>
      )}

      {ghost && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <p className="col-span-2 text-xs font-bold uppercase" style={{ color: MUTED }}>New: built by Claude Code</p>
          <label className="col-span-2 text-xs font-semibold">Name<input className={field} style={{ borderColor: LINE }} value={card.label === "New block" ? "" : card.label} onChange={(e) => onGhost({ name: e.target.value })} /></label>
          <label className="col-span-2 text-xs font-semibold">What the audience sees<textarea className={field} style={{ borderColor: LINE }} rows={2} value={card.summary} onChange={(e) => onGhost({ sees: e.target.value })} /></label>
          <label className="text-xs font-semibold">Which app
            <select className={field} style={{ borderColor: LINE }} value={card.apps[0]} onChange={(e) => onGhost({ app: e.target.value as CatalogApp })}>
              {APPS.map((a) => <option key={a} value={a}>{APP_LABEL[a]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">Who triggers it
            <select className={field} style={{ borderColor: LINE }} value={card.lane} onChange={(e) => onGhost({ lane: e.target.value as CatalogLane })}>
              {LANES.map((l) => <option key={l} value={l}>{LANE_LABEL[l]}</option>)}
            </select>
          </label>
        </div>
      )}

      {!ghost && <p className="mt-3 text-sm">{card.summary}</p>}
      <p className="mt-2 flex flex-wrap gap-1">
        {card.apps.map((a) => (
          <Chip key={a}>{APP_LABEL[a]}</Chip>
        ))}
      </p>
      {card.issues.length > 0 && (
        <div role="alert" className="mt-3 rounded border p-2 text-xs" style={{ borderColor: INK }}>
          <p className="font-bold">Fix before export</p>
          <ul className="list-disc pl-4">{card.issues.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      )}
      {card.disabled.length > 0 && (
        <div role="alert" className="mt-3 rounded border p-2 text-xs" style={{ borderColor: INK }}>
          <p className="font-bold">Disabled for this outcome</p>
          <ul className="list-disc pl-4">{card.disabled.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>
      )}
      <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Steps</h4>
      <ol className="space-y-1">
        {card.steps.map((s, i) => (
          <li key={i} className="text-xs">
            <span className="mr-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: LANE_COLOR[s.lane] }}>{LANE_LABEL[s.lane]}</span>
            <Chip strong>{TRIGGER_LABEL[s.trigger]}</Chip> {s.label}
          </li>
        ))}
      </ol>
      {!ghost && (
        <>
          <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Takes in</h4>
          <p className="text-xs">{card.inputs.length ? card.inputs.join(", ") : "Nothing. It starts the case or waits on nothing earlier."}</p>
          <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Sets</h4>
          <p className="text-xs">{card.outputs.length ? card.outputs.join(", ") : "Nothing the later cards read."}</p>
        </>
      )}
      {owned.length > 0 && (
        <>
          <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Forks under this card</h4>
          <p className="text-xs">{owned.map((f) => f.label).join(", ")}</p>
        </>
      )}
    </div>
  );
}
