import { describe, expect, it } from "vitest";
import { demoIdClashes, draftFromScenario, duplicateDemo, exportable, setPick, toggleFork, removeCard } from "@/workflows/catalog/editor";
import { validateDemoRequest } from "@/workflows/catalog/request";

/** Duplicate copies a demo into a new draft that becomes a new dropdown entry. It never touches the original. */

const original = () => {
  const d = draftFromScenario("CoA_DTP", { title: "CoAssist DTP", client: "acme", brand: { name: "Acme", drug: "Drugx", documents: [] }, choices: { pa: "approved" } })!;
  d.winTheme = "One handoff";
  return d;
};

describe("duplicateDemo", () => {
  it("names the copy and gives it a demo id and request name that clash with nothing", () => {
    const d = original();
    const c = duplicateDemo(d, 0, { demoIds: ["copy-of-coassist-dtp"], slugs: ["coassist-dtp-copy"] });
    expect(c.title).toBe("Copy of CoAssist DTP");
    expect(c.demos).toHaveLength(1);
    expect(c.demos[0].label).toBe("Copy of CoAssist DTP");
    expect(c.demos[0].id).toBe("copy-of-coassist-dtp-2");
    expect(c.slug).toBe("coassist-dtp-copy-2");
    expect(c.demos[0].id).not.toBe(d.demos[0].id);
    expect(c.slug).not.toBe(d.slug);
  });

  it("copies the cards, forks, picks, intake, apps, and brand", () => {
    const d = original();
    const c = duplicateDemo(d, 0);
    expect(c.cards).toEqual(d.cards);
    expect(c.forks).toEqual(d.forks);
    expect(c.demos[0].choices).toEqual(d.demos[0].choices);
    expect(c.intake).toBe(d.intake);
    expect(c.apps).toEqual(d.apps);
    expect(c.brand).toEqual(d.brand);
    expect(c.winTheme).toBe(d.winTheme);
  });

  it("copies the picked demo, not the first", () => {
    let d = original();
    d = { ...d, demos: [...d.demos, { id: "second", label: "Second", choices: { pa: "denied" } }] };
    const c = duplicateDemo(d, 1);
    expect(c.demos[0].choices).toEqual({ pa: "denied" });
    expect(c.demos[0].label).toBe("Copy of Second");
  });

  it("shares nothing with the original", () => {
    const d = original();
    const before = JSON.stringify(d);
    const c = duplicateDemo(d, 0);
    expect(JSON.stringify(d)).toBe(before);
    const edited = removeCard(toggleFork(setPick(c, 0, "pa", "denied"), "pricing"), 0);
    c.brand.documents.push("x.pdf");
    c.demos[0].choices.bi = "no_coverage";
    expect(JSON.stringify(d)).toBe(before);
    expect(edited.cards.length).toBe(d.cards.length - 1);
  });

  it("validates, so it exports like any other draft", () => {
    const c = duplicateDemo(original(), 0);
    const result = validateDemoRequest(exportable(c));
    expect(result.ok, !result.ok ? result.problems.join("; ") : "").toBe(true);
  });
});

describe("demoIdClashes", () => {
  it("reports an id already in the brand file, except the one the draft was loaded from", () => {
    const c = duplicateDemo(original(), 0);
    const id = c.demos[0].id;
    expect(demoIdClashes(c, [id, "other"])).toEqual([id]);
    expect(demoIdClashes(c, ["other"])).toEqual([]);
    expect(demoIdClashes(c, [id], id)).toEqual([]);
  });
});
