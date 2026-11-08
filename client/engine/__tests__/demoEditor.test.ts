import { describe, it, expect } from "vitest";
import { ALL_SCENARIOS } from "@/workflows/scenarios";
import { CATALOG_BLOCKS, paletteCards } from "@/workflows/catalog";
import type { DemoRequest } from "@/workflows/catalog/request";
import {
  addBlock, addDemo, addGhost, appendReasons, blankDraft, deriveApps, draftFromScenario, editorProblems, exitMissing,
  moveCard, removeCard, removeDemo, setPick, toggleFork, updateCard, workflowForks,
} from "@/workflows/catalog/editor";

/**
 * The editor model: palette greying, fork exits, and what blocks an export. The palette and the export read the same
 * ordering rules, so the recipes in the repo must pass through both without a problem.
 */

/** Fills what a salesperson types, so only the structure is under test. */
const filled = (d: DemoRequest): DemoRequest => ({
  ...d,
  client: "acme",
  slug: "acme-demo",
  title: d.title || "Acme demo",
  brand: { name: "Acme", drug: "Drug", indication: "Condition", documents: [] },
  winTheme: "One handoff",
  demoDate: "2026-12-01",
  demos: d.demos.map((x, i) => ({ ...x, id: `demo-${i + 1}`, label: x.label || `Demo ${i + 1}` })),
});

const recipeFlows = ALL_SCENARIOS.filter((s) => s.recipe).map((s) => s.flowType);
const card = (moduleId: string, variantId?: string) => paletteCards(CATALOG_BLOCKS[moduleId as keyof typeof CATALOG_BLOCKS]).find((c) => c.variantId === (variantId === "default" ? undefined : variantId))!;

describe("a ready-made draft from every recipe", () => {
  for (const flow of recipeFlows) {
    const draft = draftFromScenario(flow, { title: flow })!;

    it(`${flow} can be exported once the typed fields are filled`, () => {
      expect(editorProblems(filled(draft))).toEqual([]);
    });

    it(`${flow}: every block of the recipe can go next, in order`, () => {
      let building: DemoRequest = { ...draft, cards: [] };
      for (const c of draft.cards) {
        if (c.kind !== "block") continue;
        const palette = card(c.moduleId, c.variantId);
        expect(appendReasons(building, palette), `${c.moduleId}${c.variantId ? `:${c.variantId}` : ""}`).toEqual([]);
        building = addBlock(building, palette);
      }
    });
  }

  it("is undefined for a scenario with no recipe", () => {
    const none = ALL_SCENARIOS.find((s) => !s.recipe)!.flowType;
    expect(draftFromScenario(none, { title: "x" })).toBeUndefined();
  });
});

describe("the palette", () => {
  it("greys a block whose needs are not met, with the reason in sales words", () => {
    const d = blankDraft("iassist");
    expect(appendReasons(d, card("enrollment", "default"))).toEqual([]);
    expect(appendReasons(d, card("pa_notification", "default"))).toEqual(
      expect.arrayContaining(['Prior authorization result text needs the "Prior authorization decision" fork. Add it to the forks.']),
    );
    expect(appendReasons(d, card("copay"))[0]).toContain("Medical benefit check by the HCP (eMedBV)");
  });

  it("turns a block on once the fork or block it needs is in", () => {
    let d = toggleFork(blankDraft("iassist"), "pa");
    d = addBlock(d, card("enrollment", "default"));
    expect(appendReasons(d, card("pa_notification", "default"))).toEqual([]);
  });

  it("greys a block already in the demo, and anything after tracking", () => {
    let d = addBlock(blankDraft("iassist"), card("enrollment", "default"));
    expect(appendReasons(d, card("enrollment", "no_rx"))[0]).toContain("twice");
    d = addBlock(d, card("tracking"));
    expect(appendReasons(d, card("scheduling", "delivery")).join()).toContain("must be last");
  });

  it("greys a block that must come before one already placed", () => {
    let d = toggleFork(blankDraft("coassist"), "pa");
    d = addBlock(addBlock(d, card("enrollment", "default")), card("pharmacy_selection", "assigned"));
    expect(appendReasons(d, card("pap_transfer")).join()).toContain("must come after");
  });
});

describe("fork exits", () => {
  it("greys an exit whose required block is missing, and clears it when the block is added", () => {
    const forks = workflowForks("iassist");
    const denied = forks.find((f) => f.id === "pa")!.exits.find((e) => e.id === "denied")!;
    let d = blankDraft("iassist");
    expect(exitMissing(d, denied)).toEqual(["appeal"]);
    d = addBlock(toggleFork(d, "pa"), card("appeal"));
    expect(exitMissing(d, denied)).toEqual([]);
  });

  it("keeps bi, drops a removed fork's picks, and merges the exits of same-id forks", () => {
    let d = toggleFork(blankDraft("iassist"), "pa");
    d = setPick(d, 0, "pa", "approved");
    expect(toggleFork(d, "bi")).toBe(d);
    expect(toggleFork(d, "pa").demos[0].choices).toEqual({});
    const pricing = workflowForks("coassist").find((f) => f.id === "pricing")!;
    expect(pricing.exits.map((e) => e.id).sort()).toEqual(["mail_order", "retail", "self_pay"]);
  });
});

describe("what blocks an export", () => {
  const ready = () => filled(draftFromScenario("iAssist_PA_Approved", { title: "Acme" })!);

  it("is clear for a complete draft", () => {
    expect(editorProblems(ready())).toEqual([]);
  });

  it("blocks an empty win theme and an empty date", () => {
    expect(editorProblems({ ...ready(), winTheme: "" })).toContain("win theme is required");
    expect(editorProblems({ ...ready(), demoDate: "" })).toContain("demo date is required, as YYYY-MM-DD");
  });

  it("blocks a ghost card that lacks a required field, and clears when it is filled", () => {
    let d = addGhost(ready());
    const at = d.cards.length - 1;
    const problems = editorProblems(d);
    expect(problems.join()).toContain("needs a name");
    expect(problems.join()).toContain("needs what the audience sees");
    d = updateCard(d, at, { name: "White-label intake", sees: "The pharmacy form under the client's name", app: "provider", lane: "hcp" });
    expect(editorProblems(d)).toEqual([]);
  });

  it("blocks blocks in the wrong order, in sales words", () => {
    const d = ready();
    const swapped = moveCard(d, 0, 1);
    expect(editorProblems(swapped).join()).toMatch(/needs "Patient onboarding" before it|must come after/);
  });

  it("blocks a demo with no pick for a story fork, and a pick whose block was removed", () => {
    const d = ready();
    expect(editorProblems(setPick(d, 0, "bi", "pharmacy_covered"))).toEqual([]);
    expect(editorProblems(addDemo(d)).join()).toContain('has no pick for the "Benefits investigation result" fork');
    const denied = setPick(d, 0, "pa", "denied");
    expect(editorProblems(denied).join()).toContain('The "Prior authorization decision" pick "denied" needs "Appeal after a denied PA"');
  });

  it("blocks a block whose own order breaks when the block before it is removed", () => {
    const d = removeCard(ready(), 0);
    expect(editorProblems(d).join()).toContain("needs");
  });

  it("keeps the apps in step with the cards, and cannot remove the last demo", () => {
    let d = addGhost(blankDraft("iassist"));
    d = updateCard(d, 0, { app: "rules" });
    expect(d.apps).toEqual(["rules"]);
    expect(deriveApps([{ kind: "block", moduleId: "tracking" }])).toEqual(["crm", "patient", "field"]);
    expect(removeDemo(d, 0).demos).toHaveLength(1);
  });

  it("does not build standard or PAP demos", () => {
    expect(editorProblems({ ...ready(), workflow: "pap" }).join()).toContain("the editor builds");
  });
});
