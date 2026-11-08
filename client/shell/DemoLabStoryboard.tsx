import { useMemo, useState } from "react";
import { useItems } from "./DemoLabItems";
import { buildStoryboard, STORYBOARD_LANES, type AnyStoryboard, type Storyboard, type StoryboardFork } from "@/workflows/catalog/storyboard";
import type { ModuleId } from "@/engine/workflow/components";
import { CATALOG_BLOCKS, CATALOG_PAYERS, type CatalogApp, type CatalogLane, type CatalogTrigger } from "@/workflows/catalog";

/**
 * Demo Lab, Storyboard tab. Read only. Draws each recipe and each of the brand's demos from the catalog: a strip of
 * forks with the chosen exit highlighted, then lanes (HCP, patient, agent, system) with one column per block.
 * It is not a chain. Each block says what it waits for. Nothing is saved here.
 */

const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#cbd5e1";
const SOFT = "#f1f5f9";

const LANE_LABEL: Record<CatalogLane, string> = { hcp: "HCP", patient: "Patient", agent: "Agent", system: "System" };
const TRIGGER_LABEL: Record<CatalogTrigger, string> = { click: "click", text: "text", automatic: "automatic", view: "view" };
const APP_LABEL: Record<CatalogApp, string> = { crm: "CRM", patient: "Patient", provider: "Provider", field: "Field", iassist: "iAssist", rules: "Rules", web: "Web page", gateway: "Gateway" };

/** A required block as sales names it. `module:variant` shows the module's name. */
const blockName = (req: string): string => CATALOG_BLOCKS[req.split(":")[0] as ModuleId]?.name ?? req;

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: strong ? INK : SOFT, color: strong ? "#ffffff" : INK }}
    >
      {children}
    </span>
  );
}

function ForkStrip({ forks }: { forks: StoryboardFork[] }) {
  if (!forks.length) return null;
  return (
    <section className="mb-5" aria-label="Forks">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
        Forks
      </h3>
      <div className="flex flex-wrap gap-3">
        {forks.map((f) => (
          <div key={f.id} className="min-w-[260px] max-w-[340px] flex-1 rounded border bg-white p-3" style={{ borderColor: LINE }} data-testid={`fork-${f.id}`}>
            <p className="text-sm font-bold">{f.label}</p>
            <p className="mb-2 text-xs" style={{ color: MUTED }}>
              {f.chooser === "patient" ? "The patient picks live." : "The story picks. The presenter never does."}
            </p>
            <ul className="space-y-1.5">
              {f.exits.map((e) => (
                <li
                  key={e.id}
                  className="rounded border px-2 py-1.5 text-xs"
                  style={{
                    borderColor: e.selected ? INK : LINE,
                    background: e.selected ? INK : "#ffffff",
                    color: e.selected ? "#ffffff" : INK,
                    opacity: e.missing.length ? 0.45 : 1,
                  }}
                  data-selected={e.selected}
                  data-exit={e.id}
                >
                  <span className="font-semibold">{e.label}</span>
                  {e.payer && (
                    <span className="ml-1 opacity-80">
                      ({CATALOG_PAYERS[e.payer].label}, {e.paRequired ? "PA required" : "no PA"})
                    </span>
                  )}
                  <span className="block opacity-80">{e.description}</span>
                  {e.missing.length > 0 && <span className="block font-semibold">This recipe lacks: {e.missing.map(blockName).join(", ")}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Lanes({ board }: { board: Storyboard }) {
  const cols = board.blocks.length;
  return (
    <section aria-label="Lanes" className="overflow-x-auto">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
        Blocks by lane
      </h3>
      <div className="grid gap-px rounded border" style={{ gridTemplateColumns: `88px repeat(${cols}, minmax(210px, 1fr))`, background: LINE, borderColor: LINE }}>
        <div className="bg-white" />
        {board.blocks.map((b, i) => (
          <div key={i} className="bg-white p-2" data-testid="block-card" data-module={b.moduleId} data-variant={b.variantId ?? ""}>
            <p className="text-sm font-bold leading-tight">{b.label}</p>
            {b.label !== b.blockName && (
              <p className="text-[11px]" style={{ color: MUTED }}>
                {b.blockName}
              </p>
            )}
            <p className="mt-1 text-xs">{b.summary}</p>
            <p className="mt-1 flex flex-wrap gap-1">
              {b.apps.map((a) => (
                <Chip key={a}>{APP_LABEL[a]}</Chip>
              ))}
            </p>
            {b.waitsFor.length > 0 && (
              <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                Waits for: {b.waitsFor.join(", ")}
              </p>
            )}
          </div>
        ))}
        {STORYBOARD_LANES.map((lane) => (
          <LaneRow key={lane} lane={lane} board={board} />
        ))}
      </div>
    </section>
  );
}

function LaneRow({ lane, board }: { lane: CatalogLane; board: Storyboard }) {
  return (
    <>
      <div className="sticky left-0 flex items-start bg-white p-2 text-xs font-bold" style={{ background: SOFT }}>
        {LANE_LABEL[lane]}
      </div>
      {board.blocks.map((b, i) => {
        const steps = b.steps.filter((s) => s.lane === lane);
        return (
          <div key={i} className="min-h-[44px] bg-white p-2" data-lane={lane}>
            {steps.map((s, j) => (
              <p key={j} className="mb-1 text-xs">
                <Chip strong>{TRIGGER_LABEL[s.trigger]}</Chip> {s.label}
              </p>
            ))}
          </div>
        );
      })}
    </>
  );
}

function Board({ board }: { board: AnyStoryboard }) {
  return (
    <div data-testid="storyboard">
      <h2 className="text-lg font-bold">{board.title}</h2>
      {board.description && <p className="mb-2 max-w-3xl text-sm">{board.description}</p>}
      <p className="mb-4 flex flex-wrap gap-1 text-xs" style={{ color: MUTED }}>
        <Chip>Intake: {board.intake}</Chip>
        {board.legacy && <Chip>Legacy</Chip>}
        {board.kind === "recipe" && <Chip>Starts: {board.source}</Chip>}
        {board.kind === "recipe" && board.panels.map((p) => <Chip key={p}>Panel: {p}</Chip>)}
        {board.kind === "recipe" && board.triage && <Chip>Triage: {board.triage}</Chip>}
      </p>
      {board.problems.length > 0 && (
        <div role="alert" className="mb-4 rounded border p-3 text-sm" style={{ borderColor: INK }}>
          The catalog could not draw all of this:
          <ul className="list-disc pl-5">
            {board.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {board.kind === "whole" ? (
        <div className="max-w-3xl rounded border bg-white p-4" style={{ borderColor: LINE }} data-testid="whole-demo">
          {board.demo ? (
            <>
              <p className="text-sm font-bold">{board.demo.name}</p>
              <p className="mt-1 text-sm">{board.demo.summary}</p>
              <p className="mt-2 flex flex-wrap gap-1">
                {board.demo.apps.map((a) => (
                  <Chip key={a}>{APP_LABEL[a]}</Chip>
                ))}
              </p>
              <p className="mt-2 text-xs" style={{ color: MUTED }}>
                This workflow has no recipe, so it is one whole demo. It is not drawn as blocks.
              </p>
            </>
          ) : null}
        </div>
      ) : (
        <>
          <ForkStrip forks={board.forks} />
          <Lanes board={board} />
        </>
      )}
    </div>
  );
}

export default function StoryboardLab() {
  const items = useItems();
  const [selected, setSelected] = useState(0);
  const item = items[selected];
  const board = useMemo(() => (item ? buildStoryboard({ flow: item.flow, title: item.title, description: item.description, choices: item.choices }) : undefined), [item]);
  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-[300px] shrink-0 overflow-y-auto border-r bg-white p-4" style={{ borderColor: LINE }}>
        {groups.map((g) => (
          <div key={g} className="mb-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
              {g}
            </h2>
            <ol>
              {items.map((it, i) =>
                it.group !== g ? null : (
                  <li key={it.key}>
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      aria-current={i === selected}
                      className="mb-1 w-full rounded border px-2 py-1.5 text-left text-sm"
                      style={{ borderColor: i === selected ? INK : LINE, background: i === selected ? INK : "#ffffff", color: i === selected ? "#ffffff" : INK }}
                    >
                      {it.title}
                    </button>
                  </li>
                ),
              )}
            </ol>
          </div>
        ))}
        <p className="text-xs" style={{ color: MUTED }}>
          Read only. The demos are the active brand's. Run with another <code>BRAND</code> to see its demos.
        </p>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto p-5">{board ? <Board board={board} /> : <p className="text-sm">Nothing to draw.</p>}</main>
    </div>
  );
}
