import type { CatalogApp, CatalogLane, CatalogTrigger } from "@/workflows/catalog";
import { ClipboardCheck, Cog, GitFork, Layers, Sparkles, Stethoscope, UserRound, type LucideIcon } from "lucide-react";
import { CATALOG_BLOCKS, CATALOG_PAYERS, pickerCards, requirementLabel } from "@/workflows/catalog";
import type { CanvasBoard, CanvasCard, CanvasExit, CanvasFork } from "@/workflows/catalog/canvas";

/** The canvas's read pieces: a card, a fork under its owner card, and the header. Presentation only. Editing controls are in DemoLabCanvasEdit. */

export const INK = "#0f172a";
export const MUTED = "#64748b";
export const LINE = "#cbd5e1";
export const SOFT = "#f1f5f9";

export const LANE_LABEL: Record<CatalogLane, string> = { hcp: "HCP", patient: "Patient", agent: "Case manager", system: "System" };
export const LANE_COLOR: Record<CatalogLane, string> = { hcp: "#0284c7", patient: "#16a34a", agent: "#7c3aed", system: "#64748b" };
/** One icon per lane, so a card's type reads at a glance: who acts. */
export const LANE_ICON: Record<CatalogLane, LucideIcon> = { hcp: Stethoscope, patient: UserRound, agent: ClipboardCheck, system: Cog };

/** A variant is a choice of how one block plays. It gets its own color so it stands out from lanes and forks. */
export const VARIANT_COLOR = "#be185d";

/** How many variants a card's block offers in the picker. 0 when the block has none, or the card is new. */
export const variantCount = (card: CanvasCard): number => {
  const block = card.moduleId ? CATALOG_BLOCKS[card.moduleId] : undefined;
  return block?.variants ? pickerCards(block).length : 0;
};

/** A fork is a decision moment, so it gets its own color and a diamond, the flow-diagram shape for a decision. */
export const FORK_COLOR = "#0d9488";

export function ForkBadge({ size = 30 }: { size?: number }) {
  const box = Math.round(size * 0.68);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} data-fork-icon title="Decision: the demo can branch here">
      <span className="absolute rounded-[3px]" style={{ width: box, height: box, background: FORK_COLOR, transform: "rotate(45deg)" }} />
      <GitFork size={Math.round(size * 0.46)} aria-hidden className="relative text-white" />
    </span>
  );
}

/** A round badge in the lane's color with its icon. A new (ghost) card shows a sparkle instead. */
export function LaneBadge({ lane, size = 30, ghost }: { lane: CatalogLane; size?: number; ghost?: boolean }) {
  const Icon = ghost ? Sparkles : LANE_ICON[lane];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full text-white" style={{ background: LANE_COLOR[lane], width: size, height: size }} data-lane-icon={ghost ? "new" : lane} title={`${LANE_LABEL[lane]}${ghost ? ", new" : ""}`}>
      <Icon size={Math.round(size * 0.58)} aria-hidden />
    </span>
  );
}

export const APP_LABEL: Record<CatalogApp, string> = { crm: "CRM", patient: "Patient", provider: "Provider", field: "Field", iassist: "iAssist", rules: "Rules", web: "Web page", gateway: "Gateway" };
export const TRIGGER_LABEL: Record<CatalogTrigger, string> = { click: "click", text: "text", automatic: "automatic", view: "view" };

export function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: strong ? INK : SOFT, color: strong ? "#ffffff" : INK }}>
      {children}
    </span>
  );
}

export function CardView({ card, selected, onSelect }: { card: CanvasCard; selected: boolean; onSelect: () => void }) {
  const off = card.disabled.length > 0;
  const ghost = card.kind === "ghost";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid="canvas-card"
      data-module={card.moduleId ?? "ghost"}
      data-variant={card.variantId ?? ""}
      data-disabled={off}
      className="w-full rounded border p-3 text-left"
      style={{
        borderColor: selected ? INK : LINE,
        borderWidth: selected ? 2 : 1,
        borderStyle: off || ghost ? "dashed" : "solid",
        borderLeft: `5px ${ghost ? "dashed" : "solid"} ${LANE_COLOR[card.lane]}`,
        background: `${LANE_COLOR[card.lane]}0f`,
        opacity: off ? 0.5 : 1,
      }}
    >
      <span className="flex items-center gap-2">
        <LaneBadge lane={card.lane} ghost={ghost} />
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase" style={{ color: LANE_COLOR[card.lane] }}>
            {card.index + 1}. {LANE_LABEL[card.lane]}
            {ghost && " · New"}
          </span>
          <span className="block text-sm font-bold leading-tight">{card.label}</span>
        </span>
      </span>
      {card.blockName && card.label !== card.blockName && (
        <span className="block text-[11px]" style={{ color: MUTED }}>
          {card.blockName}
        </span>
      )}
      {variantCount(card) > 1 && (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: VARIANT_COLOR }} data-testid="card-variants" title="This block can play more than one way. Pick the variant in the detail panel.">
          <Layers size={11} aria-hidden />
          {variantCount(card)} variants
        </span>
      )}
      <span className="mt-1 flex flex-wrap gap-1">
        {card.apps.map((a) => (
          <Chip key={a}>{APP_LABEL[a]}</Chip>
        ))}
      </span>
      {off && <span className="mt-1 block text-[11px] font-semibold">Disabled for this outcome</span>}
      {card.issues.length > 0 && <span className="mt-1 block rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: INK }} data-testid="card-issue">Fix before export: {card.issues[0]}</span>}
    </button>
  );
}

function ExitView({ exit, cards, fork, onPick, onClear }: { exit: CanvasExit; cards: CanvasCard[]; fork: CanvasFork; onPick?: () => void; onClear?: () => void }) {
  const story = fork.chooser === "story";
  const blocked = exit.missing.length > 0;
  const body = (
    <>
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
      {!story && exit.leaves.length > 0 && <span className="mt-1 block opacity-80">Not used on this branch: {exit.leaves.map((i) => cards[i].label).join(", ")}</span>}
      {blocked && <span className="block font-semibold">Needs: {exit.missing.map(requirementLabel).join(", ")}</span>}
    </>
  );
  const style = { borderColor: exit.selected ? INK : LINE, background: exit.selected ? INK : "#ffffff", color: exit.selected ? "#ffffff" : INK, opacity: blocked && !exit.selected ? 0.5 : 1 };
  return (
    <li data-testid="canvas-exit" data-exit={exit.id} data-selected={exit.selected}>
      {story && onPick ? (
        <button type="button" onClick={onPick} disabled={blocked && !exit.selected} className="w-full rounded border px-2 py-1.5 text-left text-xs" style={style}>
          {body}
        </button>
      ) : (
        <div className="rounded border px-2 py-1.5 text-xs" style={style}>
          {body}
          {!story && (onPick || onClear) && (
            <button type="button" onClick={exit.selected ? onClear : onPick} disabled={blocked && !exit.selected} className="mt-1 block rounded border px-1.5 py-0.5 text-[11px] font-semibold disabled:opacity-40" style={{ borderColor: exit.selected ? "#ffffff" : INK }}>
              {exit.selected ? "Let the patient choose again" : "Always play this branch"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function ForkView({ fork, cards, onPick, onClear, highlight }: { fork: CanvasFork; cards: CanvasCard[]; onPick?: (exitId: string) => void; onClear?: (forkId: string) => void; highlight?: boolean }) {
  return (
    <div className={`rounded bg-white p-2 ${highlight ? "border-2" : "border"}`} style={{ borderColor: highlight ? "#f59e0b" : LINE, boxShadow: highlight ? "0 0 0 3px #fef3c7" : undefined }} data-testid={`canvas-fork-${fork.id}`} data-chooser={fork.chooser} data-highlight={highlight ? "true" : undefined}>
      <div className="mb-1 flex items-center gap-2">
        <ForkBadge />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase" style={{ color: FORK_COLOR }}>Decision</p>
          <p className="text-xs font-bold">{fork.label}</p>
        </div>
      </div>
      <p className="mb-1 text-[11px]" style={{ color: MUTED }}>
        {fork.chooser === "patient" ? "The patient chooses on screen. Each branch is below. To skip the choice, set one branch to always play in this demo." : "The story picks. Each outcome is a demo."}
      </p>
      <ul className="space-y-1">
        {fork.exits.map((e) => (
          <ExitView key={e.id} exit={e} cards={cards} fork={fork} onPick={onPick && (() => onPick(e.id))} onClear={onClear && (() => onClear(fork.id))} />
        ))}
      </ul>
    </div>
  );
}

export function Header({ canvas }: { canvas: CanvasBoard }) {
  const m = canvas.meta;
  return (
    <>
      <h2 className="text-lg font-bold">{m.title || "Untitled demo"}</h2>
      {m.description && <p className="mb-2 max-w-3xl text-sm">{m.description}</p>}
      <p className="mb-3 flex flex-wrap gap-1 text-xs" style={{ color: MUTED }}>
        <Chip>Intake: {m.intake}</Chip>
        <Chip>Starts: {m.workflow}</Chip>
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
