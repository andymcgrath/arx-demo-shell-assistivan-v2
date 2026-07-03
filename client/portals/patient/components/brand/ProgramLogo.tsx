import { PROGRAM } from "@/config/branding";
import { hexToColorFilter } from "@/lib/brandFilter";

interface ProgramLogoProps {
  /** "colors" → brand-colored logo, for white/light backgrounds (default)
   *  "white"  → all-white logo, for teal/dark backgrounds */
  variant?: "colors" | "white";
  className?: string;
}

export default function ProgramLogo({
  variant = "colors",
  className,
}: ProgramLogoProps) {
  const needsFilter = variant === "colors" && (PROGRAM.logo as { requiresFilter?: boolean }).requiresFilter;

  return (
    <img
      src={PROGRAM.logo[variant]}
      alt={PROGRAM.name}
      className={className}
      style={needsFilter ? { filter: hexToColorFilter(PROGRAM.colors.primary) } : undefined}
    />
  );
}
