/**
 * The Demo Lab's fidelity panel: how far each color the demo shows is from the one the client set, and every color the
 * journey draws with. Numbers come from `@/brand/fidelity`, so a match is measured and not judged by eye.
 */
import { journeyPalette, fidelityReport, isChromatic, type Verdict } from "@/brand/fidelity";
import type { BrandColors, BrandTheme } from "@/brand/theme";

const VERDICT_STYLE: Record<Verdict, string> = {
  same: "text-emerald-700",
  close: "text-amber-700",
  different: "text-[#dc2626]",
};

const Swatch = ({ hex }: { hex: string }) => (
  <span className="inline-block h-4 w-4 rounded border border-[#cbd5e1] align-middle" style={{ background: hex }} aria-hidden="true" />
);

export default function FidelityPanel({ colors, theme }: { colors: BrandColors; theme: BrandTheme }) {
  const rows = fidelityReport(colors, theme);
  const palette = journeyPalette(theme);
  const chromatic = palette.filter((p) => isChromatic(p.hex));
  const seam = rows.find((r) => r.id === "buttons-vs-brand");

  return (
    <section aria-label="Fidelity">
      <h2 className="mb-1 text-base font-bold">Match to the client</h2>
      <p className="mb-3 text-xs text-[#475569]">
        Distance is measured in OKLab, times 100. Under 1 the eye cannot tell the colors apart. Under 3 a side-by-side barely shows it.
      </p>
      <table className="mb-3 w-full text-left text-xs">
        <thead>
          <tr className="text-[#64748b]">
            <th className="py-1 pr-3 font-semibold">Color</th>
            <th className="py-1 pr-3 font-semibold">Client</th>
            <th className="py-1 pr-3 font-semibold">Demo shows</th>
            <th className="py-1 font-semibold">Distance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[#e2e8f0]">
              <td className="py-1 pr-3">{r.label}</td>
              <td className="py-1 pr-3 font-mono"><Swatch hex={r.requested} /> {r.requested}</td>
              <td className="py-1 pr-3 font-mono"><Swatch hex={r.applied} /> {r.applied}</td>
              <td className={`py-1 font-semibold ${VERDICT_STYLE[r.verdict]}`}>
                {r.distance.toFixed(1)} ({r.verdict})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {seam && seam.verdict === "different" && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Buttons and brand fills are different colors, so one screen shows two versions of the client's color. Set the same color for both, or leave the button color out.
        </p>
      )}

      <h3 className="mb-1 text-sm font-bold">Colors the journey draws with</h3>
      <p className="mb-2 text-xs text-[#475569]">
        {palette.length} colors, {chromatic.length} with a hue. Every screen reads these. A new color on a screen is a bug.
      </p>
      <ul className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {palette.map((p) => (
          <li key={p.hex}>
            <Swatch hex={p.hex} /> <span className="font-mono">{p.hex}</span> <span className="text-[#64748b]">{p.roles.join(", ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
