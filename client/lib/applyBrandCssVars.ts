/**
 * Applies a brand's colors to a portal's CSS custom properties (see `.portal-patient` in
 * global.css).
 *
 * The shades are derived in `@/brand/theme` from the brand tokens. This file only injects the
 * result as a small <style> tag, so global.css never needs rewriting on a rebrand.
 *
 *   brand        -> --arx-primary, --arx-brand
 *   dark         -> --arx-primary-dark
 *   light        -> --arx-primary-80
 *   wash         -> --arx-primary-30
 *   accent       -> --arx-accent
 *   action       -> --arx-action
 *   actionHover  -> --arx-action-hover
 *   onAction     -> --arx-on-action
 *   gradient     -> --arx-gradient
 *
 * `selector` and `styleTagId` default to the patient portal. The client tab passes its own.
 */
import { buildTheme, themeToCssVars, type BrandColors } from "@/brand/theme";

const STYLE_TAG_ID = "brand-css-vars";

export function applyBrandCssVars(
  colors: BrandColors,
  selector: string = ".portal-patient",
  styleTagId: string = STYLE_TAG_ID,
) {
  if (typeof document === "undefined") return;

  try {
    const vars = themeToCssVars(buildTheme(colors));
    const body = Object.entries(vars)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join("\n");

    let tag = document.getElementById(styleTagId) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = styleTagId;
      document.head.appendChild(tag);
    }
    tag.textContent = `${selector} {\n${body}\n}`;
  } catch (err) {
    console.error("Failed to apply brand CSS variables:", err);
  }
}
