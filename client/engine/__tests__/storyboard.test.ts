import { describe, it, expect } from "vitest";
import path from "node:path";
import { listBrandSlugs, resolveBrand } from "@/brand/resolve";
import type { BrandDemo } from "@/brand/schema";
import type { FlowType } from "@/engine/types";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { buildStoryboard, STORYBOARD_LANES, type Storyboard, type WholeDemoBoard } from "@/workflows/catalog/storyboard";

/**
 * The storyboard draws from the catalog. A recipe or brand demo that draws wrongly means its catalog entry is wrong,
 * so these tests fail on the entry, not in the lab.
 */

const draw = (flow: FlowType, choices?: Record<string, string>) => buildStoryboard({ flow, title: flow, choices });
const recipe = (flow: FlowType) => draw(flow) as Storyboard;

describe("storyboard for every recipe", () => {
  for (const s of ALL_SCENARIOS.filter((x) => x.recipe)) {
    it(`${s.flowType} draws every block and every fork with no problems`, () => {
      const board = recipe(s.flowType);
      expect(board.kind).toBe("recipe");
      expect(board.problems).toEqual([]);
      expect(board.blocks.map((b) => b.moduleId)).toEqual(s.recipe!.modules.map((m) => m.id));
      expect(board.forks.map((f) => f.id).sort()).toEqual(
        expect.arrayContaining(s.recipe!.forks.filter((id) => board.forks.some((f) => f.id === id))),
      );
      for (const b of board.blocks) {
        expect(b.steps.length, b.label).toBeGreaterThan(0);
        for (const step of b.steps) expect(STORYBOARD_LANES).toContain(step.lane);
      }
    });

    it(`${s.flowType} highlights the scenario's own exit at each story-chosen fork`, () => {
      for (const f of recipe(s.flowType).forks.filter((x) => x.chooser === "story")) {
        const selected = f.exits.filter((e) => e.selected);
        expect(selected, f.id).toHaveLength(1);
        const pick = s.recipe!.choices[f.id];
        if (pick) expect(selected[0].id).toBe(pick);
        expect(selected[0].missing, `${f.id}.${selected[0].id} needs blocks the recipe lacks`).toEqual([]);
      }
    });
  }

  it("lists a block's waits-for from earlier blocks and forks, never from a later one", () => {
    const board = recipe("iAssist_Buy_And_Bill");
    const byId = Object.fromEntries(board.blocks.map((b) => [b.moduleId, b]));
    expect(byId.copay.waitsFor).toContain(byId.benefit_verification.blockName);
    expect(byId.copay_claim.waitsFor).toEqual(expect.arrayContaining([byId.copay.blockName, "Prior authorization decision"]));
    expect(byId.benefit_verification.waitsFor).toEqual([]);
  });

  it("does not draw a patient's live pick as a chosen exit", () => {
    const pricing = recipe("CoA_DTP").forks.find((f) => f.id === "pricing")!;
    expect(pricing.chooser).toBe("patient");
    expect(pricing.exits.some((e) => e.selected)).toBe(false);
  });
});

describe("storyboard for a demo", () => {
  it("highlights the demo's pick over the scenario's default", () => {
    const board = draw("CoA_DTP", { pa: "denied" }) as Storyboard;
    const pa = board.forks.find((f) => f.id === "pa")!;
    expect(pa.exits.find((e) => e.selected)!.id).toBe("denied");
    expect(pa.exits.find((e) => e.id === "approved")!.selected).toBe(false);
  });

  it("shows the payer and PA need on benefit-check exits", () => {
    const bi = recipe("iAssist_Buy_And_Bill").forks.find((f) => f.id === "bi")!;
    const chosen = bi.exits.find((e) => e.selected)!;
    expect(chosen).toMatchObject({ id: "medical_buy_and_bill", payer: "medical", paRequired: true });
  });

  it("greys out an exit the recipe has no block for", () => {
    const pa = recipe("iAssist_PA_Approved").forks.find((f) => f.id === "pa")!;
    expect(pa.exits.find((e) => e.id === "denied")!.missing).toEqual(["appeal"]);
  });

  it("reports a pick that names no declared exit", () => {
    expect((draw("CoA_DTP", { pa: "nope" }) as Storyboard).problems).toContain('fork "pa" has no exit "nope"');
  });
});

describe("storyboard for a workflow with no recipe", () => {
  for (const s of ALL_SCENARIOS.filter((x) => !x.recipe)) {
    it(`${s.flowType} is one whole demo`, () => {
      const board = draw(s.flowType) as WholeDemoBoard;
      expect(board.kind).toBe("whole");
      expect(board.problems).toEqual([]);
      expect(board.demo.flowType).toBe(s.flowType);
      expect(board.legacy).toBe(!!s.legacy);
    });
  }
});

describe("storyboard for every brand's demos", () => {
  const brandsDir = path.join(process.cwd(), "brands");
  for (const slug of listBrandSlugs(brandsDir)) {
    const demos = ((resolveBrand(brandsDir, slug).demos ?? []) as BrandDemo[]);
    it(`${slug}: every demo draws with no problems`, () => {
      for (const d of demos) {
        const board = buildStoryboard({ flow: d.flow, title: d.label, choices: d.choices });
        expect(board.problems, `${slug} demo ${d.id}`).toEqual([]);
      }
    });
  }
});
