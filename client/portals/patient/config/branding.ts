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


// Push PROGRAM.colors into the --arx-primary* CSS variables. The favicon is set at build time
// (see brandFaviconPlugin in vite.config.ts).
if (typeof document !== "undefined") {
  applyBrandCssVars(PROGRAM.colors);
}
