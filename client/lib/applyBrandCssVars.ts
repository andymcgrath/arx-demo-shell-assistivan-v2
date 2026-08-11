/**
 * Applies the active brand's colors to the Patient Portal's CSS custom
 * properties (see `.portal-patient` in global.css).
 *
 * Rather than rewriting global.css on every rebrand (fragile — text-patching
 * a stylesheet), this injects a small <style> override tag at runtime. It's
 * called once from branding.ts on module load, which re-runs whenever
 * active-brand.json changes (Vite reloads the page after a save).
 *
 * Mapping (matches the original hand-authored global.css comment) — all four
 * are plain hex-to-HSL conversions of explicit admin fields. Nothing here is
 * derived/guessed; --arx-primary-30 used to be computed from a heuristic
 * formula, but that was replaced with a real `primaryWash` field so every
 * shade is something an admin actually chose.
 *   colors.primary      -> --arx-primary
 *   colors.primaryDark  -> --arx-primary-dark
 *   colors.primaryLight -> --arx-primary-80
 *   colors.primaryWash  -> --arx-primary-30
 */

const STYLE_TAG_ID = "brand-css-vars";

interface ProgramColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryWash: string;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean.split("").map(c => c + c).join("")
      : clean.padEnd(6, "0").slice(0, 6);

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      h = ((b - r) / d + 2) * 60;
      break;
    default:
      h = ((r - g) / d + 4) * 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslString({ h, s, l }: { h: number; s: number; l: number }): string {
  return `${h} ${s}% ${l}%`;
}

export function applyBrandCssVars(colors: ProgramColors) {
  if (typeof document === "undefined") return;

  try {
    const primary = hexToHsl(colors.primary);
    const dark = hexToHsl(colors.primaryDark);
    const light = hexToHsl(colors.primaryLight);
    const wash = hexToHsl(colors.primaryWash);

    const css = `.portal-patient {
  --arx-primary: ${hslString(primary)};
  --arx-primary-dark: ${hslString(dark)};
  --arx-primary-80: ${hslString(light)};
  --arx-primary-30: ${hslString(wash)};
}`;

    let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = STYLE_TAG_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = css;
  } catch (err) {
    console.error("Failed to apply brand CSS variables:", err);
  }
}
