/**
 * BRANDING CONFIGURATION
 *
 * There are two distinct branding layers:
 *
 *   MANUFACTURER — displayed only in the Header and Footer
 *                  (platform name, logo, tagline, support, legal)
 *
 *   PROGRAM      — displayed throughout the workflow pages
 *                  (drug name, drug logo, description, brand colors)
 *
 * The values below come from getCachedActiveBrand(), which holds whatever
 * /api/brand/active returned at app boot (see client/bootstrap.tsx and
 * client/lib/activeBrandCache.ts) — backed by Netlify Blobs, not this
 * file's own bundled ./active-brand.json. That JSON file is only the
 * offline/fallback default now: saving or promoting a brand takes effect
 * immediately without a rebuild, because it's fetched at runtime rather
 * than baked into the JS bundle at build time. Saved brands live in the
 * Blobs store and can be reloaded from the /admin screen's "Load brand"
 * dropdown.
 *
 * PROGRAM.colors also drives the --arx-primary* CSS variables used across
 * the design system — see applyBrandCssVars() below.
 *
 * Logo variants:
 *   colors — transparent background, brand-colored (use on white/light bg)
 *   white  — transparent background, all white    (use on teal/dark bg)
 */
import { getCachedActiveBrand } from "@/lib/activeBrandCache";
import { applyBrandCssVars } from "@/lib/applyBrandCssVars";

const activeBrand = getCachedActiveBrand();

export const MANUFACTURER = {
  ...activeBrand.manufacturer,
  copyright: activeBrand.manufacturer.copyright.replace(
    "{{YEAR}}",
    String(new Date().getFullYear()),
  ),
};

export const PROGRAM = activeBrand.program;

export const CHATBOT_ICON = activeBrand.chatbotIcon;

export const FAVICON = (activeBrand as { favicon?: string }).favicon ?? "";

// Push PROGRAM.colors into the --arx-primary* CSS variables, and swap the
// browser tab icon to the admin-configured favicon (falls back to the
// static /favicon.svg in index.html when none is set). Re-runs on every
// full page load, including the reload that follows a save in /admin.
if (typeof document !== "undefined") {
  applyBrandCssVars(PROGRAM.colors);
  if (FAVICON) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = FAVICON;
  }
}
