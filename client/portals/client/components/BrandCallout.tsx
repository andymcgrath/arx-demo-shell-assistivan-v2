/**
 * BrandCallout — the significant TG Therapeutics call-out for the Client
 * tab: a branded strip pinned to the top of the case view.
 *
 * Was originally built with two other switchable variations (a sticky
 * footer, and a floating corner badge) behind a presenter-facing selector,
 * to compare options live. This banner was the one picked, so the other two
 * and the selector were removed rather than left dead/unreachable.
 *
 * Uses CLIENT_MANUFACTURER/CLIENT_PROGRAM from ./branding.ts (TG
 * Therapeutics, fixed — see that file) and the --arx-primary* variables
 * ./branding.ts already pushes into .portal-client, so this stays in sync
 * with that one source of truth automatically.
 */
import { CLIENT_MANUFACTURER, CLIENT_PROGRAM } from "../branding";

// tg-therapuetics.json's manufacturer.logo.white was blank — pointed at
// nothing — even though a real white/transparent asset had already been
// uploaded for it (public/uploads/1786447172989-TG_Therapeutics_Logo-
// revised_colors-white.png). Wired that path into the brand config itself
// rather than deriving white from the "colors" SVG with a CSS filter, to
// match how the patient portal's ManufacturerLogo/ProgramLogo use a real
// logo.white file when one exists.
function LogoMark({ size = 22 }: { size?: number }) {
  const logo = CLIENT_MANUFACTURER.logo.white;
  if (!logo) return null;
  return (
    <img
      src={logo}
      alt="TG Therapeutics"
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}

export default function BrandCallout() {
  return (
    <div
      className="sticky top-0 z-40 flex items-center gap-3 px-4"
      style={{
        height: 52,
        background: "linear-gradient(90deg, hsl(var(--arx-primary)) 0%, hsl(var(--arx-primary-dark)) 100%)",
      }}
    >
      <LogoMark />
      <div className="min-w-0">
        <div className="text-white text-[13px] font-bold leading-tight truncate">
          TG Therapeutics Client Portal
        </div>
        <div className="text-white/75 text-[10px] leading-tight truncate">
          {CLIENT_PROGRAM.name}
        </div>
      </div>
    </div>
  );
}
