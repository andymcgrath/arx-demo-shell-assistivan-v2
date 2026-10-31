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

/**
 * The Client tab shows the CRM case page (crm/pages/Index.tsx), which paints its brand colors through
 * --crm-* variables with the CRM's own hex as fallback. Here they follow this tab's brand variables.
 */
if (typeof document !== "undefined") {
  const id = "client-crm-css-vars";
  if (!document.getElementById(id)) {
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = `.portal-client {
  --crm-primary: hsl(var(--arx-primary));
  --crm-primary-dark: hsl(var(--arx-primary-dark));
  --crm-primary-30: hsl(var(--arx-primary-30));
  --crm-primary-80: hsl(var(--arx-primary-80));
}`;
    document.head.appendChild(tag);
  }
}
