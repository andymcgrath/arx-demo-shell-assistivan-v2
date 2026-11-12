import { catalogBlock, catalogFork } from "./index";
import type { DemoRequest, RequestCard } from "./request";

/**
 * The lab's edit history. A pure model: a list of snapshots and a position. Undo and redo move the position.
 * A new edit drops anything after the position. Reset adds one more snapshot (the loaded draft), so it can be undone.
 */

export interface HistoryEntry {
  draft: DemoRequest;
  /** What this edit did, in sales words. */
  label: string;
  at: number;
}

export interface History {
  entries: HistoryEntry[];
  pos: number;
}

export const HISTORY_LIMIT = 100;

export const startHistory = (draft: DemoRequest, now = Date.now()): History => ({ entries: [{ draft, label: "Loaded", at: now }], pos: 0 });

export const currentDraft = (h: History): DemoRequest => h.entries[h.pos].draft;
export const canUndo = (h: History): boolean => h.pos > 0;
export const canRedo = (h: History): boolean => h.pos < h.entries.length - 1;

/** A typed edit ("Edited the title") merges with the one before it, so one undo takes back a whole phrase. */
const mergeable = (label: string) => label.startsWith("Edited ");

export function record(h: History, draft: DemoRequest, label: string, now = Date.now()): History {
  if (JSON.stringify(draft) === JSON.stringify(currentDraft(h))) return h;
  const kept = h.entries.slice(0, h.pos + 1);
  const last = kept[kept.length - 1];
  if (kept.length > 1 && mergeable(label) && last.label === label) {
    kept[kept.length - 1] = { draft, label, at: now };
  } else {
    kept.push({ draft, label, at: now });
  }
  const trimmed = kept.length > HISTORY_LIMIT ? kept.slice(kept.length - HISTORY_LIMIT) : kept;
  return { entries: trimmed, pos: trimmed.length - 1 };
}

export const undo = (h: History): History => (canUndo(h) ? { ...h, pos: h.pos - 1 } : h);
export const redo = (h: History): History => (canRedo(h) ? { ...h, pos: h.pos + 1 } : h);
export const jump = (h: History, pos: number): History => (pos >= 0 && pos < h.entries.length ? { ...h, pos } : h);
/** Back to the draft as loaded. It is one more entry, so Undo returns to the edits. */
export const reset = (h: History, now = Date.now()): History => record(h, h.entries[0].draft, "Reset to the loaded draft", now);

const cardName = (c: RequestCard | undefined): string => (!c ? "a card" : c.kind === "ghost" ? c.name.trim() || "a new card" : (catalogBlock(c.moduleId)?.name ?? c.moduleId));
const forkName = (id: string) => catalogFork(id)?.label ?? id;

/** Say what changed between two drafts, in one short phrase. Used for the history list. */
export function describeChange(a: DemoRequest, b: DemoRequest): string {
  const forksAdded = b.forks.filter((f) => !a.forks.includes(f));
  const forksGone = a.forks.filter((f) => !b.forks.includes(f));
  if (forksAdded.length) return `Added the ${forkName(forksAdded[0])} fork`;
  if (forksGone.length) return `Removed the ${forkName(forksGone[0])} fork`;

  if (b.cards.length > a.cards.length) {
    const at = b.cards.findIndex((c, i) => JSON.stringify(c) !== JSON.stringify(a.cards[i]));
    return `Added ${cardName(b.cards[at < 0 ? b.cards.length - 1 : at])}`;
  }
  if (b.cards.length < a.cards.length) {
    const at = a.cards.findIndex((c, i) => JSON.stringify(c) !== JSON.stringify(b.cards[i]));
    return `Removed ${cardName(a.cards[at < 0 ? a.cards.length - 1 : at])}`;
  }
  const moved = b.cards.map((c, i) => JSON.stringify(c) !== JSON.stringify(a.cards[i]));
  if (moved.some(Boolean)) {
    const sameSet = JSON.stringify([...a.cards.map((c) => JSON.stringify(c))].sort()) === JSON.stringify([...b.cards.map((c) => JSON.stringify(c))].sort());
    const i = moved.indexOf(true);
    return sameSet ? `Moved ${cardName(b.cards[i])}` : `Changed ${cardName(b.cards[i])}`;
  }

  if (b.demos.length > a.demos.length) return "Added a demo";
  if (b.demos.length < a.demos.length) return "Removed a demo";
  for (let i = 0; i < b.demos.length; i++) {
    const x = a.demos[i];
    const y = b.demos[i];
    const name = y.label || `demo ${i + 1}`;
    if (x.label !== y.label) return "Edited the demo name";
    if ((x.description ?? "") !== (y.description ?? "")) return "Edited the demo description";
    if (JSON.stringify(x.choices) !== JSON.stringify(y.choices)) return `Changed the picks for ${name}`;
  }
  const fields: [keyof DemoRequest, string][] = [["title", "title"], ["client", "client"], ["slug", "request name"], ["intake", "intake channel"], ["winTheme", "win theme"], ["openQuestions", "open questions"]];
  for (const [k, label] of fields) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return k === "intake" ? "Changed the intake channel" : `Edited the ${label}`;
  if (JSON.stringify(a.brand) !== JSON.stringify(b.brand)) return "Edited the brand details";
  return "Edited the request";
}
