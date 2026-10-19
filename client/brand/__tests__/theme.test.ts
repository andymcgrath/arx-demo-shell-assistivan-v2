import { describe, it, expect } from "vitest";
import {
  AA_CONTRAST,
  contrastReport,
  ensureContrast,
  mixHex,
  rowPasses,
  wcagLevels,
  buildTheme,
  buttonColors,
  contrastRatio,
  deriveShades,
  hexToOklch,
  oklchToHex,
  readableOn,
  themeToCssVars,
} from "@/brand/theme";

describe("confirmation style and WCAG report", () => {
  const colors = { brand: "#15355e", accent: "#59b47d" };

  it("defaults to a flat brand fill", () => {
    const t = buildTheme(colors);
    expect(t.surfaces.confirmation).toBe("brand");
    expect(t.heroStops).toEqual(["#15355e", "#15355e"]);
  });

  it("fills with the accent, flat or as a gradient", () => {
    expect(buildTheme({ ...colors, surfaces: { confirmation: "accent" } }).heroStops).toEqual(["#59b47d", "#59b47d"]);
    const g = buildTheme({ ...colors, surfaces: { confirmation: "gradient" } });
    expect(g.heroStops).toEqual(["#15355e", "#59b47d"]);
    expect(g.hero).toBe("linear-gradient(135deg, #15355e, #59b47d)");
  });

  it("stays flat brand when there is no accent, whatever the style", () => {
    const t = buildTheme({ brand: "#007178", surfaces: { confirmation: "gradient" } });
    expect(t.heroStops).toEqual(["#007178", "#007178"]);
  });

  it("rejects an unknown style", () => {
    expect(() => buildTheme({ ...colors, surfaces: { confirmation: "rainbow" as never } })).toThrow();
  });

  it("picks the confirmation text color by contrast", () => {
    expect(buildTheme({ ...colors, surfaces: { confirmation: "accent" } }).onHero).toBe("#111111"); // near-black on mint
    expect(buildTheme({ brand: "#412636" }).onHero).toBe("#ffffff");
  });

  it("scores a gradient across the text area, not at the ends", () => {
    const grad = contrastReport(buildTheme({ ...colors, surfaces: { confirmation: "gradient" } })).find((r) => r.id === "hero-body")!;
    // White text, worst point of the text area: 75% of the way to the mint end.
    expect(grad.ratio).toBeCloseTo(contrastRatio("#ffffff", mixHex("#15355e", "#59b47d", 0.75)), 2);
    // The mint end alone would score lower (2.55), so the ends are not the score.
    expect(grad.ratio).toBeGreaterThan(contrastRatio("#ffffff", "#59b47d"));
  });

  it("maps a ratio to the four WCAG levels", () => {
    expect(wcagLevels(2.9)).toEqual({ aaText: false, aaLarge: false, aaaText: false, aaaLarge: false });
    expect(wcagLevels(3)).toEqual({ aaText: false, aaLarge: true, aaaText: false, aaaLarge: false });
    expect(wcagLevels(4.5)).toEqual({ aaText: true, aaLarge: true, aaaText: false, aaaLarge: true });
    expect(wcagLevels(7)).toEqual({ aaText: true, aaLarge: true, aaaText: true, aaaLarge: true });
  });

  it("marks button text and the confirmation heading as required, and holds text rows to 4.5", () => {
    const rows = contrastReport(buildTheme({ ...colors, surfaces: { confirmation: "gradient" } }));
    expect(rows.filter((r) => r.required).map((r) => r.id).sort()).toEqual(["button", "hero-heading"]);
    const body = rows.find((r) => r.id === "hero-body")!;
    expect(rowPasses(body)).toBe(body.ratio >= 4.5);
    expect(rowPasses(rows.find((r) => r.id === "hero-heading")!)).toBe(true); // large text needs 3.0
  });

  it("has no row for the decorative header strip", () => {
    expect(contrastReport(buildTheme(colors)).some((r) => r.id === "strip")).toBe(false);
  });

  it("takes defaults that leave a brand with no accent looking as before", () => {
    const t = buildTheme({ brand: "#007178" });
    expect(t.surfaces).toEqual({ confirmation: "brand", strip: "none", tiles: "tint", stepRow: "brand", marker: "white", headings: "brand" });
    // The tile is the tint, which the theme lightens when brand text on it would miss AA 4.5.
    expect(t.tileBg).toBe(t.tint);
    expect(contrastRatio(t.brand, t.tileBg)).toBeGreaterThanOrEqual(AA_CONTRAST);
    expect(t.tileFg).toBe("#007178");
    expect(t.strip).toBe("#ffffff");
    expect(t.link).toBe("#007178");
  });

  it("defaults the marker to the accent when there is one", () => {
    expect(buildTheme(colors).marker).toBe("#59b47d");
  });

  it("resolves each surface choice", () => {
    const t = buildTheme({ ...colors, surfaces: { strip: "accent", tiles: "accent", stepRow: "accent", headings: "dark" } });
    expect(t.strip).toBe("#59b47d");
    expect(t.tileBg).toBe("#59b47d");
    expect(t.tileFg).toBe("#111111"); // near-black on mint
    expect(t.stepRow).toBe("#59b47d");
    expect(t.onStepRow).toBe("#111111");
    expect(t.link).toBe(t.dark);
  });

  it("never lets the step marker match its row", () => {
    const t = buildTheme({ ...colors, surfaces: { stepRow: "accent", marker: "accent" } });
    expect(t.marker).toBe("#ffffff");
    const u = buildTheme({ brand: "#007178", surfaces: { marker: "brand" } });
    expect(u.marker).toBe("#ffffff");
  });

  it("rejects an unknown surface or option", () => {
    expect(() => buildTheme({ ...colors, surfaces: { sparkle: "on" } as never })).toThrow(/Unknown surface/);
    expect(() => buildTheme({ ...colors, surfaces: { tiles: "round" as never } })).toThrow(/no option/);
  });

  it("exports the hero variables", () => {
    const vars = themeToCssVars(buildTheme({ ...colors, surfaces: { confirmation: "gradient" } }));
    expect(vars["--arx-hero"]).toBe("linear-gradient(135deg, #15355e, #59b47d)");
    expect(vars["--arx-on-hero"]).toMatch(/^\d+ \d+% \d+%$/);
  });
});

describe("ensureContrast", () => {
  it("leaves a passing pair alone", () => {
    expect(ensureContrast("#15355e", "#d4dfef", 4.5, "lighter")).toEqual({ color: "#d4dfef", adjusted: false, met: true });
  });

  it("lightens until the pair reaches the target", () => {
    const r = ensureContrast("#137d00", "#cde8c8", 4.5, "lighter");
    expect(r.met).toBe(true);
    expect(r.adjusted).toBe(true);
    expect(contrastRatio("#137d00", r.color)).toBeGreaterThanOrEqual(4.5);
  });

  it("leaves the color alone when the cap is not enough", () => {
    // A light yellow brand on white is 1.7:1. No tint can fix that.
    expect(ensureContrast("#f7be69", "#fdf3e1", 4.5, "lighter")).toEqual({ color: "#fdf3e1", adjusted: false, met: false });
  });
});

describe("derived colors reach AA when a fix exists", () => {
  const brands = ["#007178", "#137d00", "#15355e", "#1b3764", "#009ca6", "#337ab7", "#1aae42", "#24325c", "#7a1f5c"];

  it("brand text on the tint reaches 4.5 whenever a fix exists", () => {
    // The tint can lighten to near-white and no further (the cap in ensureContrast). A brand that only just passes
    // on white (like #337ab7 at 4.56) cannot pass on any tint, so it stays a warning. 5.0 on white leaves room.
    for (const brand of brands) {
      const t = buildTheme({ brand });
      if (contrastRatio(brand, "#ffffff") >= 5.0) {
        expect(contrastRatio(t.brand, t.tint), brand).toBeGreaterThanOrEqual(AA_CONTRAST);
        expect(contrastReport(t).find((r) => r.id === "tile-text")!.levels.aaText, brand).toBe(true);
      }
    }
  });

  it("reports what it moved", () => {
    const dexcom = buildTheme({ brand: "#137d00" });
    expect(dexcom.adjustments.map((a) => a.id)).toContain("tint");
    expect(dexcom.tint).not.toBe(dexcom.wash);
    const navy = buildTheme({ brand: "#15355e" });
    expect(navy.adjustments).toEqual([]);
    expect(navy.tint).toBe(navy.wash);
  });

  it("shows the brand as set when automatic adjustment is off", () => {
    const off = buildTheme({ brand: "#137d00" }, { autoAdjust: false });
    const on = buildTheme({ brand: "#137d00" });
    expect(off.tint).toBe(off.wash);
    expect(on.tint).not.toBe(on.wash);
    expect(off.adjustments.find((a) => a.id === "tint")).toMatchObject({ applied: false });
    expect(on.adjustments.find((a) => a.id === "tint")).toMatchObject({ applied: true });
    // The same adjustment is listed either way, so the Lab can say what it would do.
    expect(off.adjustments.map((a) => a.id)).toEqual(on.adjustments.map((a) => a.id));
  });

  it("keeps the requested button fill when adjustment is off", () => {
    const off = buildTheme({ brand: "#007178", action: "#ef4162" }, { autoAdjust: false });
    expect(off.action).toBe("#ef4162");
    expect(off.onAction).toBe("#ffffff");
  });

  it("darkens the completed-step circle until the white check reaches 3:1", () => {
    for (const brand of ["#007178", "#137d00", "#15355e", "#1b3764", "#24325c", "#7a1f5c"]) {
      const t = buildTheme({ brand });
      expect(contrastRatio("#ffffff", t.stepDone), brand).toBeGreaterThanOrEqual(3);
    }
    const off = buildTheme({ brand: "#137d00" }, { autoAdjust: false });
    expect(off.stepDone).toBe(off.light);
  });

  it("reports a darkened button fill", () => {
    const t = buildTheme({ brand: "#007178", action: "#ef4162" });
    expect(t.adjustments.some((a) => a.id === "button")).toBe(t.action !== "#ef4162");
  });

  it("never moves the brand, accent, or action the client set when they already pass", () => {
    const t = buildTheme({ brand: "#15355e", accent: "#59b47d", action: "#15355e" });
    expect([t.brand, t.accent, t.action]).toEqual(["#15355e", "#59b47d", "#15355e"]);
  });
});

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
