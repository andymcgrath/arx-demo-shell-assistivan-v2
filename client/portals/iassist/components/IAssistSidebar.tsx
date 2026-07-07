/**
 * IAssistSidebar — structural port of CoaSidebar (wf3-coassist-v2,
 * client/portals/provider/index.tsx), reskinned with iAssist's teal instead
 * of CoA's Heroic blue. Same layout: a white logo bar over a solid-color
 * panel, nothing else — matching CoaDashboard's minimal sidebar rather than
 * the earlier "High five" / "To-Do List" mockup this portal had before.
 */
export const IASSIST_TEAL = "#007178";
export const IASSIST_TEAL_DARK = "#03656B";
export const IASSIST_TEAL_LIGHT = "#EEF9F9";

export default function IAssistSidebar() {
  return (
    <div className="hidden sm:flex w-[220px] flex-shrink-0 flex-col">
      <div className="h-14 flex items-center bg-white px-5">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F4c828a6b97e546bc967a796675ca457e%2F85024768bb364ddda8d2365469c3ce76?format=webp&width=800&height=1200"
          alt="iAssist Logo"
          className="h-7 w-auto"
        />
      </div>
      <div className="flex-1" style={{ backgroundColor: IASSIST_TEAL }} />
    </div>
  );
}
