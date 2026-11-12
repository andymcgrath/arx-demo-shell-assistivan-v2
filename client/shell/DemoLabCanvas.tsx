import { useMemo, useState } from "react";
import { useItems } from "./DemoLabItems";
import { buildCanvas } from "@/workflows/catalog/canvas";
import { CardView, Chip, Detail, ForkView, Header, INK, LINE, MUTED } from "./DemoLabCanvasParts";
import { CATALOG_APPS_LABEL } from "./DemoLabCanvasLabels";

/**
 * Demo Lab, Canvas tab. Read only. A horizontal row of cards in journey order. Click a card for its detail. Each fork sits
 * under the card that owns it. A story fork shows its outcomes with the picked one highlighted, and the cards that outcome
 * no longer feeds stay on the row, disabled. A patient fork shows each branch with the steps that follow it.
 * The first step of the canvas plan (docs/plans/PLAN_DEMO_LAB_CANVAS.md). Editing comes next.
 */

export default function CanvasLab() {
  const items = useItems();
  const [selected, setSelected] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const item = items[selected];
  const canvas = useMemo(() => (item ? buildCanvas({ flow: item.flow, title: item.title, description: item.description, choices: item.choices }) : undefined), [item]);
  const groups = [...new Set(items.map((i) => i.group))];
  const pick = (i: number) => {
    setSelected(i);
    setCardIndex(0);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-[260px] shrink-0 overflow-y-auto border-r bg-white p-4" style={{ borderColor: LINE }}>
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
                      onClick={() => pick(i)}
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

      {!canvas ? (
        <main className="flex-1 p-5 text-sm">Nothing to draw.</main>
      ) : canvas.kind === "whole" ? (
        <main className="min-w-0 flex-1 overflow-y-auto p-5" data-testid="canvas-whole">
          <h2 className="text-lg font-bold">{canvas.title}</h2>
          <div className="mt-3 max-w-3xl rounded border bg-white p-4" style={{ borderColor: LINE }}>
            <p className="text-sm font-bold">{canvas.demo?.name}</p>
            <p className="mt-1 text-sm">{canvas.demo?.summary}</p>
            <p className="mt-2 flex flex-wrap gap-1">{canvas.demo?.apps.map((a) => <Chip key={a}>{CATALOG_APPS_LABEL[a]}</Chip>)}</p>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>
              This workflow has no recipe, so it is one whole demo. It is not drawn as cards.
            </p>
          </div>
        </main>
      ) : (
        <>
          <main className="min-w-0 flex-1 overflow-auto p-5" data-testid="canvas">
            <Header canvas={canvas} />
            <div className="flex items-start gap-0 pb-4">
              {canvas.cards.map((card, i) => (
                <div key={i} className="flex items-start">
                  <div className="w-[240px] shrink-0 space-y-2">
                    <CardView card={card} selected={i === cardIndex} onSelect={() => setCardIndex(i)} />
                    {canvas.forks.filter((f) => f.ownerIndex === i).map((f) => (
                      <ForkView key={f.id} fork={f} cards={canvas.cards} />
                    ))}
                  </div>
                  {i < canvas.cards.length - 1 && (
                    <span aria-hidden className="mx-1 mt-6 shrink-0 text-lg font-bold" style={{ color: MUTED }}>
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </main>
          <aside className="w-[340px] shrink-0 overflow-y-auto border-l bg-white p-4" style={{ borderColor: LINE }} aria-label="Card detail">
            {canvas.cards[cardIndex] && <Detail card={canvas.cards[cardIndex]} forks={canvas.forks} />}
          </aside>
        </>
      )}
    </div>
  );
}
