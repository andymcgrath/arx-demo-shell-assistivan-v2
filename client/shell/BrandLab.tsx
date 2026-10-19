/**
 * Brand Lab. A dev-only page at /brand-lab for trying brand colors before they go in brand.json.
 *
 * Pick brand, accent, action, and the surface styles (confirmation background, header strip, icon tiles,
 * step row and marker, heading color). The mock screens and the contrast table update as you type.
 * "Copy colors JSON" gives the block to paste into `program.colors`.
 * It starts from the active brand. It never writes a file and never changes the running demo.
 *
 * App.tsx mounts it only when `import.meta.env.DEV` is true, so client builds do not include it.
 */
import DemosLab from "./BrandLabDemos";
import { useMemo, useState, type CSSProperties } from "react";
import { BRAND } from "@/brand";
import {
  SURFACE_OPTIONS,
  buildTheme,
  contrastReport,
  normalizeHex,
  resolveSurfaces,
  rowPasses,
  themeToCssVars,
  type BrandColors,
  type ContrastRow,
  type SurfaceKey,
  type Surfaces,
} from "@/brand/theme";

type Draft = { brand: string; accent: string; action: string; surfaces: Surfaces };

const initial = (): Draft => {
  const c = BRAND.program.colors;
  return { brand: c.brand, accent: c.accent ?? "", action: c.action ?? "", surfaces: { ...(c.surfaces ?? {}) } };
};

/** Each surface: what it controls, in words a designer would use. */
const SURFACE_LABELS: Record<SurfaceKey, { label: string; hint: string }> = {
  confirmation: { label: "Confirmation background", hint: "The full-color confirmation screens." },
  strip: { label: "Header strip", hint: "The thin line under the header. None leaves it white." },
  tiles: { label: "Icon tiles", hint: "Tint: light brand tint, brand icon. Accent: solid tile, readable icon." },
  stepRow: { label: "Active step row", hint: "Fill of the current step in the order tracker." },
  marker: { label: "Step marker", hint: "The number circle on the active step." },
  headings: { label: "Headings and links", hint: "Brand color, or the darker shade." },
};

/** Empty or half-typed hex values count as "not set". Returns the colors, or the first problem. */
function toColors(d: Draft): { colors?: BrandColors; error?: string } {
  try {
    const colors: BrandColors = { brand: normalizeHex(d.brand), surfaces: d.surfaces };
    if (d.accent.trim()) colors.accent = normalizeHex(d.accent);
    if (d.action.trim()) colors.action = normalizeHex(d.action);
    return { colors };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

function Field({
  label,
  hint,
  value,
  onChange,
  optional,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  const valid = /^#?[0-9a-fA-F]{6}$/.test(value.trim());
  return (
    <label className="block mb-4">
      <span className="text-sm font-semibold text-[#1e293b]">{label}</span>
      <span className="block text-xs text-[#64748b] mb-1">{hint}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? `#${value.replace("#", "").toLowerCase()}` : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-[#cbd5e1] bg-white"
          aria-label={`${label} color picker`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={optional ? "(not set)" : "#RRGGBB"}
          className={`flex-1 rounded border px-2 py-1.5 font-mono text-sm ${
            value && !valid ? "border-[#ef4444]" : "border-[#cbd5e1]"
          }`}
        />
        {optional && value && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-[#64748b] underline">
            clear
          </button>
        )}
      </span>
    </label>
  );
}

function SurfaceControl({
  name,
  value,
  isDefault,
  onChange,
}: {
  name: SurfaceKey;
  value: string;
  isDefault: boolean;
  onChange: (v: string) => void;
}) {
  const { label, hint } = SURFACE_LABELS[name];
  return (
    <fieldset className="mb-3">
      <legend className="text-sm font-semibold text-[#1e293b]">
        {label}
        {isDefault && <span className="ml-1.5 text-[10px] font-normal text-[#94a3b8]">default</span>}
      </legend>
      <span className="mb-1 block text-xs text-[#64748b]">{hint}</span>
      <div className="flex gap-1.5">
        {SURFACE_OPTIONS[name].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded border px-2.5 py-1 text-xs ${
              value === option ? "border-[#0f172a] bg-[#0f172a] text-white" : "border-[#cbd5e1] bg-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const Badge = ({ ok, children }: { ok: boolean; children: string }) => (
  <span
    className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
      ok ? "bg-emerald-100 text-emerald-800" : "bg-[#f1f5f9] text-[#94a3b8] line-through"
    }`}
  >
    {children}
  </span>
);

function ScoreTable({ rows }: { rows: ContrastRow[] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-[#cbd5e1] text-[#64748b]">
          <th className="py-1 pr-2">Pair</th>
          <th className="pr-2">Ratio</th>
          <th className="pr-2">Needs</th>
          <th>Levels met</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const pass = rowPasses(r);
          return (
            <tr key={r.id} className="border-b border-[#e2e8f0] align-top">
              <td className="py-1.5 pr-2">
                <span
                  className="mr-1.5 inline-block h-3 w-3 rounded-sm border border-[#cbd5e1] align-middle"
                  style={{ background: `linear-gradient(135deg, ${r.fg} 50%, ${r.bg} 50%)` }}
                />
                {r.label}
                {r.required && <span className="ml-1 text-[10px] text-[#94a3b8]">(required)</span>}
              </td>
              <td className={`pr-2 font-mono font-semibold ${pass ? "text-emerald-700" : r.required ? "text-[#dc2626]" : "text-[#b45309]"}`}>
                {r.ratio.toFixed(2)}
              </td>
              <td className="pr-2 text-[#64748b]">{r.use === "text" ? "AA 4.5" : "AA large 3.0"}</td>
              <td className="space-x-1">
                <Badge ok={r.levels.aaLarge}>AA large 3.0</Badge>
                <Badge ok={r.levels.aaText}>AA 4.5</Badge>
                <Badge ok={r.levels.aaaLarge}>AAA large 4.5</Badge>
                <Badge ok={r.levels.aaaText}>AAA 7.0</Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Mock screens. They use the same token classes as the patient portal. `portal-patient` supplies the neutral
 * colors and font, and the draft's variables on the wrapper override the brand ones.
 */
function Mocks({ vars }: { vars: CSSProperties }) {
  const row = (state: "done" | "active" | "pending", n: number, label: string) => {
    const active = state === "active";
    return (
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${active ? "bg-arx-step-row" : "border border-arx-borders bg-white"}`}>
        {state === "done" ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-arx-step-done">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        ) : active ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-arx-marker font-bold text-arx-on-marker">{n}</span>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-arx-borders bg-white font-semibold text-arx-inactive">{n}</span>
        )}
        <span className={`text-sm font-semibold ${active ? "text-arx-on-step-row" : "text-arx-slate"}`}>{label}</span>
      </div>
    );
  };

  return (
    <div style={vars} className="portal-patient flex flex-wrap items-start gap-6" data-testid="brand-lab-mocks">
      <div className="w-[300px] overflow-hidden rounded-xl border border-[#cbd5e1] bg-white">
        <div className="px-4 py-3 text-center text-lg font-bold text-arx-link">Logo area</div>
        <div className="border-t border-arx-borders py-1.5 text-center text-[11px] font-semibold text-arx-link">
          Important Safety Information
        </div>
        <div className="h-[3px] bg-arx-strip" />
        <div className="space-y-3 bg-arx-background p-4">
          <div className="rounded-2xl border border-arx-borders bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-h4 text-arx-slate">Welcome, Keanu!</p>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-arx-tile text-lg font-bold text-arx-on-tile">
                Rx
              </span>
            </div>
            <p className="mt-2 text-body text-arx-body-copy">Card copy sits here on white.</p>
            <button className="mt-3 w-full rounded-lg bg-arx-action py-3 font-semibold text-arx-on-action hover:bg-arx-action-hover">
              Start now
            </button>
            <button className="mt-2 w-full rounded-lg border-2 border-arx-primary py-3 font-semibold text-arx-link">
              Learn more
            </button>
          </div>
          <p className="text-h5 text-arx-link">Delivery status</p>
          {row("done", 1, "Order received")}
          {row("active", 2, "Routing to pharmacy")}
          {row("pending", 3, "Preparing medication")}
        </div>
      </div>

      <div className="w-[300px] overflow-hidden rounded-xl border border-[#cbd5e1]">
        <div className="bg-arx-hero px-6 py-8 text-center text-arx-on-hero">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-arx-on-hero/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="hsl(var(--arx-on-hero))" strokeWidth="2.5" className="h-8 w-8">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-2xl font-bold leading-snug">Thanks!<br />Your details were received</p>
          <p className="mt-3 text-sm opacity-90">We can now begin processing your prescription. This usually takes less than 2 business days.</p>
          <button className="mt-5 w-full rounded-lg bg-white py-3 font-semibold text-arx-brand">Got it</button>
        </div>
      </div>
    </div>
  );
}

function ColorsLab() {
  const [draft, setDraft] = useState<Draft>(initial);
  const [copied, setCopied] = useState(false);
  // Preview only. Off shows the brand exactly as set, so you can see what the automatic adjustment changes.
  const [autoAdjust, setAutoAdjust] = useState(true);
  const set = (key: "brand" | "accent" | "action") => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const setSurface = (key: SurfaceKey) => (value: string) =>
    setDraft((d) => ({ ...d, surfaces: { ...d.surfaces, [key]: value } }));

  const parsed = useMemo(() => toColors(draft), [draft]);
  const built = useMemo(() => {
    if (!parsed.colors) return { error: parsed.error };
    try {
      return { theme: buildTheme(parsed.colors, { autoAdjust }) };
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, [parsed, autoAdjust]);
  const theme = built.theme ?? null;
  const rows = useMemo(() => (theme ? contrastReport(theme) : []), [theme]);
  const vars = useMemo(() => (theme ? (themeToCssVars(theme) as CSSProperties) : {}), [theme]);
  const failingRequired = rows.filter((r) => r.required && !rowPasses(r)).length;
  const warnings = rows.filter((r) => !r.required && !rowPasses(r)).length;
  const noAccent = !draft.accent.trim();
  const defaults = useMemo(() => resolveSurfaces(undefined, !noAccent), [noAccent]);

  const json = useMemo(() => {
    if (!parsed.colors) return "";
    const { brand, accent, action } = parsed.colors;
    // Only the surfaces that differ from their default go in the file.
    const surfaces = Object.fromEntries(
      Object.entries(draft.surfaces).filter(([key, value]) => defaults[key as SurfaceKey] !== value),
    );
    return JSON.stringify(
      {
        brand,
        ...(accent ? { accent } : {}),
        ...(action ? { action } : {}),
        ...(Object.keys(surfaces).length ? { surfaces } : {}),
        ...(BRAND.program.colors.source ? { source: BRAND.program.colors.source } : {}),
      },
      null,
      2,
    );
  }, [parsed, draft.surfaces, defaults]);

  return (
    <>
      <div className="flex min-h-0 flex-1">
        {/* Controls. Scrolls on its own, so the preview stays in view while you adjust. */}
        <aside className="w-[340px] shrink-0 overflow-y-auto border-r border-[#cbd5e1] bg-white p-4">
          <Field label="Brand" hint="Logo color. Headings, links, footer." value={draft.brand} onChange={set("brand")} />
          <Field label="Accent" hint="Second brand color. Used where a surface says accent." value={draft.accent} onChange={set("accent")} optional />
          <Field label="Action" hint="Button color. Defaults to brand." value={draft.action} onChange={set("action")} optional />

          <h2 className="mb-1 mt-5 border-t border-[#e2e8f0] pt-3 text-xs font-bold uppercase tracking-wide text-[#64748b]">Surfaces</h2>
          <p className="mb-3 text-xs text-[#64748b]">
            {noAccent
              ? "No accent set, so every accent choice uses the brand color."
              : "Choices pick which color a screen uses. They never add a color."}
          </p>
          {(Object.keys(SURFACE_OPTIONS) as SurfaceKey[]).map((key) => {
            const value = draft.surfaces[key] ?? defaults[key];
            return (
              <SurfaceControl
                key={key}
                name={key}
                value={value}
                isDefault={value === defaults[key]}
                onChange={setSurface(key)}
              />
            );
          })}

          <div className="mb-2 mt-4 flex gap-2">
            <button
              type="button"
              disabled={!json}
              onClick={() => {
                navigator.clipboard?.writeText(json);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded bg-[#0f172a] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {copied ? "Copied" : "Copy colors JSON"}
            </button>
            <button type="button" onClick={() => setDraft(initial())} className="rounded border border-[#cbd5e1] px-3 py-1.5 text-sm">
              Undo my changes
            </button>
          </div>
          <pre className="max-h-48 overflow-auto rounded bg-[#0f172a] p-3 text-xs text-[#f1f5f9]">{json || built.error}</pre>
        </aside>

        {/* Preview and scores. The summary bar stays at the top while this side scrolls. */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          {theme ? (
            <>
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#cbd5e1] bg-white px-5 py-2">
                <p className={`text-sm font-semibold ${failingRequired ? "text-[#dc2626]" : "text-emerald-700"}`}>
                  {failingRequired ? `${failingRequired} required pair fails` : "Required pairs pass"}
                  {warnings ? `, ${warnings} warning${warnings > 1 ? "s" : ""}` : ""}
                </p>
                <span className="text-xs text-[#64748b]">
                  Confirmation text: {theme.onHero === "#ffffff" ? "white" : "near-black"}. Button text:{" "}
                  {theme.onAction === "#ffffff" ? "white" : "near-black"}.
                </span>
                <span className="ml-auto flex items-center gap-2 text-xs text-[#475569]">
                  Automatic adjustment
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoAdjust}
                    onClick={() => setAutoAdjust((v) => !v)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold ${
                      autoAdjust ? "bg-emerald-600 text-white" : "bg-[#cbd5e1] text-[#1e293b]"
                    }`}
                  >
                    {autoAdjust ? "Applied" : "Not applied"}
                  </button>
                </span>
              </div>

              <div className="p-5">
                <Mocks vars={vars} />

                <div className="mt-6 max-w-4xl">
                  <div className="mb-3 rounded border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900">
                    <p className="mb-1 font-semibold">Automatic contrast adjustment</p>
                    {theme.adjustments.length > 0 ? (
                      <ul className="list-disc pl-4">
                        {theme.adjustments.map((a) => (
                          <li key={a.id}>{a.message}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Nothing needs adjusting. Every derived color already passes.</p>
                    )}
                    <p className="mt-1 text-sky-700">
                      The switch above is a preview. The app always applies it, and your brand, accent, and action are never changed.
                      {draft.surfaces.marker && theme.marker === "#ffffff" && draft.surfaces.marker !== "white"
                        ? " The step marker matches its row, so it shows white."
                        : ""}
                    </p>
                  </div>

                  <h2 className="mb-1 text-base font-bold">Contrast (WCAG 2.x)</h2>
                  <p className="mb-3 text-xs text-[#475569]">
                    Text needs AA 4.5. Large text (24px, or 19px bold) and UI parts need AA large 3.0. Gradients score at
                    the worst point of the text area. A required row fails <code>pnpm test</code>. A warning does not.
                    The header strip is decorative and has no row.
                  </p>
                  <ScoreTable rows={rows} />
                </div>
              </div>
            </>
          ) : (
            <p className="p-5 text-sm text-[#dc2626]">{built.error}</p>
          )}
        </main>
      </div>
    </>
  );
}

type Tab = "colors" | "demos";

export default function BrandLab() {
  const [tab, setTab] = useState<Tab>("colors");
  return (
    <div className="flex h-screen flex-col bg-[#f8fafc] text-[#0f172a]">
      <header className="flex shrink-0 items-center gap-4 border-b border-[#cbd5e1] bg-white px-5 py-2.5">
        <h1 className="text-lg font-bold">Brand Lab</h1>
        <nav className="flex gap-1" aria-label="Brand Lab sections">
          {(["colors", "demos"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-current={tab === t}
              className={`rounded px-3 py-1 text-sm font-semibold ${
                tab === t ? "bg-[#0f172a] text-white" : "border border-[#cbd5e1] bg-white text-[#0f172a]"
              }`}
            >
              {t === "colors" ? "Colors" : "Demos"}
            </button>
          ))}
        </nav>
        <p className="text-xs text-[#475569]">
          Starting from <strong>{BRAND.name}</strong>. Nothing is saved. Copy the JSON into{" "}
          <code>brands/{BRAND.slug}/brand.json</code>. Dev only.
        </p>
      </header>
      {tab === "colors" ? <ColorsLab /> : <DemosLab />}
    </div>
  );
}
