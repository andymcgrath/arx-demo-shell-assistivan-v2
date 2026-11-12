import { describe, expect, it } from "vitest";
import { blankDraft, suggestWinTheme, draftFromScenario } from "@/workflows/catalog/editor";
import { canRedo, canUndo, currentDraft, describeChange, HISTORY_LIMIT, jump, record, redo, reset, startHistory, undo } from "@/workflows/catalog/history";

const base = () => blankDraft("coassist", "acme");
const titled = (t: string) => ({ ...base(), title: t });

describe("edit history", () => {
  it("moves back and forward, and a new edit drops the redo tail", () => {
    let h = startHistory(base());
    h = record(h, titled("A"), "Edited the title");
    h = record(h, { ...titled("A"), client: "x" }, "Edited the client");
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(currentDraft(h).client).toBe("acme");
    expect(canRedo(h)).toBe(true);
    h = record(h, { ...titled("A"), slug: "s" }, "Edited the request name");
    expect(canRedo(h)).toBe(false);
    expect(h.entries).toHaveLength(3);
  });

  it("merges consecutive typed edits of one field into one entry", () => {
    let h = startHistory(base());
    for (const t of ["A", "Ab", "Abc"]) h = record(h, titled(t), "Edited the title");
    expect(h.entries).toHaveLength(2);
    expect(currentDraft(h).title).toBe("Abc");
    h = undo(h);
    expect(currentDraft(h).title).toBe("");
  });

  it("does not merge structural edits", () => {
    let h = startHistory(base());
    h = record(h, { ...base(), forks: ["bi", "pa"] }, "Added the pa fork");
    h = record(h, { ...base(), forks: ["bi", "pa", "pricing"] }, "Added the pricing fork");
    expect(h.entries).toHaveLength(3);
  });

  it("ignores an edit that changes nothing", () => {
    const h = startHistory(base());
    expect(record(h, base(), "Edited the title")).toBe(h);
  });

  it("resets to the loaded draft as one more entry, which undo reverses", () => {
    let h = startHistory(base());
    h = record(h, titled("A"), "Edited the title");
    h = reset(h);
    expect(currentDraft(h).title).toBe("");
    h = undo(h);
    expect(currentDraft(h).title).toBe("A");
  });

  it("jumps to a point and keeps the later entries for redo", () => {
    let h = startHistory(base());
    h = record(h, { ...base(), forks: ["bi", "pa"] }, "Added the pa fork");
    h = record(h, { ...base(), forks: ["bi", "pa", "pricing"] }, "Added the pricing fork");
    h = jump(h, 0);
    expect(currentDraft(h).forks).toEqual(["bi"]);
    expect(canRedo(h)).toBe(true);
    expect(redo(h).pos).toBe(1);
  });

  it("keeps at most the limit", () => {
    let h = startHistory(base());
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) h = record(h, { ...base(), forks: ["bi", `f${i}`] }, `Added f${i}`);
    expect(h.entries.length).toBe(HISTORY_LIMIT);
    expect(h.pos).toBe(HISTORY_LIMIT - 1);
  });
});

describe("describeChange", () => {
  const d = draftFromScenario("CoA_DTP", { title: "DTP" })!;
  it("names an added and a removed fork", () => {
    expect(describeChange(d, { ...d, forks: [...d.forks, "copay"] })).toMatch(/^Added the .* fork$/);
    expect(describeChange({ ...d, forks: [...d.forks, "copay"] }, d)).toMatch(/^Removed the .* fork$/);
  });
  it("names a removed, added, and moved card", () => {
    expect(describeChange(d, { ...d, cards: d.cards.slice(1) })).toMatch(/^Removed /);
    expect(describeChange({ ...d, cards: d.cards.slice(1) }, d)).toMatch(/^Added /);
    const swapped = [...d.cards];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    expect(describeChange(d, { ...d, cards: swapped })).toMatch(/^Moved /);
  });
  it("names a field edit", () => {
    expect(describeChange(d, { ...d, title: "x" })).toBe("Edited the title");
    expect(describeChange(d, { ...d, winTheme: "x" })).toBe("Edited the win theme");
  });
});

describe("suggested win theme", () => {
  it("is built from the intake and the card names", () => {
    const d = draftFromScenario("CoA_DTP", { title: "DTP" })!;
    expect(d.winTheme).toBe(suggestWinTheme(d));
    expect(d.winTheme).toMatch(/^One eRx starts everything: .+, with no re-keying between apps\.$/);
    expect(d.winTheme.toLowerCase()).toContain("patient onboarding");
  });
  it("still reads for a blank draft", () => {
    expect(suggestWinTheme(base())).toBe("One eRx starts the case and the platform carries it through.");
  });
});
