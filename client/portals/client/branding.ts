/**
 * Client tab branding. It follows the active brand, like every other portal.
 *
 * Reuses applyBrandCssVars() (client/lib/applyBrandCssVars.ts), pointed at
 * ".portal-client" so the Client tab's own --arx-primary* variables pick up the
 * brand colors.
 *
 * Imported once, as a side effect, from client/portals/client/index.tsx.
 */
import { BRAND } from "@/brand";
import { applyBrandCssVars } from "@/lib/applyBrandCssVars";

export const CLIENT_PROGRAM = BRAND.program;
export const CLIENT_MANUFACTURER = BRAND.manufacturer;

if (typeof document !== "undefined") {
  applyBrandCssVars(CLIENT_PROGRAM.colors, ".portal-client", "client-brand-css-vars");
}
