import { describe, it, expect } from "vitest";
import {
  AA_CONTRAST,
  buildTheme,
  buttonColors,
  contrastRatio,
  deriveShades,
  hexToOklch,
  oklchToHex,
  readableOn,
  themeToCssVars,
} from "@/brand/theme";

describe("brand theme", () => {
  it("round-trips a hex color through OKLCH", () => {
    for (const hex of ["#007178", "#137d00", "#f7be69", "#24325c", "#ffffff", "#000000"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("derives dark, light, and wash in lightness order", () => {
    for (const hex of ["#007178", "#009ca6", "#337ab7", "#1aae42"]) {
      const brand = hexToOklch(hex).l;
      const s = deriveShades(hex);
      expect(hexToOklch(s.dark).l).toBeLessThan(brand);
      expect(hexToOklch(s.light).l).toBeGreaterThan(brand);
      expect(hexToOklch(s.wash).l).toBeGreaterThan(hexToOklch(s.light).l);
    }
  });

  it("measures contrast like WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("picks readable button text on light and dark fills", () => {
    expect(readableOn("#ffffff")).toBe("#111111");
    expect(readableOn("#08312a")).toBe("#ffffff");
    expect(contrastRatio(readableOn("#1aae42"), "#1aae42")).toBeGreaterThanOrEqual(AA_CONTRAST);
  });

  it("uses brand for the button when the file sets only brand", () => {
    const t = buildTheme({ brand: "#007178" });
    expect(t.action).toBe("#007178");
    expect(t.onAction).toBe("#ffffff");
    expect(t.accent).toBeUndefined();
  });

  it("keeps a separate button color and reads text from it", () => {
    const t = buildTheme({ brand: "#1b3764", accent: "#5db37e", action: "#ffd23f" });
    expect(t.brand).toBe("#1b3764");
    expect(t.action).toBe("#ffd23f");
    expect(t.onAction).toBe("#111111");
    expect(t.gradient).toBe("linear-gradient(135deg, #1b3764, #5db37e)");
  });

  it("keeps white text and darkens a fill that misses AA by a little", () => {
    const b = buttonColors("#ef4162");
    expect(b.onAction).toBe("#ffffff");
    expect(b.action).not.toBe("#ef4162");
    expect(contrastRatio(b.onAction, b.action)).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(hexToOklch(b.action).l).toBeGreaterThan(hexToOklch("#ef4162").l - 0.12 - 0.001);
  });

  it("leaves a passing fill alone", () => {
    expect(buttonColors("#007178")).toEqual({ action: "#007178", onAction: "#ffffff" });
  });

  it("switches to dark text when white would need a big darkening", () => {
    expect(buttonColors("#ffd23f")).toEqual({ action: "#ffd23f", onAction: "#111111" });
  });

  it("derives the button hover shade from the button color, not the brand", () => {
    const t = buildTheme({ brand: "#15355e", action: "#ef4162" });
    expect(hexToOklch(t.actionHover).h).toBeCloseTo(hexToOklch(t.action).h, 0);
    expect(hexToOklch(t.actionHover).l).toBeLessThan(hexToOklch(t.action).l);
    // Hex rounding moves the hue of a very dark color by about a degree. Brand and coral are 100+ degrees apart.
    expect(Math.abs(hexToOklch(t.dark).h - hexToOklch(t.brand).h)).toBeLessThan(3);
  });

  it("sends the brand to --arx-primary and the button color to --arx-action", () => {
    const vars = themeToCssVars(buildTheme({ brand: "#15355e", action: "#ef4162" }));
    expect(vars["--arx-primary"]).toBe(vars["--arx-brand"]);
    expect(vars["--arx-action"]).not.toBe(vars["--arx-primary"]);
    for (const name of ["--arx-action-hover", "--arx-on-action"]) expect(vars[name]).toMatch(/^\d+ \d+% \d+%$/);
  });

  it("falls back to the light shade for the gradient when there is no accent", () => {
    const t = buildTheme({ brand: "#007178" });
    expect(t.gradient).toBe(`linear-gradient(135deg, #007178, ${t.light})`);
  });

  it("rejects a value that is not hex", () => {
    expect(() => buildTheme({ brand: "teal" })).toThrow();
    expect(() => buildTheme({ brand: "#007178", accent: "green" })).toThrow();
  });

  it("keeps the existing --arx-primary variable names", () => {
    const vars = themeToCssVars(buildTheme({ brand: "#007178" }));
    for (const name of ["--arx-primary", "--arx-primary-dark", "--arx-primary-80", "--arx-primary-30"]) {
      expect(vars[name]).toMatch(/^\d+ \d+% \d+%$/);
    }
    expect(vars["--arx-primary"]).toBe("184 100% 24%");
  });
});
