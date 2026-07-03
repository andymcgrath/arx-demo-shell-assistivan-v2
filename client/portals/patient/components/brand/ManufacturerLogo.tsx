import { MANUFACTURER } from "@/config/branding";

// CSS filter to recolour the CoAssist PNG to AssistRx teal #007178
// Only used while MANUFACTURER.logo.requiresFilter is true (no proper transparent asset yet)
const TEAL_FILTER =
  "brightness(0) saturate(100%) invert(23%) sepia(99%) saturate(1003%) hue-rotate(162deg) brightness(94%)";

interface ManufacturerLogoProps {
  /** "colors" → brand-colored logo, for white/light backgrounds (default)
   *  "white"  → all-white logo, for teal/dark backgrounds */
  variant?: "colors" | "white";
  className?: string;
}

export default function ManufacturerLogo({
  variant = "colors",
  className,
}: ManufacturerLogoProps) {
  if (variant === "white") {
    return (
      <img
        src={MANUFACTURER.logo.white}
        alt={MANUFACTURER.name}
        className={className}
      />
    );
  }

  return (
    <img
      src={MANUFACTURER.logo.colors}
      alt={MANUFACTURER.name}
      className={className}
      style={MANUFACTURER.logo.requiresFilter ? { filter: TEAL_FILTER } : undefined}
    />
  );
}
