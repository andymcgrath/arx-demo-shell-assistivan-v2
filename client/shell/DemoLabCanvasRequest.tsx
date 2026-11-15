import { useEffect, useState } from "react";
import type { DemoRequest } from "@/workflows/catalog/request";
import { suggestWinTheme } from "@/workflows/catalog/editor";
import { LINE, MUTED } from "./DemoLabCanvasParts";

/** The build request fields: demo name, client, file name, how the referral arrives, win theme, brand, documents, what is still to confirm. */

const field = "w-full rounded border px-2 py-1 text-sm";

/** The required fields that are still empty, in sales words. */
export function emptyRequestFields(d: DemoRequest): string[] {
  const out: string[] = [];
  if (!d.title.trim()) out.push("demo name");
  if (!d.client.trim()) out.push("client");
  if (!d.slug.trim()) out.push("file name");
  if (!d.winTheme.trim()) out.push("win theme");
  if (!d.brand.name.trim()) out.push("client brand name");
  if (!d.brand.drug.trim()) out.push("drug name");
  return out;
}

/**
 * A list typed one item per line. The text stays as typed, so Enter makes a new line. The draft gets the non-empty lines.
 * When the draft changes from outside (another entry loaded), the text follows.
 */
function LinesField({ label, hint, rows, value, onChange }: { label: string; hint?: string; rows: number; value: string[]; onChange: (lines: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  const parse = (t: string) => t.split("\n").filter((l) => l.trim());
  useEffect(() => {
    if (parse(text).join("\n") !== value.join("\n")) setText(value.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join("\n")]);
  return (
    <div className="col-span-2 text-xs">
      <label className="block font-semibold">
        {label}
        <textarea className={field} style={{ borderColor: LINE }} rows={rows} value={text} onChange={(e) => { setText(e.target.value); onChange(parse(e.target.value)); }} />
      </label>
      {hint && <p className="mt-1" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

/** A labelled field with an optional hint under it. The hint is tied to the control for screen readers. */
function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`${wide ? "col-span-2 " : ""}text-xs`}>
      <label className="block font-semibold">
        {label}
        {children}
      </label>
      {hint && <p className="mt-1" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

export function RequestPanel({ draft, edit }: { draft: DemoRequest; edit: (fn: (d: DemoRequest) => DemoRequest) => void }) {
  const set = <K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) => edit((d) => ({ ...d, [key]: value }));
  const setBrand = (patch: Partial<DemoRequest["brand"]>) => edit((d) => ({ ...d, brand: { ...d.brand, ...patch } }));
  return (
    <section className="mb-4 grid max-w-3xl grid-cols-2 gap-3 rounded border bg-white p-3" style={{ borderColor: LINE }} aria-label="Build request" data-testid="request-panel">
      <div className="col-span-2">
        <h3 className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Build request</h3>
        <p className="text-[11px]" style={{ color: MUTED }}>Everything the build needs besides the cards. Export turns it into files for engineering.</p>
      </div>
      <Field wide label="Demo name" hint="What sales and the client call this demo.">
        <input className={field} style={{ borderColor: LINE }} value={draft.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Client" hint="Short and lowercase. Files save under docs/demos/<client>/.">
        <input className={field} style={{ borderColor: LINE }} value={draft.client} onChange={(e) => set("client", e.target.value)} />
      </Field>
      <Field label="File name" hint="Lowercase words joined by hyphens.">
        <input className={field} style={{ borderColor: LINE }} value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
      </Field>
      <Field label="How the referral arrives">
        <select className={field} style={{ borderColor: LINE }} value={draft.intake} onChange={(e) => set("intake", e.target.value as DemoRequest["intake"])}>
          <option value="erx">eRx (electronic prescription)</option>
          <option value="fax">Fax</option>
          <option value="esign">E-sign</option>
        </select>
      </Field>
      <div className="col-span-2 text-xs font-semibold">
        <label>
          Win theme
          <textarea className={field} style={{ borderColor: LINE }} rows={2} value={draft.winTheme} onChange={(e) => set("winTheme", e.target.value)} />
        </label>
        <p className="mt-1 font-normal" style={{ color: MUTED }}>
          The one idea the client should remember. It is saved in the build request. It starts from the cards and you can rewrite it.{" "}
          <button type="button" className="font-semibold underline" onClick={() => set("winTheme", suggestWinTheme(draft))}>Suggest from the cards</button>
        </p>
      </div>
      <Field label="Client brand name">
        <input className={field} style={{ borderColor: LINE }} value={draft.brand.name} onChange={(e) => setBrand({ name: e.target.value })} />
      </Field>
      <Field label="Drug name">
        <input className={field} style={{ borderColor: LINE }} value={draft.brand.drug} onChange={(e) => setBrand({ drug: e.target.value })} />
      </Field>
      <Field wide label="Client website" hint="Where the look and feel come from.">
        <input className={field} style={{ borderColor: LINE }} value={draft.brand.sourceUrl ?? ""} onChange={(e) => setBrand({ sourceUrl: e.target.value || undefined })} />
      </Field>
      <LinesField label="Reference documents" hint="Decks, PDFs, call notes: links or file names, one per line." rows={2} value={draft.brand.documents} onChange={(documents) => setBrand({ documents })} />
      <LinesField label="Still to confirm" hint="Anything unknown, one per line. The build stops and asks about each one." rows={3} value={draft.openQuestions} onChange={(v) => set("openQuestions", v)} />
      <p className="col-span-2 text-[11px]" style={{ color: MUTED }}>Nothing is saved until you export.</p>
    </section>
  );
}

/** What to do with the two exported files. Collapsed by default. The names and the path (script or Claude Code) follow the draft. */
export function ExportInstructions({ draft, newCards }: { draft: DemoRequest; newCards: number }) {
  const client = draft.client.trim() || "<client>";
  const slug = draft.slug.trim() || "<file name>";
  const dir = `docs/demos/${client}`;
  return (
    <details className="mt-4 rounded border text-xs" style={{ borderColor: LINE }} data-testid="export-instructions">
      <summary className="cursor-pointer px-3 py-2 font-semibold">Instructions: what to do with the two files</summary>
      <div className="space-y-2 border-t px-3 py-2" style={{ borderColor: LINE }}>
        <p>Export writes two files into this project, under <code>{dir}/</code>. Nothing is downloaded, and it only works on the dev server.</p>
        <ul className="list-disc pl-4">
          <li><code>{slug}.request.json</code> is the spec: the recipe, the forks and the demos. It is the source of truth. Commit it with the demo.</li>
          <li><code>{slug}.prompt.md</code> is the instruction for Claude Code. It points at the spec.</li>
        </ul>
        {newCards === 0 ? (
          <>
            <p className="font-semibold">This request has no new cards, so no model is needed:</p>
            <ol className="list-decimal pl-4">
              <li>Preview it: <code>pnpm demo:apply {client}/{slug} --dry</code></li>
              <li>Apply it: <code>pnpm demo:apply {client}/{slug}</code>. It writes the demos into <code>brands/{client}/brand.json</code> and runs the brand test.</li>
              <li>Review the diff, then commit it on a short-lived branch.</li>
            </ol>
          </>
        ) : (
          <>
            <p className="font-semibold">This request has {newCards} new card{newCards === 1 ? "" : "s"}, so Claude Code builds them:</p>
            <ol className="list-decimal pl-4">
              <li>Open Claude Code in this project, on a short-lived branch.</li>
              <li>Paste in the contents of <code>{slug}.prompt.md</code>.</li>
              <li>It builds each new block, adds the tests, and stops to ask on any open question. Answer it. Do not let it guess.</li>
              <li>Check that <code>pnpm test</code> passes, review the diff, then commit.</li>
            </ol>
          </>
        )}
      </div>
    </details>
  );
}
