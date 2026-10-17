/**
 * BRANDING CONFIGURATION
 *
 * Two layers:
 *
 *   MANUFACTURER: shown only in the Header and Footer
 *                 (platform name, logo, tagline, support, legal)
 *
 *   PROGRAM:      shown throughout the workflow pages
 *                 (drug name, drug logo, description, brand colors)
 *
 * Both come from the active brand, `brands/<BRAND>/brand.json`, bundled at build time.
 * PROGRAM.colors also drives the --arx-primary* CSS variables (see applyBrandCssVars).
 *
 * Logo variants:
 *   colors: transparent background, brand-colored (use on white or light backgrounds)
 *   white:  transparent background, all white (use on dark backgrounds)
 */
import { BRAND } from "@/brand";
import { applyBrandCssVars } from "@/lib/applyBrandCssVars";

const activeBrand = BRAND;

export const MANUFACTURER = {
  ...activeBrand.manufacturer,
  copyright: activeBrand.manufacturer.copyright.replace(
    "{{YEAR}}",
    String(new Date().getFullYear()),
  ),
};

export const PROGRAM = activeBrand.program;

export const CHATBOT_ICON = activeBrand.chatbotIcon;

export const FAVICON = activeBrand.favicon ?? "";

// Push PROGRAM.colors into the --arx-primary* CSS variables, and swap the
// browser tab icon to the brand favicon (falls back to the static
// /favicon.svg in index.html when none is set).
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
