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
 * `surfaces` holds style choices (confirmation background, header strip, icon tiles, step row and marker,
 * heading color). They pick which of these colors a screen uses and never add a color.
 *
 * Pure functions with no imports. App code and the brand tests both use them.
 */

/**
 * Style choices for the screens that use the colors. They are not colors, so brand, accent, and action
 * stay the three-color standard. Every key is optional. `accent` here means the accent color, or the
 * brand color when the brand has no accent.
 */
export const SURFACE_OPTIONS = {
  /** Confirmation background. `gradient` is brand to accent. */
  confirmation: ["brand", "accent", "gradient"],
  /** The 3px line under the header. `none` leaves it white. */
  strip: ["none", "accent", "brand"],
  /** Icon tiles. `tint` is a light brand tint with a brand icon. `accent` is a solid tile with a readable icon. */
  tiles: ["tint", "accent"],
  /** Fill of the active step row in the order tracker. */
  stepRow: ["brand", "accent"],
  /** The number circle on the active step. Defaults to `accent` when the brand has one, else `white`. */
  marker: ["accent", "white", "brand"],
  /** Color of headings and links. `dark` is the darker brand shade. */
  headings: ["brand", "dark"],
} as const;

export type SurfaceKey = keyof typeof SURFACE_OPTIONS;
export type Surfaces = { [K in SurfaceKey]?: (typeof SURFACE_OPTIONS)[K][number] };
export type ResolvedSurfaces = { [K in SurfaceKey]: (typeof SURFACE_OPTIONS)[K][number] };

/** How confirmation screens fill their background. `brand` is the default. */
export type ConfirmationStyle = (typeof SURFACE_OPTIONS.confirmation)[number];
export const CONFIRMATION_STYLES: ConfirmationStyle[] = [...SURFACE_OPTIONS.confirmation];

export interface BrandColors {
  brand: string;
  accent?: string;
  action?: string;
  /** Style choices for the surfaces that use these colors. Leave out a key to take its default. */
  surfaces?: Surfaces;
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
  /** The light brand tint, lightened when brand text on it would miss AA. Icon tiles and selected rows use it. */
  tint: string;
  /** Fill of the completed-step circle. The light brand shade, darkened when the white check on it would miss 3:1. */
  stepDone: string;
  /** Colors the theme moved to pass a contrast target. */
  adjustments: Adjustment[];
  /** Every surface choice after defaults. */
  surfaces: ResolvedSurfaces;
  /** The confirmation background as a CSS `background-image` value. */
  hero: string;
  /** The first and last color of the confirmation background. Equal for a flat fill. */
  heroStops: [string, string];
  /** Text on the confirmation background: white or near-black, whichever scores better across the text area. */
  onHero: string;
  /** The line under the header. White when `strip` is `none`. */
  strip: string;
  /** Icon tile fill, and the color of what sits on it. */
  tileBg: string;
  tileFg: string;
  /** Active step row fill, and its text. */
  stepRow: string;
  onStepRow: string;
  /** The number circle on the active step, and its text. Falls back to white when it would match the row. */
  marker: string;
  onMarker: string;
  /** Headings and links. */
  link: string;
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

/**
 * The shared fix for a derived color that misses its contrast target. `fixed` stays as it is. `adjustable`
 * moves in small OKLCH lightness steps (hue and chroma hold) until the pair reaches `target`. If that takes more
 * than `maxShift`, the color is left alone and the pair stays a warning in the Brand Lab.
 * Use it on derived colors only. Brand, accent, and action come from the client and are never moved.
 */
export function ensureContrast(
  fixed: string,
  adjustable: string,
  target: number,
  direction: "lighter" | "darker",
  maxShift = 0.08,
): { color: string; adjusted: boolean; met: boolean } {
  if (contrastRatio(fixed, adjustable) >= target) return { color: adjustable, adjusted: false, met: true };
  const start = hexToOklch(adjustable);
  const sign = direction === "lighter" ? 1 : -1;
  for (let step = 0.005; step <= maxShift + 1e-9; step += 0.005) {
    const color = oklchToHex({ ...start, l: clamp(start.l + sign * step, 0, 1) });
    if (contrastRatio(fixed, color) >= target) return { color, adjusted: true, met: true };
  }
  return { color: adjustable, adjusted: false, met: false };
}

/** A color the theme moved to reach a contrast target. The Brand Lab lists these. */
export interface Adjustment {
  id: string;
  message: string;
  /** False when automatic adjustment is off. The message then says what it would do. */
  applied: boolean;
}

// ── confirmation background ─────────────────────────────────────────────────

/** A point between two colors, mixed in sRGB the way CSS gradients mix. `t` runs 0 to 1. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/**
 * Where body text sits on a confirmation screen, as a share of the gradient. The ends hold the
 * checkmark and the button, so scores use the middle of the span.
 */
export const HERO_TEXT_ZONE = [0.25, 0.5, 0.75] as const;

/** The colors under the text of a confirmation screen. */
export function heroTextBackgrounds(stops: [string, string]): string[] {
  return HERO_TEXT_ZONE.map((t) => mixHex(stops[0], stops[1], t));
}

/** The text color with the better worst-case contrast over `backgrounds`. */
function readableOverAll(backgrounds: string[]): string {
  const worst = (fg: string) => Math.min(...backgrounds.map((bg) => contrastRatio(fg, bg)));
  return worst(WHITE) >= worst(NEAR_BLACK) ? WHITE : NEAR_BLACK;
}

function heroFor(
  style: ConfirmationStyle,
  brand: string,
  accent: string | undefined,
  gradient: string,
): { hero: string; stops: [string, string] } {
  if (!accent || style === "brand") return { hero: `linear-gradient(${brand}, ${brand})`, stops: [brand, brand] };
  if (style === "accent") return { hero: `linear-gradient(${accent}, ${accent})`, stops: [accent, accent] };
  return { hero: gradient, stops: [brand, accent] };
}

// ── WCAG levels ─────────────────────────────────────────────────────────────

export interface WcagLevels {
  /** 4.5. Normal text. */
  aaText: boolean;
  /** 3.0. Large text (24px, or 19px bold) and UI parts such as icons and borders. */
  aaLarge: boolean;
  /** 7.0. Normal text, enhanced. */
  aaaText: boolean;
  /** 4.5. Large text, enhanced. */
  aaaLarge: boolean;
}

export function wcagLevels(ratio: number): WcagLevels {
  return { aaText: ratio >= 4.5, aaLarge: ratio >= 3, aaaText: ratio >= 7, aaaLarge: ratio >= 4.5 };
}

export interface ContrastRow {
  id: string;
  label: string;
  /** What the pair is used for. Tells you which level matters. */
  use: "text" | "large" | "ui";
  fg: string;
  bg: string;
  /** The worst ratio when the background changes across the pair (a gradient). */
  ratio: number;
  levels: WcagLevels;
  /** A required row fails the brand test when it misses its level. The others are warnings in the Brand Lab. */
  required: boolean;
}

/** The level a row has to meet: AA text, or AA large for large text and UI parts. */
export function rowPasses(row: ContrastRow): boolean {
  return row.use === "text" ? row.levels.aaText : row.levels.aaLarge;
}

/**
 * Every pair of colors a brand puts on screen, scored. The brand test and the Brand Lab read this one list.
 * Gradients score at the worst point of the text area.
 */
export function contrastReport(theme: BrandTheme): ContrastRow[] {
  const row = (
    id: string,
    label: string,
    use: ContrastRow["use"],
    fg: string,
    bgs: string[],
    required = false,
  ): ContrastRow => {
    const ratio = Math.min(...bgs.map((bg) => contrastRatio(fg, bg)));
    return { id, label, use, fg, bg: bgs[0], ratio, levels: wcagLevels(ratio), required };
  };
  const heroBgs = heroTextBackgrounds(theme.heroStops);
  // The header strip is decorative, so WCAG 1.4.11 sets no contrast for it and it has no row.
  return [
    row("button", "Button text on the action color", "text", theme.onAction, [theme.action], true),
    row("hero-heading", "Confirmation heading (large text)", "large", theme.onHero, heroBgs, true),
    row("hero-body", "Confirmation body text", "text", theme.onHero, heroBgs),
    row("heading", "Headings and links on white", "text", theme.link, [WHITE]),
    row("hero-button", "Brand color on white (confirmation button)", "text", theme.brand, [WHITE]),
    // The Rx tile holds the letters "Rx", so it is text. A tile with only an icon sits beside text that says the
    // same thing, so the icon is a 3:1 warning at most (WCAG 1.4.11).
    row("tile-text", "Rx tile text", "text", theme.tileFg, [theme.tileBg]),
    row("tile-icon", "Tile icon", "ui", theme.tileFg, [theme.tileBg]),
    row("step-row", "Active step row text", "text", theme.onStepRow, [theme.stepRow]),
    row("marker", "Step marker number", "text", theme.onMarker, [theme.marker]),
    row("marker-row", "Step marker against its row", "ui", theme.marker, [theme.stepRow]),
    row("step-done", "Completed step check (white on its circle)", "ui", WHITE, [theme.stepDone]),
  ];
}

/** Defaults filled in, and every key and value checked against SURFACE_OPTIONS. */
export function resolveSurfaces(surfaces: Surfaces | undefined, hasAccent: boolean): ResolvedSurfaces {
  const given = (surfaces ?? {}) as Record<string, string>;
  for (const [key, value] of Object.entries(given)) {
    const options = (SURFACE_OPTIONS as Record<string, readonly string[]>)[key];
    if (!options) throw new Error(`Unknown surface "${key}"`);
    if (!options.includes(value)) throw new Error(`Surface "${key}" has no option "${value}" (options: ${options.join(", ")})`);
  }
  return {
    confirmation: "brand",
    strip: "none",
    tiles: "tint",
    stepRow: "brand",
    marker: hasAccent ? "accent" : "white",
    headings: "brand",
    ...given,
  } as ResolvedSurfaces;
}

export interface BuildThemeOptions {
  /**
   * Move derived colors (the tint, the button fill) to reach AA. Default true. The Brand Lab turns it off to show a
   * brand as set, so you can see what the adjustment changes.
   */
  autoAdjust?: boolean;
}

export function buildTheme(colors: BrandColors, options: BuildThemeOptions = {}): BrandTheme {
  const autoAdjust = options.autoAdjust ?? true;
  const brand = normalizeHex(colors.brand);
  const accent = colors.accent ? normalizeHex(colors.accent) : undefined;
  const accentOrBrand = accent ?? brand;
  const requestedAction = normalizeHex(colors.action ?? brand);
  const { dark, light, wash } = deriveShades(brand);
  const adjustments: Adjustment[] = [];

  // Button fill. White text needs AA 4.5, so the fill darkens a little when it must.
  const button = buttonColors(requestedAction);
  if (button.action !== requestedAction) {
    adjustments.push({
      id: "button",
      applied: autoAdjust,
      message: autoAdjust
        ? `Button fill darkened from ${requestedAction} to ${button.action} so white text reaches AA 4.5.`
        : `Would darken the button fill from ${requestedAction} to ${button.action} so white text reaches AA 4.5.`,
    });
  }
  const action = autoAdjust ? button.action : requestedAction;
  const onAction = autoAdjust ? button.onAction : WHITE;

  // Brand text sits on the tint (Rx tile, selected rows). Lighten the tint until it reaches AA 4.5.
  const fitted = ensureContrast(brand, wash, AA_CONTRAST, "lighter");
  if (fitted.adjusted) {
    adjustments.push({
      id: "tint",
      applied: autoAdjust,
      message: autoAdjust
        ? `Tint lightened from ${wash} to ${fitted.color} so brand text on it reaches AA 4.5.`
        : `Would lighten the tint from ${wash} to ${fitted.color} so brand text on it reaches AA 4.5.`,
    });
  }
  const tint = autoAdjust ? fitted.color : wash;
  // The completed-step circle carries a white check, a graphic that needs 3:1. Darken the circle until it does.
  const doneFit = ensureContrast(WHITE, light, 3, "darker");
  if (doneFit.adjusted) {
    adjustments.push({
      id: "step-done",
      applied: autoAdjust,
      message: autoAdjust
        ? `Completed-step circle darkened from ${light} to ${doneFit.color} so the white check reaches 3:1.`
        : `Would darken the completed-step circle from ${light} to ${doneFit.color} so the white check reaches 3:1.`,
    });
  }
  const stepDone = autoAdjust ? doneFit.color : light;
  const surfaces = resolveSurfaces(colors.surfaces, !!accent);
  const gradient = `linear-gradient(135deg, ${brand}, ${accent ?? light})`;
  const { hero, stops } = heroFor(surfaces.confirmation, brand, accent, gradient);

  const tileBg = surfaces.tiles === "tint" ? tint : accentOrBrand;
  const tileFg = surfaces.tiles === "tint" ? brand : readableOn(accentOrBrand);
  const stepRow = surfaces.stepRow === "accent" ? accentOrBrand : brand;
  // A marker the same color as its row would vanish, so it falls back to white.
  const wanted = surfaces.marker === "accent" ? accentOrBrand : surfaces.marker === "brand" ? brand : WHITE;
  const marker = wanted === stepRow ? WHITE : wanted;

  return {
    tint,
    stepDone,
    adjustments,
    surfaces,
    hero,
    heroStops: stops,
    onHero: readableOverAll(heroTextBackgrounds(stops)),
    strip: surfaces.strip === "none" ? WHITE : surfaces.strip === "brand" ? brand : accentOrBrand,
    tileBg,
    tileFg,
    stepRow,
    onStepRow: readableOn(stepRow),
    marker,
    onMarker: marker === WHITE ? brand : readableOn(marker),
    link: surfaces.headings === "dark" ? dark : brand,
    brand,
    accent,
    action,
    onAction,
    dark,
    actionHover: deriveShades(action).dark,
    light,
    wash,
    gradient,
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
    "--arx-tile": hexToHslString(theme.tileBg),
    "--arx-on-tile": hexToHslString(theme.tileFg),
    "--arx-strip": hexToHslString(theme.strip),
    "--arx-step-done": hexToHslString(theme.stepDone),
    "--arx-step-row": hexToHslString(theme.stepRow),
    "--arx-on-step-row": hexToHslString(theme.onStepRow),
    "--arx-marker": hexToHslString(theme.marker),
    "--arx-on-marker": hexToHslString(theme.onMarker),
    "--arx-link": hexToHslString(theme.link),
    // Confirmation screens. A `background-image` value, so a flat fill is a one-color gradient.
    "--arx-hero": theme.hero,
    "--arx-on-hero": hexToHslString(theme.onHero),
    // The light tint of the brand. Icon tiles, selected rows, and hover washes read it.
    "--arx-sky": hexToHslString(theme.tint),
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
