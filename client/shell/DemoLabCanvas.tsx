import { useEffect, useMemo, useState } from "react";
import { GitFork, Hammer, Sparkles } from "lucide-react";
import { BRAND } from "@/brand";
import { useItems, type Item } from "./DemoLabItems";
import { buildCanvas, canvasFromDraft } from "@/workflows/catalog/canvas";
import { blankDraft, clearPick, demoIdClashes, draftFromScenario, duplicateDemo, slugOf, EDITOR_WORKFLOWS, insertBlock, insertGhost, moveCard, removeCard, requestBrand, setPick, setVariant, updateCard } from "@/workflows/catalog/editor";
import { CardView, Chip, ForkView, Header, INK, LINE, MUTED, SOFT, APP_LABEL, FORK_COLOR, LANE_COLOR, LANE_ICON } from "./DemoLabCanvasParts";
import { DemoBar, Detail, ForkToggles, InsertPanel } from "./DemoLabCanvasEdit";
import { useDraft } from "./DemoLabDraft";
import { emptyRequestFields, ExportInstructions, RequestPanel } from "./DemoLabCanvasRequest";
import { EditTools } from "./DemoLabCanvasHistory";

/**
 * Demo Lab, Canvas tab. A vertical timeline of cards in journey order, step 1 at the top. The selected card shows its detail beside it. The right panel is an outline of the steps: click one to jump to its card. Each fork
 * sits under the card that owns it: pick a story fork's outcome per demo, or pin a patient fork's branch. A card the picked
 * outcome no longer feeds stays on the row, disabled. Add a card on either side of any card with the + buttons.
 * Edits go to the shared draft (DemoLabDraft). The request fields (title, client, brand, win theme) open from "Build request".
 * Nothing is saved until export.
 * The canvas plan: docs/plans/PLAN_DEMO_LAB_CANVAS.md.
 */

/** One line under a demo list heading. Demos come from the brand file. Recipes are the built-in scenarios. */
const GROUP_NOTE = (group: string): string | undefined =>
  group === "Recipes" ? "Starting points. Pick one to start a draft from it." : group.startsWith("Demos in ") ? "The demos the client picks from. Pick one to edit it." : undefined;

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
  const { draft, active, setActive, loadedKey, dirty, edit, load, result, busy, send, build, built, building } = useDraft();
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

  // The list number ("1. CoAssist DTP") orders the dropdown. It is not part of the demo's name or its file name.
  // The demo entry keeps its original label and id, so applying still replaces the brand file's entry.
  const fromItem = (it: Item) => {
    const d = draftFromScenario(it.flow, { title: it.title, client: BRAND.slug, brand: requestBrand(BRAND), choices: it.choices });
    const name = it.title.replace(/^\d+\.\s*/, "");
    return d && name && name !== it.title ? { ...d, title: name, slug: slugOf(name) } : d;
  };

  // The first time the lab opens, start from the first entry that has a recipe.
  useEffect(() => {
    if (loadedKey !== null) return;
    const first = items.find((i) => fromItem(i));
    if (first) load(first.key, fromItem(first)!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The insert panel lives in the outline panel, so adding a card opens it.
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

  const duplicate = () => {
    if (dirty && !window.confirm("Duplicating opens a new draft and replaces this one. Your unsaved edits come with the copy. Continue?")) return;
    const copy = duplicateDemo(draft, active, { demoIds: (BRAND.demos ?? []).map((x) => x.id), slugs: items.map((i) => slugOf(i.title)) });
    setCardIndex(0);
    setInsertAt(null);
    setWholeKey(null);
    load(`copy:${copy.demos[0].id}`, copy);
  };
  const isCopy = loadedKey?.startsWith("copy:") ?? false;
  const clashes = demoIdClashes(draft, (BRAND.demos ?? []).map((x) => x.id), loadedKey?.startsWith("demo:") ? loadedKey.slice(5) : undefined);

  const canvas = useMemo(() => canvasFromDraft(draft, active), [draft, active]);
  const whole = wholeKey ? items.find((i) => i.key === wholeKey) : undefined;
  const wholeBoard = whole ? buildCanvas({ flow: whole.flow, title: whole.title, description: whole.description }) : undefined;
  const picked = wholeKey ?? loadedKey;
  const newCardCount = canvas.cards.filter((c) => c.kind === "ghost").length;
  const index = Math.min(cardIndex, Math.max(canvas.cards.length - 1, 0));
  const card = canvas.cards[index];

  // Clicking a fork's name only shows where it sits: select its owner card, light up the fork, scroll to it. No edit.
  const showFork = (forkId: string) => {
    const f = canvas.forks.find((x) => x.id === forkId);
    if (!f) return;
    setShownFork(forkId);
    setCardIndex(f.ownerIndex);
    setInsertAt(null);
    window.setTimeout(() => document.getElementById(`canvas-fork-${forkId}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" }), 0);
  };

  // The outline: select the card and bring it into view.
  const goToCard = (i: number) => {
    setCardIndex(i);
    setInsertAt(null);
    setShownFork(null);
    window.setTimeout(() => document.getElementById(`canvas-card-${i}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
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
            <h2 className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>{g}</h2>
            {GROUP_NOTE(g) && <p className="mb-2 text-[11px]" style={{ color: MUTED }} data-testid="group-note">{GROUP_NOTE(g)}</p>}
            {!GROUP_NOTE(g) && <div className="mb-2" />}
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
                  {showRequest ? "Hide build request" : "Show build request"}
                  {emptyRequestFields(draft).length > 0 ? ` (${emptyRequestFields(draft).length} to fill)` : ""}
                </button>
                {showRequest && <div id="request-details-panel"><RequestPanel draft={draft} edit={edit} /></div>}
                <DemoBar draft={draft} active={active} setActive={setActive} edit={edit} onDuplicate={duplicate} copyNote={isCopy} />
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
                <div className="flex flex-col items-start pb-4" data-testid="canvas-timeline">
                  <AddButton at={0} />
                  {canvas.cards.map((c, i) => (
                    <div key={i} className="flex w-full flex-col items-start">
                      <div className="flex w-full flex-col items-start gap-4 lg:flex-row">
                        <div className="w-full max-w-xl" id={`canvas-card-${i}`}>
                          <CardView card={c} selected={i === index} onSelect={() => { setCardIndex(i); setInsertAt(null); setShownFork(null); }} />
                          {canvas.forks.some((f) => f.ownerIndex === i) && (
                            // The decision hangs off the card above it: a rail down from the card, a tick into each fork.
                            <div className="ml-6 space-y-2 border-l-2 pb-1 pl-5 pt-2" style={{ borderColor: FORK_COLOR }} data-testid={`fork-rail-${i}`}>
                              {canvas.forks.filter((f) => f.ownerIndex === i).map((f) => (
                                <div key={f.id} id={`canvas-fork-${f.id}`} className="relative">
                                  <span aria-hidden className="absolute -left-5 top-6 w-5 border-t-2" style={{ borderColor: FORK_COLOR }} />
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
                          )}
                        </div>
                        {i === index && (
                          <section aria-label="Card detail" data-testid="card-detail" className="w-full shrink-0 rounded border bg-white p-3 lg:sticky lg:top-2 lg:w-[380px]" style={{ borderColor: INK }}>
                            <Detail
                              card={c}
                              forks={canvas.forks}
                              count={canvas.cards.length}
                              onAddBefore={() => setInsertAt(c.index)}
                              onAddAfter={() => setInsertAt(c.index + 1)}
                              onMove={(by) => { edit((d) => moveCard(d, c.index, by)); setCardIndex(c.index + by); }}
                              onRemove={() => edit((d) => removeCard(d, c.index))}
                              onVariant={(v) => edit((d) => setVariant(d, c.index, v))}
                              onGhost={(patch) => edit((d) => updateCard(d, c.index, patch))}
                            />
                          </section>
                        )}
                      </div>
                      <div className="my-1 flex items-center gap-2">
                        <AddButton at={i + 1} />
                        <span aria-hidden className="text-lg font-bold" style={{ color: MUTED }}>{i < canvas.cards.length - 1 ? "↓" : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
          {!detailOpen && <Strip side="right" label="outline" onOpen={() => setDetailOpen(true)} />}
          {detailOpen && <aside className="w-[360px] shrink-0 overflow-y-auto border-l bg-white p-4" style={{ borderColor: LINE }} aria-label="Outline">
            <div className="flex justify-end"><Collapse side="right" label="outline" onClose={() => setDetailOpen(false)} /></div>
            {insertAt !== null && (
              <InsertPanel
                draft={draft}
                at={insertAt}
                demoIndex={active}
                onCancel={() => setInsertAt(null)}
                onInsert={(c) => { edit((d) => insertBlock(d, insertAt, c)); setCardIndex(insertAt); setInsertAt(null); }}
                onGhost={() => { edit((d) => insertGhost(d, insertAt)); setCardIndex(insertAt); setInsertAt(null); }}
              />
            )}
            <nav aria-label="Steps outline" data-testid="outline">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Outline</h4>
              {canvas.cards.length === 0 && <p className="text-xs" style={{ color: MUTED }}>No cards yet.</p>}
              <ol className="space-y-0.5">
                {canvas.cards.map((c, i) => (
                  <li key={i}>
                    <button type="button" data-testid="outline-card" aria-current={i === index ? "step" : undefined} onClick={() => goToCard(i)} className="flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-sm" style={{ background: i === index ? INK : "transparent", color: i === index ? "#ffffff" : INK, opacity: c.disabled.length > 0 ? 0.5 : 1 }}>
                      <span className="w-5 shrink-0 text-xs font-bold">{i + 1}.</span>
                      {(() => { const I = c.kind === "ghost" ? Sparkles : LANE_ICON[c.lane]; return <I size={14} aria-hidden className="shrink-0 self-center" style={{ color: i === index ? "#ffffff" : LANE_COLOR[c.lane] }} />; })()}
                      <span className="min-w-0 flex-1">{c.label}{c.disabled.length > 0 && <span className="text-[11px]"> (disabled)</span>}</span>
                    </button>
                    {canvas.forks.filter((f) => f.ownerIndex === i).map((f) => (
                      <button key={f.id} type="button" data-testid="outline-fork" onClick={() => showFork(f.id)} className="ml-7 block w-[calc(100%-1.75rem)] rounded px-2 py-0.5 text-left text-xs" style={{ color: MUTED }}>
                        <GitFork size={12} aria-hidden className="mr-1 inline" style={{ color: FORK_COLOR }} />{f.label}
                      </button>
                    ))}
                  </li>
                ))}
              </ol>
            </nav>

            <section className="mt-6 border-t pt-4" style={{ borderColor: LINE }} aria-label="Export">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Export</h4>
              {canvas.exportProblems.length === 0 && clashes.length > 0 && (
                <div role="alert" className="mb-3 rounded border p-3 text-xs" style={{ borderColor: INK }} data-testid="export-clash">
                  <p className="mb-1 font-semibold">This demo id is already in the brand file:</p>
                  <ul className="list-disc pl-4">{clashes.map((c) => <li key={c}>{c}</li>)}</ul>
                  <p className="mt-1" style={{ color: MUTED }}>Applying would replace that entry. Rename the demo in "Name in the dropdown" to make a new one.</p>
                </div>
              )}
              {canvas.exportProblems.length > 0 ? (
                <div role="alert" className="mb-3 rounded border p-3 text-xs" style={{ borderColor: INK }} data-testid="export-problems">
                  <p className="mb-1 font-semibold">Export is blocked until these are fixed:</p>
                  <ul className="list-disc pl-4">{canvas.exportProblems.map((p) => <li key={p}>{p}</li>)}</ul>
                  <p className="mt-1" style={{ color: MUTED }}>Fill the rest under "Build request".</p>
                  <button type="button" className="mt-2 rounded border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: INK }} onClick={() => { setShowRequest(true); window.setTimeout(() => document.querySelector("[data-testid=request-panel]")?.scrollIntoView?.({ block: "center" }), 0); }}>Open build request</button>
                </div>
              ) : (
                <p className="mb-3 text-xs" style={{ color: MUTED }}>Nothing blocks the export.</p>
              )}
              <button type="button" disabled={canvas.exportProblems.length > 0 || clashes.length > 0 || busy} onClick={send} className="rounded px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40" style={{ background: INK }}>
                {busy ? "Exporting" : "Export the build files"}
              </button>
              {newCardCount === 0 ? (
                <div className="mt-3" data-testid="build-now">
                  <button type="button" disabled={canvas.exportProblems.length > 0 || clashes.length > 0 || busy || building} onClick={build} className="inline-flex items-center gap-1.5 rounded border-2 px-3 py-1.5 text-sm font-semibold disabled:opacity-40" style={{ borderColor: INK }}>
                    <Hammer size={14} aria-hidden />
                    {building ? "Building" : "Build it now"}
                  </button>
                  <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                    Exports the files, then applies the request to <code>brands/{draft.client.trim() || "<client>"}/brand.json</code> and runs the brand test. Needs a short-lived branch and no uncommitted changes to that file. It never commits.
                  </p>
                  {built && (
                    <div role={built.ok ? "status" : "alert"} className="mt-2 rounded border p-2 text-xs" style={{ borderColor: built.ok ? INK : "#b91c1c" }} data-testid="build-result" data-ok={built.ok}>
                      <p className="mb-1 font-bold">{built.ok ? "Built." : "Not built."}</p>
                      <ul className="list-disc space-y-0.5 pl-4">{built.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
                      {built.ok && <p className="mt-1" style={{ color: MUTED }}>Review the diff and commit it. Reload the page if the demo is not in the list yet.</p>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-[11px]" style={{ color: MUTED }} data-testid="build-needs-claude">
                  This request has {newCardCount} new card{newCardCount === 1 ? "" : "s"}. A script cannot build those. Export, then give the prompt file to Claude Code.
                </p>
              )}
              {result?.ok && <p className="mt-3 text-xs" data-testid="export-written">Wrote <code>{result.written.join("</code> and <code>")}</code></p>}
              <ExportInstructions draft={draft} newCards={newCardCount} />
              {result && !result.ok && <ul className="mt-3 list-disc pl-4 text-xs" data-testid="export-failed">{result.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
            </section>
          </aside>}
        </>
      )}
    </div>
  );
}
