/**
 * Client tab branding — always TG Therapeutics, on purpose.
 *
 * Unlike the Patient Portal (client/portals/patient/config/branding.ts),
 * which reflects whatever brand is currently "active" for the whole demo
 * (editable at runtime via /admin, see BRANDING_ADMIN_GUIDE.md), the Client
 * tab isn't meant to follow that live setting. It's a fixed presentation of
 * one specific, defined manufacturer brand — TG Therapeutics — regardless of
 * what any other portal is showing. So this reads the built-in TG
 * Therapeutics preset file directly off disk rather than going through
 * activeBrandCache/hydrateActiveBrand.
 *
 * Reuses applyBrandCssVars() (client/lib/applyBrandCssVars.ts) — the exact
 * same hex->HSL conversion and <style> tag injection the Patient Portal
 * uses — just pointed at ".portal-client" instead of ".portal-patient", so
 * the Client tab's own --arx-primary* variables (see .portal-client in
 * client/global.css and the retinted hex literals in pages/Index.tsx,
 * pages/FulfilmentCenter.tsx, and components/BIRRecord.tsx) pick up TG
 * Therapeutics' colors without touching the Patient Portal's brand at all.
 *
 * Imported once, as a side effect, from client/portals/client/index.tsx.
 */
import tgTherapeutics from "@/portals/patient/config/brands/tg-therapuetics.json";
import { applyBrandCssVars } from "@/lib/applyBrandCssVars";

export const CLIENT_PROGRAM = tgTherapeutics.data.program;
export const CLIENT_MANUFACTURER = tgTherapeutics.data.manufacturer;

if (typeof document !== "undefined") {
  applyBrandCssVars(CLIENT_PROGRAM.colors, ".portal-client", "client-brand-css-vars");
}
