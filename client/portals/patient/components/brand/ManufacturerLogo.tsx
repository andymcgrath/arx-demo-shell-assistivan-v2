import { MANUFACTURER } from "@/portals/patient/config/branding";
import { MANUFACTURER_LOGO_SIZES, type ManufacturerLogoSize } from "./logoSizes";

// CSS filter to recolour the CoAssist PNG to AssistRx teal #007178
// Only used while MANUFACTURER.logo.requiresFilter is true (no proper transparent asset yet)
const TEAL_FILTER =
  "brightness(0) saturate(100%) invert(23%) sepia(99%) saturate(1003%) hue-rotate(162deg) brightness(94%)";

interface ManufacturerLogoProps {
  /** "colors" → brand-colored logo, for white/light backgrounds (default)
   *  "white"  → all-white logo, for teal/dark backgrounds */
  variant?: "colors" | "white";
  /** Standard box. See logoSizes.ts. Default "header". */
  size?: ManufacturerLogoSize;
  /** Extras such as `flex-shrink-0`. Do not set width or height here. */
  className?: string;
}

export default function ManufacturerLogo({
  variant = "colors",
  size = "header",
  className,
}: ManufacturerLogoProps) {
  const classes = `${MANUFACTURER_LOGO_SIZES[size]} ${className ?? ""}`.trim();

  if (variant === "white") {
    return <img src={MANUFACTURER.logo.white} alt={MANUFACTURER.name} className={classes} />;
  }

  return (
    <img
      src={MANUFACTURER.logo.colors}
      alt={MANUFACTURER.name}
      className={classes}
      style={MANUFACTURER.logo.requiresFilter ? { filter: TEAL_FILTER } : undefined}
    />
  );
}
