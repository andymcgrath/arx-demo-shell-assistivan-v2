/**
 * Client Portal — Shell wrapper
 *
 * The Client tab is the CRM (see client/portals/crm/index.tsx) under one brand's colors. The ".portal-client" wrapper
 * class scopes this portal's --arx-primary* CSS variables the same way ".portal-patient" does for the Patient Portal
 * (see client/global.css). "./branding" is a side-effect-only import that injects TG Therapeutics' colors into those
 * variables at module load, and sets the --crm-* variables the CRM pages read. See that file's header comment for why
 * this portal is always TG Therapeutics, rather than following the demo's live "active brand."
 */
import "./branding";
import { CrmRoutes } from "@/portals/crm";
import BrandCallout from "./components/BrandCallout";

export default function ClientPortal() {
  return (
    <div className="portal-client h-full">
      {/* Sibling of the routed content (not a child of it), and first in the DOM, so its sticky-top positioning
       * resolves against the same scroll container DemoShell's Panel gives this whole portal and it sticks above
       * the case content beneath it. */}
      <BrandCallout />
      <CrmRoutes />
    </div>
  );
}
