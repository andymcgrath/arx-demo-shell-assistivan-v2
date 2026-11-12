import type { CatalogApp, CatalogLane, CatalogTrigger } from "@/workflows/catalog";
import { CATALOG_PAYERS, requirementLabel } from "@/workflows/catalog";
import type { CanvasBoard, CanvasCard, CanvasExit, CanvasFork } from "@/workflows/catalog/canvas";

/** The canvas's pieces: a card, a fork under its owner card, and the detail panel. Presentation only. */

export const INK = "#0f172a";
export const MUTED = "#64748b";
export const LINE = "#cbd5e1";
const SOFT = "#f1f5f9";

export const LANE_LABEL: Record<CatalogLane, string> = { hcp: "HCP", patient: "Patient", agent: "Agent", system: "System" };
const LANE_COLOR: Record<CatalogLane, string> = { hcp: "#0284c7", patient: "#16a34a", agent: "#7c3aed", system: "#64748b" };
const APP_LABEL: Record<CatalogApp, string> = { crm: "CRM", patient: "Patient", provider: "Provider", field: "Field", iassist: "iAssist", rules: "Rules", web: "Web page", gateway: "Gateway" };
const TRIGGER_LABEL: Record<CatalogTrigger, string> = { click: "click", text: "text", automatic: "automatic", view: "view" };

export function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: strong ? INK : SOFT, color: strong ? "#ffffff" : INK }}>
      {children}
    </span>
  );
}

export function CardView({ card, selected, onSelect }: { card: CanvasCard; selected: boolean; onSelect: () => void }) {
  const off = card.disabled.length > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid="canvas-card"
      data-module={card.moduleId}
      data-variant={card.variantId ?? ""}
      data-disabled={off}
      className="w-full rounded border bg-white p-3 text-left"
      style={{
        borderColor: selected ? INK : LINE,
        borderWidth: selected ? 2 : 1,
        borderStyle: off ? "dashed" : "solid",
        borderLeft: `5px solid ${LANE_COLOR[card.lane]}`,
        opacity: off ? 0.5 : 1,
      }}
    >
      <span className="block text-[11px] font-bold uppercase" style={{ color: LANE_COLOR[card.lane] }}>
        {card.index + 1}. {LANE_LABEL[card.lane]}
      </span>
      <span className="block text-sm font-bold leading-tight">{card.label}</span>
      {card.label !== card.blockName && (
        <span className="block text-[11px]" style={{ color: MUTED }}>
          {card.blockName}
        </span>
      )}
      <span className="mt-1 flex flex-wrap gap-1">
        {card.apps.map((a) => (
          <Chip key={a}>{APP_LABEL[a]}</Chip>
        ))}
      </span>
      {off && <span className="mt-1 block text-[11px] font-semibold">Disabled for this outcome</span>}
    </button>
  );
}

function ExitView({ exit, cards, fork }: { exit: CanvasExit; cards: CanvasCard[]; fork: CanvasFork }) {
  const story = fork.chooser === "story";
  const dim = exit.missing.length > 0 && story;
  return (
    <li
      className="rounded border px-2 py-1.5 text-xs"
      style={{ borderColor: exit.selected ? INK : LINE, background: exit.selected ? INK : "#ffffff", color: exit.selected ? "#ffffff" : INK, opacity: dim ? 0.5 : 1 }}
      data-testid="canvas-exit"
      data-exit={exit.id}
      data-selected={exit.selected}
    >
      <span className="font-semibold">{exit.label}</span>
      {exit.payer && (
        <span className="ml-1 opacity-80">
          ({CATALOG_PAYERS[exit.payer].label}, {exit.paRequired ? "PA required" : "no PA"})
        </span>
      )}
      {story && <span className="block opacity-80">{exit.description}</span>}
      {exit.steps.length > 0 && (
        <ol className="mt-1 list-decimal pl-4">
          {exit.steps.map((s, i) => (
            <li key={i}>{s.label}</li>
          ))}
        </ol>
      )}
      {!story && exit.leaves.length > 0 && (
        <span className="mt-1 block opacity-80">Not used on this branch: {exit.leaves.map((i) => cards[i].label).join(", ")}</span>
      )}
      {exit.missing.length > 0 && <span className="block font-semibold">This recipe lacks: {exit.missing.map(requirementLabel).join(", ")}</span>}
    </li>
  );
}

export function ForkView({ fork, cards }: { fork: CanvasFork; cards: CanvasCard[] }) {
  return (
    <div className="rounded border bg-white p-2" style={{ borderColor: LINE }} data-testid={`canvas-fork-${fork.id}`} data-chooser={fork.chooser}>
      <p className="text-xs font-bold">{fork.label}</p>
      <p className="mb-1 text-[11px]" style={{ color: MUTED }}>
        {fork.chooser === "patient" ? "The patient picks live. Each branch is below." : "The story picks. Each outcome is a demo."}
      </p>
      <ul className="space-y-1">
        {fork.exits.map((e) => (
          <ExitView key={e.id} exit={e} cards={cards} fork={fork} />
        ))}
      </ul>
    </div>
  );
}

export function Detail({ card, forks }: { card: CanvasCard; forks: CanvasFork[] }) {
  const owned = forks.filter((f) => f.ownerIndex === card.index);
  return (
    <div data-testid="canvas-detail">
      <p className="text-[11px] font-bold uppercase" style={{ color: LANE_COLOR[card.lane] }}>
        Card {card.index + 1} · {LANE_LABEL[card.lane]} · {TRIGGER_LABEL[card.trigger]}
      </p>
      <h3 className="text-base font-bold leading-tight">{card.label}</h3>
      {card.label !== card.blockName && (
        <p className="text-xs" style={{ color: MUTED }}>
          {card.blockName}
        </p>
      )}
      <p className="mt-2 text-sm">{card.summary}</p>
      <p className="mt-2 flex flex-wrap gap-1">
        {card.apps.map((a) => (
          <Chip key={a}>{APP_LABEL[a]}</Chip>
        ))}
      </p>
      {card.disabled.length > 0 && (
        <div role="alert" className="mt-3 rounded border p-2 text-xs" style={{ borderColor: INK }}>
          <p className="font-bold">Disabled for this outcome</p>
          <ul className="list-disc pl-4">
            {card.disabled.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
        Steps
      </h4>
      <ol className="space-y-1">
        {card.steps.map((s, i) => (
          <li key={i} className="text-xs">
            <span className="mr-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: LANE_COLOR[s.lane] }}>
              {LANE_LABEL[s.lane]}
            </span>
            <Chip strong>{TRIGGER_LABEL[s.trigger]}</Chip> {s.label}
          </li>
        ))}
      </ol>
      <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
        Takes in
      </h4>
      <p className="text-xs">{card.inputs.length ? card.inputs.join(", ") : "Nothing. It starts the case or waits on nothing earlier."}</p>
      <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
        Sets
      </h4>
      <p className="text-xs">{card.outputs.length ? card.outputs.join(", ") : "Nothing the later cards read."}</p>
      {owned.length > 0 && (
        <>
          <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>
            Forks under this card
          </h4>
          <p className="text-xs">{owned.map((f) => f.label).join(", ")}</p>
        </>
      )}
    </div>
  );
}

export function Header({ canvas }: { canvas: CanvasBoard }) {
  const b = canvas.board;
  return (
    <>
      <h2 className="text-lg font-bold">{b.title}</h2>
      {b.description && <p className="mb-2 max-w-3xl text-sm">{b.description}</p>}
      <p className="mb-4 flex flex-wrap gap-1 text-xs" style={{ color: MUTED }}>
        <Chip>Intake: {b.intake}</Chip>
        {b.legacy && <Chip>Legacy</Chip>}
        <Chip>Starts: {b.source}</Chip>
        {b.panels.map((p) => (
          <Chip key={p}>Panel: {p}</Chip>
        ))}
        {b.triage && <Chip>Triage: {b.triage}</Chip>}
      </p>
      {canvas.problems.length > 0 && (
        <div role="alert" className="mb-4 rounded border p-3 text-sm" style={{ borderColor: INK }}>
          The catalog could not draw all of this:
          <ul className="list-disc pl-5">
            {canvas.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
