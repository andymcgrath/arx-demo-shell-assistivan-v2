/**
 * Converts a hex color to a CSS filter string that colorizes a black/dark
 * image to match the target color. Uses the sepia+hue-rotate technique.
 */
export function hexToColorFilter(hex: string): string {
  if (!hex || hex.length < 7) return "";

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = (((g - b) / d) % 6 + 6) % 6 * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  const lPct = l * 100;
  const sPct = s * 100;

  const invertPct = Math.round(lPct * 0.9);
  const saturatePct = Math.round(sPct * 10);
  // sepia base hue is ~36deg; add small correction for systematic offset
  const hueRotate = Math.round(h - 36 + 15);
  const brightnessPct = Math.round(lPct * 4.2);

  return `brightness(0) saturate(100%) invert(${invertPct}%) sepia(100%) saturate(${saturatePct}%) hue-rotate(${hueRotate}deg) brightness(${brightnessPct}%)`;
}
