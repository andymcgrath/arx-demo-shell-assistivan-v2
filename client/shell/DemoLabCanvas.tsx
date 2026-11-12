import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/brand";
import { useItems, type Item } from "./DemoLabItems";
import { buildCanvas, canvasFromDraft } from "@/workflows/catalog/canvas";
import { blankDraft, clearPick, draftFromScenario, EDITOR_WORKFLOWS, insertBlock, insertGhost, moveCard, removeCard, requestBrand, setPick, setVariant, updateCard } from "@/workflows/catalog/editor";
import { CardView, Chip, ForkView, Header, INK, LINE, MUTED, SOFT, APP_LABEL } from "./DemoLabCanvasParts";
import { DemoBar, Detail, ForkToggles, InsertPanel } from "./DemoLabCanvasEdit";
import { useDraft } from "./DemoLabDraft";
import { emptyRequestFields, RequestPanel } from "./DemoLabCanvasRequest";
import { EditTools } from "./DemoLabCanvasHistory";

/**
 * Demo Lab, Canvas tab. A horizontal row of cards in journey order. Click a card for its detail and its actions. Each fork
 * sits under the card that owns it: pick a story fork's outcome per demo, or pin a patient fork's branch. A card the picked
 * outcome no longer feeds stays on the row, disabled. Add a card on either side of any card with the + buttons.
 * Edits go to the shared draft (DemoLabDraft). The request fields (title, client, brand, win theme) open from "Request details".
 * Nothing is saved until export.
 * The canvas plan: docs/plans/PLAN_DEMO_LAB_CANVAS.md.
 */

/** A collapsed side panel is a thin strip with one button, so the card row can use the width. */
const Strip = ({ side, label, onOpen }: { side: "left" | "right"; label: string; onOpen: () => void }) => (
  <div className={`w-8 shrink-0 bg-white ${side === "left" ? "border-r" : "border-l"}`} style={{ borderColor: LINE }}>
    <button type="button" onClick={onOpen} aria-label={`Show ${label}`} aria-expanded={false} title={`Show ${label}`} className="mt-2 w-full py-1 text-sm font-bold">
      {side === "left" ? "»" : "«"}
    </button>
  </div>
);

const Collapse = ({ side, label, onClose }: { side: "left" | "right"; label: string; onClose: () => void }) => (
  <button type="button" onClick={onClose} aria-label={`Hide ${label}`} aria-expanded title={`Hide ${label}`} className="mb-2 rounded border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: LINE }}>
    {side === "left" ? "« Hide" : "Hide »"}
  </button>
);

/** A band that says which part of the demo a section defines, so the scenario and the recipe do not blur together. */
const Band = ({ kind, title, note, children }: { kind: string; title: string; note: string; children?: React.ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-t border-b-2 px-3 py-2" style={{ background: INK, color: "#ffffff", borderColor: INK }} data-testid={`band-${kind}`}>
    <div>
      <h2 className="text-xs font-bold uppercase tracking-wide">{title}</h2>
      <p className="text-[11px] opacity-80">{note}</p>
    </div>
    {children}
  </div>
);

const plus = "mx-1 mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold";

export default function CanvasLab() {
  const items = useItems();
  const { draft, active, setActive, loadedKey, dirty, edit, load, result, busy, send } = useDraft();
  const [wholeKey, setWholeKey] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [shownFork, setShownFork] = useState<string | null>(null);
  // On a narrow window the two side panels would leave the cards no room, so they start collapsed.
  const roomy = typeof window === "undefined" || window.innerWidth >= 1100;
  const [listOpen, setListOpen] = useState(roomy);
  const [detailOpen, setDetailOpen] = useState(roomy);
  const groups = [...new Set(items.map((i) => i.group))];

  const fromItem = (it: Item) => draftFromScenario(it.flow, { title: it.title, client: BRAND.slug, brand: requestBrand(BRAND), choices: it.choices });

  // The first time the lab opens, start from the first entry that has a recipe.
  useEffect(() => {
    if (loadedKey !== null) return;
    const first = items.find((i) => fromItem(i));
    if (first) load(first.key, fromItem(first)!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The insert panel lives in the detail panel, so adding a card opens it.
  useEffect(() => { if (insertAt !== null) setDetailOpen(true); }, [insertAt]);

  const startBlank = (workflow: (typeof EDITOR_WORKFLOWS)[number]) => {
    if (dirty && !window.confirm("Replace the draft? Your edits will be lost.")) return;
    setCardIndex(0);
    setInsertAt(null);
    setWholeKey(null);
    load(`blank:${workflow}`, blankDraft(workflow, BRAND.slug, requestBrand(BRAND)));
  };

  const choose = (it: Item) => {
    if (dirty && !window.confirm("Replace the draft? Your edits will be lost.")) return;
    const next = fromItem(it);
    setCardIndex(0);
    setInsertAt(null);
    if (!next) return setWholeKey(it.key);
    setWholeKey(null);
    load(it.key, next);
  };

  const canvas = useMemo(() => canvasFromDraft(draft, active), [draft, active]);
  const whole = wholeKey ? items.find((i) => i.key === wholeKey) : undefined;
  const wholeBoard = whole ? buildCanvas({ flow: whole.flow, title: whole.title, description: whole.description }) : undefined;
  const picked = wholeKey ?? loadedKey;
  const index = Math.min(cardIndex, Math.max(canvas.cards.length - 1, 0));
  const card = canvas.cards[index];

  // Clicking a fork's name only shows where it sits: select its owner card, light up the fork, scroll to it. No edit.
  const showFork = (forkId: string) => {
    const f = canvas.forks.find((x) => x.id === forkId);
    if (!f) return;
    setShownFork(forkId);
    setCardIndex(f.ownerIndex);
    setInsertAt(null);
    window.setTimeout(() => document.getElementById(`canvas-fork-${forkId}`)?.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" }), 0);
  };

  const AddButton = ({ at }: { at: number }) => (
    <button type="button" aria-label={`Add a card at position ${at + 1}`} data-testid="canvas-add" onClick={() => setInsertAt(at)} className={plus} style={{ borderColor: insertAt === at ? INK : LINE, background: insertAt === at ? INK : "#ffffff", color: insertAt === at ? "#ffffff" : INK }}>
      +
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1">
      {!listOpen && <Strip side="left" label="demo list" onOpen={() => setListOpen(true)} />}
      {listOpen && <aside className="w-[260px] shrink-0 overflow-y-auto border-r bg-white p-4" style={{ borderColor: LINE }} aria-label="Demo list">
        <Collapse side="left" label="demo list" onClose={() => setListOpen(false)} />
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>{g}</h2>
            <ol>
              {items.map((it) =>
                it.group !== g ? null : (
                  <li key={it.key}>
                    <button
                      type="button"
                      onClick={() => choose(it)}
                      aria-current={it.key === picked}
                      className="mb-1 w-full rounded border px-2 py-1.5 text-left text-sm"
                      style={{ borderColor: it.key === picked ? INK : LINE, background: it.key === picked ? INK : "#ffffff", color: it.key === picked ? "#ffffff" : INK }}
                    >
                      {it.title}
                    </button>
                  </li>
                ),
              )}
            </ol>
          </div>
        ))}
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Start blank</h2>
          {EDITOR_WORKFLOWS.map((w) => (
            <button key={w} type="button" onClick={() => startBlank(w)} aria-current={picked === `blank:${w}`} className="mb-1 w-full rounded border px-2 py-1.5 text-left text-sm" style={{ borderColor: picked === `blank:${w}` ? INK : LINE, background: picked === `blank:${w}` ? INK : "#ffffff", color: picked === `blank:${w}` ? "#ffffff" : INK }}>
              Blank {w === "coassist" ? "CoAssist" : "iAssist"} demo
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: MUTED }}>
          Picking an entry starts a draft from it. Edit it here, then export. Nothing is saved until you do. The demos are the active brand's.
        </p>
      </aside>}

      {wholeBoard && wholeBoard.kind === "whole" ? (
        <main className="min-w-0 flex-1 overflow-y-auto p-5" data-testid="canvas-whole">
          <h2 className="text-lg font-bold">{wholeBoard.title}</h2>
          <div className="mt-3 max-w-3xl rounded border bg-white p-4" style={{ borderColor: LINE }}>
            <p className="text-sm font-bold">{wholeBoard.demo?.name}</p>
            <p className="mt-1 text-sm">{wholeBoard.demo?.summary}</p>
            <p className="mt-2 flex flex-wrap gap-1">{wholeBoard.demo?.apps.map((a) => <Chip key={a}>{APP_LABEL[a]}</Chip>)}</p>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>This workflow has no recipe, so it is one whole demo. It is not drawn as cards and cannot be edited here.</p>
          </div>
        </main>
      ) : (
        <>
          <main className="min-w-0 flex-1 overflow-auto p-5" data-testid="canvas">
            <section className="mb-5 rounded border bg-white pb-3" style={{ borderColor: INK }} aria-label="Scenario" data-testid="section-scenario">
              <Band kind="scenario" title="Scenario" note="What this demo is called, how it starts, and which outcomes it plays. Each demo is one outcome.">
                <div className="text-black"><EditTools /></div>
              </Band>
              <div className="px-3">
                <Header canvas={canvas} />
                <button type="button" onClick={() => setShowRequest((v) => !v)} aria-expanded={showRequest} aria-controls="request-details-panel" className="mb-2 inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-semibold" style={{ borderColor: INK, background: showRequest ? SOFT : "#ffffff" }}>
                  <span aria-hidden className="inline-block transition-transform" style={{ transform: showRequest ? "rotate(90deg)" : "none" }}>▸</span>
                  {showRequest ? "Hide request details" : "Show request details"}
                  {emptyRequestFields(draft).length > 0 ? ` (${emptyRequestFields(draft).length} to fill)` : ""}
                </button>
                {showRequest && <div id="request-details-panel"><RequestPanel draft={draft} edit={edit} /></div>}
                <DemoBar draft={draft} active={active} setActive={setActive} edit={edit} />
              </div>
            </section>
            <section className="pb-3" aria-label="Recipe" data-testid="section-recipe">
              <div className="mb-3 max-w-xl" data-testid="band-recipe">
                <h2 className="text-xs font-bold uppercase tracking-wide">Recipe</h2>
                <p className="text-[11px]" style={{ color: MUTED }}>The blocks that run, in order, and the forks they can branch on. Every demo above shares it.</p>
              </div>
              <div>
                <ForkToggles canvas={canvas} edit={edit} onShow={showFork} shown={shownFork} />
                {canvas.cards.length === 0 && <p className="mb-2 text-sm" style={{ color: MUTED }}>No cards yet. Use + to add the first one.</p>}
                <div className="flex items-start pb-4">
                  <AddButton at={0} />
                  {canvas.cards.map((c, i) => (
                    <div key={i} className="flex items-start">
                      <div className="w-[240px] shrink-0 space-y-2">
                        <CardView card={c} selected={i === index} onSelect={() => { setCardIndex(i); setInsertAt(null); setShownFork(null); }} />
                        {canvas.forks.filter((f) => f.ownerIndex === i).map((f) => (
                          <div key={f.id} id={`canvas-fork-${f.id}`}>
                            <ForkView
                              fork={f}
                              cards={canvas.cards}
                              highlight={shownFork === f.id}
                              onPick={(exitId) => edit((d) => setPick(d, active, f.id, exitId))}
                              onClear={(forkId) => edit((d) => clearPick(d, active, forkId))}
                            />
                          </div>
                        ))}
                      </div>
                      <span aria-hidden className="mx-1 mt-6 shrink-0 text-lg font-bold" style={{ color: MUTED }}>{i < canvas.cards.length - 1 ? "→" : ""}</span>
                      <AddButton at={i + 1} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
          {!detailOpen && <Strip side="right" label="card detail" onOpen={() => setDetailOpen(true)} />}
          {detailOpen && <aside className="w-[360px] shrink-0 overflow-y-auto border-l bg-white p-4" style={{ borderColor: LINE }} aria-label="Card detail">
            <div className="flex justify-end"><Collapse side="right" label="card detail" onClose={() => setDetailOpen(false)} /></div>
            {insertAt !== null ? (
              <InsertPanel
                draft={draft}
                at={insertAt}
                demoIndex={active}
                onCancel={() => setInsertAt(null)}
                onInsert={(c) => { edit((d) => insertBlock(d, insertAt, c)); setCardIndex(insertAt); setInsertAt(null); }}
                onGhost={() => { edit((d) => insertGhost(d, insertAt)); setCardIndex(insertAt); setInsertAt(null); }}
              />
            ) : card ? (
              <Detail
                card={card}
                forks={canvas.forks}
                count={canvas.cards.length}
                onAddBefore={() => setInsertAt(card.index)}
                onAddAfter={() => setInsertAt(card.index + 1)}
                onMove={(by) => { edit((d) => moveCard(d, card.index, by)); setCardIndex(card.index + by); }}
                onRemove={() => edit((d) => removeCard(d, card.index))}
                onVariant={(v) => edit((d) => setVariant(d, card.index, v))}
                onGhost={(patch) => edit((d) => updateCard(d, card.index, patch))}
              />
            ) : null}

            <section className="mt-6 border-t pt-4" style={{ borderColor: LINE }} aria-label="Export">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Export</h4>
              {canvas.exportProblems.length > 0 ? (
                <div role="alert" className="mb-3 rounded border p-3 text-xs" style={{ borderColor: INK }} data-testid="export-problems">
                  <p className="mb-1 font-semibold">Export is blocked until these are fixed:</p>
                  <ul className="list-disc pl-4">{canvas.exportProblems.map((p) => <li key={p}>{p}</li>)}</ul>
                  <p className="mt-1" style={{ color: MUTED }}>Fill the rest under "Request details".</p>
                  <button type="button" className="mt-2 rounded border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: INK }} onClick={() => { setShowRequest(true); window.setTimeout(() => document.querySelector("[data-testid=request-panel]")?.scrollIntoView?.({ block: "center" }), 0); }}>Open Request details</button>
                </div>
              ) : (
                <p className="mb-3 text-xs" style={{ color: MUTED }}>Nothing blocks the export.</p>
              )}
              <button type="button" disabled={canvas.exportProblems.length > 0 || busy} onClick={send} className="rounded px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40" style={{ background: INK }}>
                {busy ? "Exporting" : "Export request and prompt"}
              </button>
              {result?.ok && <p className="mt-3 text-xs" data-testid="export-written">Wrote <code>{result.written.join("</code> and <code>")}</code></p>}
              {result && !result.ok && <ul className="mt-3 list-disc pl-4 text-xs" data-testid="export-failed">{result.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
            </section>
          </aside>}
        </>
      )}
    </div>
  );
}
