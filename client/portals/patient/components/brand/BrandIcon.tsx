import { CHATBOT_ICON } from "@/portals/patient/config/branding";

interface BrandIconProps {
  /** The brand token to paint with, for example "primary" or "on-tile". Becomes hsl(var(--arx-<token>)). */
  token: string;
  className?: string;
}

/**
 * The chatbot icon, painted in exactly one brand token.
 * The image is a mask, so its shape shows and its own pixels do not. A CSS color filter only approximates
 * a color, and drifts on saturated reds and oranges. This one does not.
 * The icon must be a transparent image (SVG or PNG with alpha). An opaque JPEG paints a solid square.
 */
export default function BrandIcon({ token, className = "w-4 h-4" }: BrandIconProps) {
  const mask = `url("${CHATBOT_ICON}")`;
  return (
    <span
      aria-hidden="true"
      className={`inline-block flex-shrink-0 ${className}`}
      style={{
        backgroundColor: `hsl(var(--arx-${token}))`,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}
