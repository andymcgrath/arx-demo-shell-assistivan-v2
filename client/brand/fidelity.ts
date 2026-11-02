/**
 * Fidelity: how far the colors a demo shows are from the colors the client set, as numbers, so a match is measured and
 * not judged by eye. Pure functions over `BrandColors` and `BrandTheme`. The Brand Lab shows them.
 *
 * Distance is the Euclidean distance in OKLab, times 100. Under about 1 the eye cannot tell two colors apart. Under 3 a
 * side-by-side comparison barely shows it. Past that the demo shows a different color from the client's.
 */
import { hexToOklch, normalizeHex, type BrandColors, type BrandTheme } from "./theme";

export type Verdict = "same" | "close" | "different";

export interface FidelityRow {
  id: string;
  label: string;
  /** What the client set, or what a role should match. */
  requested: string;
  /** What the demo shows. */
  applied: string;
  distance: number;
  verdict: Verdict;
}

/** The distance between two colors in OKLab, times 100. */
export function colorDistance(a: string, b: string): number {
  const lab = (hex: string) => {
    const { l, c, h } = hexToOklch(hex);
    return [l, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];
  };
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2) * 100;
}

export const verdictFor = (distance: number): Verdict => (distance < 1 ? "same" : distance < 3 ? "close" : "different");

const row = (id: string, label: string, requested: string, applied: string): FidelityRow => {
  const distance = colorDistance(requested, applied);
  return { id, label, requested, applied, distance, verdict: verdictFor(distance) };
};

/**
 * One row per color the client set, comparing it with the color the theme applies. An `exact` brand matches on every row.
 * An accessible brand shows what the contrast adjustment moved. The last row is the seam to look for: when buttons use a
 * different color from the brand fills, one screen shows two versions of the client's color.
 */
export function fidelityReport(colors: BrandColors, theme: BrandTheme): FidelityRow[] {
  const rows = [row("brand", "Brand color", normalizeHex(colors.brand), theme.brand)];
  if (colors.accent) rows.push(row("accent", "Accent color", normalizeHex(colors.accent), theme.accent ?? theme.brand));
  if (colors.action) rows.push(row("action", "Button color", normalizeHex(colors.action), theme.action));
  if (colors.onAction) rows.push(row("on-action", "Button text", normalizeHex(colors.onAction), theme.onAction));
  if (colors.onBrand) rows.push(row("on-brand", "Text on brand fills", normalizeHex(colors.onBrand), theme.onBrand));
  rows.push(row("buttons-vs-brand", "Buttons against brand fills", theme.brand, theme.action));
  return rows;
}

export interface PaletteEntry {
  hex: string;
  /** The roles that use this color, so a reader sees what each one is for. */
  roles: string[];
}

/** Every color the journey draws with, once each, with the roles that use it. Fewer entries means a more uniform journey. */
export function journeyPalette(theme: BrandTheme): PaletteEntry[] {
  const used: [string, string][] = [
    ["brand", theme.brand],
    ["button", theme.action],
    ["button hover", theme.actionHover],
    ["button text", theme.onAction],
    ["text on brand", theme.onBrand],
    ["links and headings", theme.link],
    ["tint", theme.tint],
    ["completed step", theme.stepDone],
    ["icon tile", theme.tileBg],
    ["icon tile text", theme.tileFg],
    ["active step row", theme.stepRow],
    ["active step text", theme.onStepRow],
    ["step marker", theme.marker],
    ["step marker text", theme.onMarker],
    ["confirmation text", theme.onHero],
    ["confirmation start", theme.heroStops[0]],
    ["confirmation end", theme.heroStops[1]],
    ["header strip", theme.strip],
  ];
  if (theme.accent) used.push(["accent", theme.accent]);
  const byHex = new Map<string, string[]>();
  for (const [role, hex] of used) {
    const key = normalizeHex(hex).toLowerCase();
    byHex.set(key, [...(byHex.get(key) ?? []), role]);
  }
  return [...byHex].map(([hex, roles]) => ({ hex, roles }));
}

/** True for a color with visible hue. White, near-black, and grays are neutrals. */
export const isChromatic = (hex: string): boolean => hexToOklch(hex).c > 0.03;
