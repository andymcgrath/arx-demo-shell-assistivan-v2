/**
 * Turns a brand's three colors into a full theme.
 *
 *   brand   The logo color. Headings, footer, links. Required.
 *   accent  The second brand color. Pairs with `brand` in gradients. Optional.
 *   action  The button color. Optional. Defaults to `brand`.
 *
 * Everything else is derived here, in one place:
 *
 *   dark         brand, darker.   Hover on brand-colored links and icons.
 *   light        brand, lighter.  Secondary accents.
 *   wash         brand, faint.    Tinted backgrounds.
 *   actionHover  action, darker.  Button hover and pressed states.
 *   onAction     Button text. White, unless `action` would need to darken a lot to pass AA.
 *
 * Buttons use `action`. Everything else (headings, links, icons, bars, confirmation screens) uses
 * `brand`. They are the same color unless the client sets `action`.
 *
 * `action` in the theme can be a little darker than the one in the brand file. Buttons keep white
 * text, so the fill darkens until white reads at AA (see `buttonColors`).
 *   gradient  `brand` to `accent` (or to `light` when there is no accent).
 *
 * Shades move through OKLCH lightness, so a yellow brand and a navy brand step the same way.
 *
 * Pure functions with no imports. App code and the brand tests both use them.
 */

export interface BrandColors {
  brand: string;
  accent?: string;
  action?: string;
  /** Where the values came from (a URL or a document name). */
  source?: string;
}

export interface BrandTheme {
  brand: string;
  accent: string | undefined;
  action: string;
  onAction: string;
  /** Hover and pressed shade of `action`. */
  actionHover: string;
  dark: string;
  light: string;
  wash: string;
  /** A CSS `linear-gradient(...)` value. */
  gradient: string;
}

/** WCAG AA for normal text. */
export const AA_CONTRAST = 4.5;

const WHITE = "#ffffff";
const NEAR_BLACK = "#111111";

// ── hex and sRGB ────────────────────────────────────────────────────────────

export function normalizeHex(hex: string): string {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex color: "${hex}"`);
  return `#${full.toLowerCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

// ── OKLCH (Björn Ottosson's matrices) ───────────────────────────────────────

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH to hex. Lowers chroma until the color fits in sRGB, so hue and lightness hold. */
export function oklchToHex(color: Oklch): string {
  let { c } = color;
  let rgb = oklchToLinearRgb({ ...color, c });
  for (let i = 0; i < 24 && !inGamut(rgb); i++) {
    c *= 0.9;
    rgb = oklchToLinearRgb({ ...color, c });
  }
  return rgbToHex(rgb.map(toGamma) as [number, number, number]);
}

// ── contrast ────────────────────────────────────────────────────────────────

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black text, whichever has more contrast on `background`. */
export function readableOn(background: string): string {
  return contrastRatio(WHITE, background) >= contrastRatio(NEAR_BLACK, background) ? WHITE : NEAR_BLACK;
}

// ── theme ───────────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The three derived shades of one color. Exposed for tests. */
export function deriveShades(brand: string): { dark: string; light: string; wash: string } {
  const { l, c, h } = hexToOklch(brand);
  return {
    dark: oklchToHex({ l: clamp(l - 0.1, 0.18, 0.95), c, h }),
    light: oklchToHex({ l: clamp(l + 0.12, 0.05, 0.9), c: c * 0.85, h }),
    wash: oklchToHex({ l: 0.9, c: c * 0.3, h }),
  };
}

/** The most a button color may darken to keep white text. Past this it keeps its color and gets dark text. */
const MAX_ACTION_DARKENING = 0.12;

/**
 * Buttons keep white text when they can. If white misses AA, the fill darkens in small OKLCH steps
 * (hue and chroma hold) until it passes. If that takes more than MAX_ACTION_DARKENING, the color
 * stays as the client set it and the text turns near-black instead.
 */
export function buttonColors(action: string): { action: string; onAction: string } {
  if (contrastRatio(WHITE, action) >= AA_CONTRAST) return { action, onAction: WHITE };
  const start = hexToOklch(action);
  for (let step = 0.005; step <= MAX_ACTION_DARKENING + 1e-9; step += 0.005) {
    const darker = oklchToHex({ ...start, l: start.l - step });
    if (contrastRatio(WHITE, darker) >= AA_CONTRAST) return { action: darker, onAction: WHITE };
  }
  return { action, onAction: readableOn(action) };
}

export function buildTheme(colors: BrandColors): BrandTheme {
  const brand = normalizeHex(colors.brand);
  const accent = colors.accent ? normalizeHex(colors.accent) : undefined;
  const { action, onAction } = buttonColors(normalizeHex(colors.action ?? brand));
  const { dark, light, wash } = deriveShades(brand);
  return {
    brand,
    accent,
    action,
    onAction,
    dark,
    actionHover: deriveShades(action).dark,
    light,
    wash,
    gradient: `linear-gradient(135deg, ${brand}, ${accent ?? light})`,
  };
}

// ── CSS ─────────────────────────────────────────────────────────────────────

/** "h s% l%", the format the --arx-* variables use. */
export function hexToHslString(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Variable names stay as they were, so existing screens keep working:
 * --arx-primary is the brand color, and -dark, -80, and -30 are its shades.
 * Buttons read --arx-action, --arx-action-hover, and --arx-on-action instead.
 * --arx-brand (same as --arx-primary), --arx-accent, and --arx-gradient are new.
 */
export function themeToCssVars(theme: BrandTheme): Record<string, string> {
  return {
    "--arx-primary": hexToHslString(theme.brand),
    "--arx-primary-dark": hexToHslString(theme.dark),
    "--arx-primary-80": hexToHslString(theme.light),
    "--arx-primary-30": hexToHslString(theme.wash),
    "--arx-brand": hexToHslString(theme.brand),
    "--arx-accent": hexToHslString(theme.accent ?? theme.light),
    "--arx-action": hexToHslString(theme.action),
    "--arx-action-hover": hexToHslString(theme.actionHover),
    "--arx-on-action": hexToHslString(theme.onAction),
    "--arx-gradient": theme.gradient,
  };
}
