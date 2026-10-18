import { PROGRAM } from "@/portals/patient/config/branding";
import { PROGRAM_LOGO_SIZES, PROGRAM_LOGO_TEXT_SIZES, type ProgramLogoSize } from "./logoSizes";

interface ProgramLogoProps {
  /** "colors" → brand-colored logo, for white/light backgrounds (default)
   *  "white"  → all-white logo, for dark backgrounds */
  variant?: "colors" | "white";
  /** Standard box. See logoSizes.ts. Default "card". */
  size?: ProgramLogoSize;
  /** Extras such as `flex-shrink-0`. Do not set width or height here. */
  className?: string;
}

/**
 * The drug logo, scaled into a standard box with its aspect ratio locked. A brand with no drug
 * logo file leaves `assets.logoColor` and `assets.logoWhite` unset, and the program name shows
 * as text instead: brand color on light, white on dark.
 */
export default function ProgramLogo({
  variant = "colors",
  size = "card",
  className,
}: ProgramLogoProps) {
  const src = variant === "white" ? PROGRAM.assets.logoWhite : PROGRAM.assets.logoColor;
  const box = PROGRAM_LOGO_SIZES[size];

  if (!src) {
    return (
      <span
        className={`${PROGRAM_LOGO_TEXT_SIZES[size]} ${className ?? ""} inline-block whitespace-nowrap font-bold tracking-tight leading-none`}
        style={{ color: variant === "white" ? "#ffffff" : "hsl(var(--arx-brand))" }}
      >
        {PROGRAM.name}
      </span>
    );
  }

  return <img src={src} alt={PROGRAM.name} className={`${box} ${className ?? ""}`.trim()} />;
}
