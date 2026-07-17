/**
 * IAssistSidebar — structural port of CoaSidebar (wf3-coassist-v2,
 * client/portals/provider/index.tsx), reskinned with iAssist's teal instead
 * of CoA's Heroic blue. Same layout: a white logo bar over a solid-color
 * panel, nothing else — matching CoaDashboard's minimal sidebar rather than
 * the earlier "High five" / "To-Do List" mockup this portal had before.
 */
import iassistLogoAsset from "../assets/iassist-logo.png";

export const IASSIST_TEAL = "#007178";
export const IASSIST_TEAL_DARK = "#03656B";
export const IASSIST_TEAL_LIGHT = "#EEF9F9";

// Real color wordmark (teal "iAssist" + orange/teal dot), provided directly
// by the user and bundled locally — the prior CDN asset rendered white and
// was invisible against the white header background outside of Builder's
// preview (which apparently applies its own background behind CDN images).
const IASSIST_LOGO_URL = iassistLogoAsset;

/**
 * Shared iAssist wordmark — used in this sidebar, IAssistHeader (Dashboard),
 * and every case-creation wizard step's header, so the logo only lives in
 * one place. Confined to client/portals/iassist/, so this can't affect
 * WF1/WF2/WF3.
 */
export function IAssistLogo({ className = "h-7 w-auto" }: { className?: string }) {
  return <img src={IASSIST_LOGO_URL} alt="iAssist Logo" className={className} />;
}

export default function IAssistSidebar() {
  return (
    <div className="hidden sm:flex w-[220px] flex-shrink-0 flex-col">
      <div className="h-14 flex items-center bg-white px-5">
        <IAssistLogo />
      </div>
      <div className="flex-1" style={{ backgroundColor: IASSIST_TEAL }} />
    </div>
  );
}
