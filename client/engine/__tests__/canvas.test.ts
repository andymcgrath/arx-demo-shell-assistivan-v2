import { describe, it, expect } from "vitest";
import path from "node:path";
import { listBrandSlugs, resolveBrand } from "@/brand/resolve";
import type { BrandDemo } from "@/brand/schema";
import { ALL_SCENARIOS, scenarioFor } from "@/workflows/scenarios";
import { buildCanvas, type CanvasBoard } from "@/workflows/catalog/canvas";

/** The canvas model draws every recipe and demo, keeps disabled cards on the canvas, and reads patient-fork steps from the recipe. */

const canvas = (flow: string, choices?: Record<string, string>) => buildCanvas({ flow: flow as never, title: flow, choices }) as CanvasBoard;

describe("canvas for every recipe", () => {
  for (const s of ALL_SCENARIOS.filter((x) => x.recipe)) {
    it(`${s.flowType} draws every card and puts every fork under a card, with nothing disabled`, () => {
      const c = canvas(s.flowType);
      expect(c.kind).toBe("canvas");
      expect(c.problems).toEqual([]);
      expect(c.cards.map((x) => x.moduleId)).toEqual(s.recipe!.modules.map((m) => m.id));
      for (const card of c.cards) {
        expect(card.steps.length, card.label).toBeGreaterThan(0);
        expect(card.disabled, `${card.label} is disabled by the recipe's own picks`).toEqual([]);
      }
      for (const f of c.forks) {
        expect(f.ownerIndex).toBeGreaterThanOrEqual(0);
        expect(f.ownerIndex).toBeLessThan(c.cards.length);
        if (f.chooser === "patient") for (const e of f.exits) expect(e.steps.length, `${f.id}.${e.id} has no steps here`).toBeGreaterThan(0);
      }
    });
  }
});

describe("canvas outcomes", () => {
  it("keeps a card a changed outcome no longer feeds, disabled, with the reason", () => {
    const c = canvas("CoA_DTP", { bi: "medical_covered" });
    const by = (id: string) => c.cards.find((x) => x.moduleId === id)!;
    expect(c.cards).toHaveLength(7);
    expect(by("payment").disabled[0]).toMatch(/does not work with this block/);
    expect(by("cash_offer").disabled.length).toBe(1);
    // Cards before the fork's owner and cards that take input from every outcome stay live.
    expect(by("enrollment").disabled).toEqual([]);
    expect(by("tracking").disabled).toEqual([]);
  });

  it("draws a patient fork's outcomes as branches, with the steps for this recipe", () => {
    const steps = (flow: string, exit: string) =>
      canvas(flow).forks.find((f) => f.id === "pricing")!.exits.find((e) => e.id === exit)!.steps.map((s) => s.label);
    expect(steps("CoA_Copay", "retail").join(" ")).toMatch(/retail store/);
    expect(steps("CoA_DTP", "retail").join(" ")).toMatch(/ship date/);
    const pricing = canvas("CoA_Copay").forks.find((f) => f.id === "pricing")!;
    // A branch lists the cards it feeds and the ones it leaves off.
    const retail = pricing.exits.find((e) => e.id === "retail")!;
    expect(retail.feeds.length + retail.leaves.length).toBe(canvas("CoA_Copay").cards.length - 1 - pricing.ownerIndex);
  });

  it("returns the whole-demo board for a scenario with no recipe", () => {
    const whole = ALL_SCENARIOS.find((s) => !s.recipe);
    if (whole) expect(buildCanvas({ flow: whole.flowType, title: "x" }).kind).toBe("whole");
  });
});

describe("canvas for every brand's demos", () => {
  const brandsDir = path.join(process.cwd(), "brands");
  for (const slug of listBrandSlugs(brandsDir)) {
    const demos = (resolveBrand(brandsDir, slug).demos ?? []) as BrandDemo[];
    it(`${slug}: every demo draws with no problems, and a card is disabled only where the demo changes the outcome`, () => {
      for (const d of demos) {
        const c = buildCanvas({ flow: d.flow, title: d.label, choices: d.choices });
        if (c.kind === "whole") continue;
        expect(c.problems, `${slug} demo ${d.id}`).toEqual([]);
        const own = { ...scenarioFor(d.flow)!.recipe!.choices, ...scenarioFor(d.flow)!.choices } as Record<string, string>;
        const changed = Object.entries(d.choices ?? {}).some(([fork, exit]) => own[fork] !== exit);
        if (!changed) expect(c.cards.flatMap((x) => x.disabled), `${slug} demo ${d.id}`).toEqual([]);
      }
    });
  }
});
