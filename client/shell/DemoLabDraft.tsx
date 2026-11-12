import { createContext, useContext, useState, type ReactNode } from "react";
import { BRAND } from "@/brand";
import type { DemoRequest } from "@/workflows/catalog/request";
import { blankDraft, editorProblems, exportable, requestBrand } from "@/workflows/catalog/editor";

/**
 * The Demo Lab's one draft. The Canvas and the Builder tabs both edit it, so a change on one shows on the other. Nothing is
 * saved until export. The only write is the dev endpoint (POST /__demo-lab/export), which puts two files under docs/demos/.
 */

export type Exported = { ok: true; written: string[] } | { ok: false; problems: string[] };

interface DraftContext {
  draft: DemoRequest;
  /** The demo whose picks the canvas draws. */
  active: number;
  setActive: (i: number) => void;
  /** Which list entry the draft was loaded from, or null for the starting blank draft. */
  loadedKey: string | null;
  /** True once the draft differs from what was loaded. */
  dirty: boolean;
  edit: (fn: (d: DemoRequest) => DemoRequest) => void;
  /** Replace the draft. The caller confirms first when `dirty`. */
  load: (key: string, draft: DemoRequest) => void;
  result?: Exported;
  busy: boolean;
  problems: string[];
  send: () => Promise<void>;
}

const Ctx = createContext<DraftContext | null>(null);

export const useDraft = (): DraftContext => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDraft needs a DraftProvider");
  return c;
};

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DemoRequest>(() => blankDraft("iassist", BRAND.slug, requestBrand(BRAND)));
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [active, setActive] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [result, setResult] = useState<Exported>();
  const [busy, setBusy] = useState(false);

  const edit = (fn: (d: DemoRequest) => DemoRequest) => {
    setResult(undefined);
    setDraft(fn);
  };
  const load = (key: string, next: DemoRequest) => {
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setActive(0);
    setLoadedKey(key);
    setResult(undefined);
  };
  const send = async () => {
    setBusy(true);
    try {
      const res = await fetch("/__demo-lab/export", { method: "POST", body: JSON.stringify(exportable(draft)) });
      const json = await res.json();
      setResult(res.ok ? { ok: true, written: json.written } : { ok: false, problems: json.problems ?? ["The export failed."] });
    } catch (e) {
      setResult({ ok: false, problems: [(e as Error).message] });
    } finally {
      setBusy(false);
    }
  };

  const value: DraftContext = {
    draft, active: Math.min(active, draft.demos.length - 1), setActive, loadedKey, dirty: JSON.stringify(draft) !== baseline,
    edit, load, result, busy, problems: editorProblems(draft), send,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
