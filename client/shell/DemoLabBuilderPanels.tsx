import { useMemo, useState } from "react";
import { CATALOG_BLOCKS, CATALOG_PAYERS, catalogExit, catalogFork, paletteCards, requirementLabel as blockName, type CatalogApp, type CatalogLane, type PaletteCard } from "@/workflows/catalog";
import type { DemoRequest, RequestGhostCard } from "@/workflows/catalog/request";
import { appendReasons, exitMissing, workflowForks, type EditorWorkflow } from "@/workflows/catalog/editor";
import type { ModuleId } from "@/engine/workflow/components";

/** The Demo Lab builder's panels: the block palette, the card list, and the fork cards. Presentation only. */

const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#cbd5e1";

const APPS: CatalogApp[] = ["crm", "patient", "provider", "field", "iassist", "rules", "web", "gateway"];
const APP_LABEL: Record<CatalogApp, string> = { crm: "CRM", patient: "Patient", provider: "Provider", field: "Field", iassist: "iAssist", rules: "Rules", web: "Web page", gateway: "Gateway" };
const LANES: CatalogLane[] = ["hcp", "patient", "agent", "system"];
const LANE_LABEL: Record<CatalogLane, string> = { hcp: "HCP", patient: "Patient", agent: "Agent", system: "System" };

const field = "w-full rounded border px-2 py-1 text-sm";

export function Palette({ draft, onAdd, onGhost }: { draft: DemoRequest; onAdd: (c: PaletteCard) => void; onGhost: () => void }) {
  const [q, setQ] = useState("");
  const cards = useMemo(() => Object.values(CATALOG_BLOCKS).flatMap((b) => paletteCards(b).map((c) => ({ c, b }))), []);
  const needle = q.trim().toLowerCase();
  const shown = cards.filter(({ c, b }) => !needle || [c.label, b.name, ...b.aliases].some((t) => t.toLowerCase().includes(needle)));
  return (
    <aside className="w-[320px] shrink-0 overflow-y-auto border-r bg-white p-4" style={{ borderColor: LINE }} aria-label="Block palette">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
        Blocks
      </h2>
      <input className={`${field} mb-3`} style={{ borderColor: LINE }} placeholder="Search: ABV, onboarding, triage to SP" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search blocks" />
      <ul>
        {shown.map(({ c }) => {
          const reasons = appendReasons(draft, c);
          const off = reasons.length > 0;
          return (
            <li key={`${c.moduleId}:${c.variantId ?? ""}`} className="mb-2">
              <button
                type="button"
                disabled={off}
                onClick={() => onAdd(c)}
                className="w-full rounded border p-2 text-left"
                style={{ borderColor: LINE, opacity: off ? 0.5 : 1 }}
                data-testid="palette-card"
                data-module={c.moduleId}
                data-variant={c.variantId ?? ""}
                data-disabled={off}
              >
                <span className="block text-sm font-semibold">{c.label}</span>
                <span className="block text-xs">{c.summary}</span>
                {off && reasons.map((r) => (
                  <span key={r} className="mt-1 block text-[11px] font-semibold" style={{ color: INK }}>
                    {r}
                  </span>
                ))}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onGhost} className="mt-2 w-full rounded border-2 border-dashed p-2 text-sm font-semibold" style={{ borderColor: INK }}>
        Add something new (ghost card)
      </button>
    </aside>
  );
}

export function CardList({
  draft, onMove, onRemove, onGhostChange,
}: {
  draft: DemoRequest;
  onMove: (i: number, by: -1 | 1) => void;
  onRemove: (i: number) => void;
  onGhostChange: (i: number, patch: Partial<RequestGhostCard>) => void;
}) {
  if (!draft.cards.length) return <p className="text-sm" style={{ color: MUTED }}>No cards yet. Pick a block from the palette.</p>;
  return (
    <ol className="space-y-2" aria-label="Cards in order">
      {draft.cards.map((c, i) => (
        <li key={i} className="rounded border bg-white p-3" style={{ borderColor: c.kind === "ghost" ? INK : LINE, borderStyle: c.kind === "ghost" ? "dashed" : "solid" }} data-testid="request-card" data-kind={c.kind}>
          <div className="flex items-start gap-2">
            <span className="w-6 text-sm font-bold">{i + 1}.</span>
            <div className="min-w-0 flex-1">
              {c.kind === "block" ? (
                <>
                  <p className="text-sm font-semibold">{paletteCards(CATALOG_BLOCKS[c.moduleId]).find((p) => p.variantId === c.variantId)?.label ?? CATALOG_BLOCKS[c.moduleId].name}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{CATALOG_BLOCKS[c.moduleId].name}</p>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <p className="col-span-2 text-xs font-bold uppercase" style={{ color: MUTED }}>New: built by Claude Code</p>
                  <label className="col-span-2 text-xs font-semibold">
                    Name
                    <input className={field} style={{ borderColor: LINE }} value={c.name} onChange={(e) => onGhostChange(i, { name: e.target.value })} />
                  </label>
                  <label className="col-span-2 text-xs font-semibold">
                    What the audience sees
                    <textarea className={field} style={{ borderColor: LINE }} rows={2} value={c.sees} onChange={(e) => onGhostChange(i, { sees: e.target.value })} />
                  </label>
                  <label className="text-xs font-semibold">
                    Which app
                    <select className={field} style={{ borderColor: LINE }} value={c.app} onChange={(e) => onGhostChange(i, { app: e.target.value as CatalogApp })}>
                      {APPS.map((a) => <option key={a} value={a}>{APP_LABEL[a]}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">
                    Who triggers it
                    <select className={field} style={{ borderColor: LINE }} value={c.lane} onChange={(e) => onGhostChange(i, { lane: e.target.value as CatalogLane })}>
                      {LANES.map((l) => <option key={l} value={l}>{LANE_LABEL[l]}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => onMove(i, -1)} disabled={i === 0} className="rounded border px-2 py-0.5 text-xs disabled:opacity-40" style={{ borderColor: LINE }} aria-label="Move up">Up</button>
              <button type="button" onClick={() => onMove(i, 1)} disabled={i === draft.cards.length - 1} className="rounded border px-2 py-0.5 text-xs disabled:opacity-40" style={{ borderColor: LINE }} aria-label="Move down">Down</button>
              <button type="button" onClick={() => onRemove(i)} className="rounded border px-2 py-0.5 text-xs" style={{ borderColor: LINE }} aria-label="Remove">Remove</button>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ForkCards({
  draft, active, onToggle, onPick,
}: {
  draft: DemoRequest;
  active: number;
  onToggle: (forkId: string) => void;
  onPick: (forkId: string, exitId: string) => void;
}) {
  const forks = workflowForks(draft.workflow as EditorWorkflow);
  const demo = draft.demos[active];
  return (
    <div className="space-y-3" aria-label="Forks">
      {forks.map((f) => {
        const on = draft.forks.includes(f.id);
        const story = f.chooser === "story";
        return (
          <div key={f.id} className="rounded border bg-white p-3" style={{ borderColor: LINE }} data-testid={`builder-fork-${f.id}`}>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={on} disabled={f.id === "bi"} onChange={() => onToggle(f.id)} />
              {catalogFork(f.id)?.label ?? f.label}
            </label>
            {f.id === "bi" && <p className="text-xs" style={{ color: MUTED }}>Benefits investigation decides who pays, so it always runs first.</p>}
            {on && !story && <p className="mt-1 text-xs" style={{ color: MUTED }}>The patient picks live. Nothing to choose here.</p>}
            {on && story && (
              <ul className="mt-2 space-y-1.5">
                {f.exits.map((e) => {
                  const c = catalogExit(f.id, e.id);
                  const missing = exitMissing(draft, e);
                  const picked = demo?.choices[f.id] === e.id;
                  return (
                    <li key={e.id} className="rounded border px-2 py-1.5 text-xs" style={{ borderColor: picked ? INK : LINE, background: picked ? INK : "#ffffff", color: picked ? "#ffffff" : INK, opacity: missing.length ? 0.45 : 1 }}>
                      <label className="flex items-start gap-2">
                        <input type="radio" name={`${f.id}-${active}`} checked={picked} disabled={missing.length > 0} onChange={() => onPick(f.id, e.id)} data-exit={e.id} />
                        <span>
                          <span className="font-semibold">{c?.label ?? e.label}</span>
                          {c?.payer && <span className="opacity-80"> ({CATALOG_PAYERS[c.payer].label}, {c.paRequired ? "PA required" : "no PA"})</span>}
                          <span className="block opacity-80">{c?.description ?? e.description}</span>
                          {missing.length > 0 && <span className="block font-semibold">Needs: {missing.map(blockName).join(", ")}</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
