import { useEffect, useState } from "react";
import type { DemoRequest } from "@/workflows/catalog/request";
import { LINE, MUTED } from "./DemoLabCanvasParts";

/** The request fields the export needs: title, client, file name, intake, win theme, brand, documents, open questions. */

const field = "w-full rounded border px-2 py-1 text-sm";

/** The required fields that are still empty, in sales words. */
export function emptyRequestFields(d: DemoRequest): string[] {
  const out: string[] = [];
  if (!d.title.trim()) out.push("title");
  if (!d.client.trim()) out.push("client");
  if (!d.slug.trim()) out.push("request name");
  if (!d.winTheme.trim()) out.push("win theme");
  if (!d.brand.name.trim()) out.push("brand name");
  if (!d.brand.drug.trim()) out.push("brand drug");
  return out;
}

/**
 * A list typed one item per line. The text stays as typed, so Enter makes a new line. The draft gets the non-empty lines.
 * When the draft changes from outside (another entry loaded), the text follows.
 */
function LinesField({ label, rows, value, onChange }: { label: string; rows: number; value: string[]; onChange: (lines: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  const parse = (t: string) => t.split("\n").filter((l) => l.trim());
  useEffect(() => {
    if (parse(text).join("\n") !== value.join("\n")) setText(value.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join("\n")]);
  return (
    <label className="col-span-2 text-xs font-semibold">
      {label}
      <textarea className={field} style={{ borderColor: LINE }} rows={rows} value={text} onChange={(e) => { setText(e.target.value); onChange(parse(e.target.value)); }} />
    </label>
  );
}

export function RequestPanel({ draft, edit }: { draft: DemoRequest; edit: (fn: (d: DemoRequest) => DemoRequest) => void }) {
  const set = <K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) => edit((d) => ({ ...d, [key]: value }));
  return (
    <section className="mb-4 grid max-w-3xl grid-cols-2 gap-3 rounded border bg-white p-3" style={{ borderColor: LINE }} aria-label="Request details" data-testid="request-panel">
      <label className="col-span-2 text-xs font-semibold">
        Title
        <input className={field} style={{ borderColor: LINE }} value={draft.title} onChange={(e) => set("title", e.target.value)} />
      </label>
      <label className="text-xs font-semibold">
        Client (folder name)
        <input className={field} style={{ borderColor: LINE }} value={draft.client} onChange={(e) => set("client", e.target.value)} />
      </label>
      <label className="text-xs font-semibold">
        Request name (file name)
        <input className={field} style={{ borderColor: LINE }} value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
      </label>
      <label className="text-xs font-semibold">
        Intake channel
        <select className={field} style={{ borderColor: LINE }} value={draft.intake} onChange={(e) => set("intake", e.target.value as DemoRequest["intake"])}>
          <option value="erx">eRx</option>
          <option value="fax">Fax</option>
          <option value="esign">E-sign</option>
        </select>
      </label>
      <label className="col-span-2 text-xs font-semibold">
        Win theme
        <input className={field} style={{ borderColor: LINE }} value={draft.winTheme} onChange={(e) => set("winTheme", e.target.value)} />
      </label>
      {(["name", "drug"] as const).map((k) => (
        <label key={k} className="text-xs font-semibold">
          Brand {k}
          <input className={field} style={{ borderColor: LINE }} value={draft.brand[k]} onChange={(e) => edit((d) => ({ ...d, brand: { ...d.brand, [k]: e.target.value } }))} />
        </label>
      ))}
      <label className="col-span-2 text-xs font-semibold">
        Source URL
        <input className={field} style={{ borderColor: LINE }} value={draft.brand.sourceUrl ?? ""} onChange={(e) => edit((d) => ({ ...d, brand: { ...d.brand, sourceUrl: e.target.value || undefined } }))} />
      </label>
      <LinesField label="Documents (one per line)" rows={2} value={draft.brand.documents} onChange={(documents) => edit((d) => ({ ...d, brand: { ...d.brand, documents } }))} />
      <LinesField label="Open questions (one per line)" rows={3} value={draft.openQuestions} onChange={(v) => set("openQuestions", v)} />
      <p className="col-span-2 text-[11px]" style={{ color: MUTED }}>Nothing is saved until you export.</p>
    </section>
  );
}
