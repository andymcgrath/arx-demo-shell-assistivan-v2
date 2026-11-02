import { describe, expect, it } from "vitest";
import { colorDistance, fidelityReport, isChromatic, journeyPalette, verdictFor } from "@/brand/fidelity";
import { buildTheme, type BrandColors } from "@/brand/theme";
import { listBrandSlugs, resolveBrand } from "@/brand/resolve";
import path from "node:path";

const TEAL = "#36b0c9";

describe("colorDistance", () => {
  it("is zero for the same color and grows with the difference", () => {
    expect(colorDistance(TEAL, TEAL)).toBe(0);
    expect(colorDistance(TEAL, "#278093")).toBeGreaterThan(colorDistance(TEAL, "#33aec7"));
    expect(colorDistance("#000000", "#ffffff")).toBeGreaterThan(90);
  });

  it("calls under 1 the same, under 3 close, and the rest different", () => {
    expect(verdictFor(0.5)).toBe("same");
    expect(verdictFor(2)).toBe("close");
    expect(verdictFor(8)).toBe("different");
  });
});

describe("fidelityReport", () => {
  it("shows an exact brand matching on every color it set", () => {
    const colors = { brand: TEAL, action: "#ef4162", onAction: "#ffffff", fidelity: "exact" as const };
    const rows = fidelityReport(colors, buildTheme(colors));
    for (const r of rows.filter((r) => r.id !== "buttons-vs-brand")) expect(r.verdict, r.label).toBe("same");
  });

  it("shows what the contrast adjustment moved on an accessible brand", () => {
    const colors = { brand: TEAL, action: "#ef4162" };
    const rows = fidelityReport(colors, buildTheme(colors));
    expect(rows.find((r) => r.id === "action")?.verdict).not.toBe("same");
  });

  it("flags buttons that differ from brand fills, the two-teals seam", () => {
    const seam = (colors: Parameters<typeof buildTheme>[0]) =>
      fidelityReport(colors, buildTheme(colors)).find((r) => r.id === "buttons-vs-brand")!;
    expect(seam({ brand: TEAL, action: "#278093", fidelity: "exact" }).verdict).toBe("different");
    expect(seam({ brand: TEAL }).verdict).toBe("same");
  });
});

describe("journeyPalette", () => {
  it("lists each color once with the roles that use it", () => {
    const palette = journeyPalette(buildTheme({ brand: "#007178" }));
    const hexes = palette.map((p) => p.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
    expect(palette.find((p) => p.hex === "#007178")?.roles).toContain("brand");
  });

  it("separates chromatic colors from neutrals", () => {
    expect(isChromatic(TEAL)).toBe(true);
    expect(isChromatic("#ffffff")).toBe(false);
    expect(isChromatic("#111111")).toBe(false);
  });
});

describe("every brand", () => {
  const dir = path.join(__dirname, "../../../brands");
  for (const slug of listBrandSlugs(dir)) {
    it(`${slug}: an exact brand with no separate button color shows one color on buttons and brand fills`, () => {
      const { colors } = (resolveBrand(dir, slug) as any).program as { colors: BrandColors };
      const theme = buildTheme(colors);
      const seam = fidelityReport(colors, theme).find((r) => r.id === "buttons-vs-brand")!;
      expect(Number.isFinite(seam.distance)).toBe(true);
      // An accessible brand may darken its buttons to reach AA. An exact brand never moves them.
      if (colors.fidelity === "exact" && !colors.action) expect(seam.verdict).toBe("same");
    });
  }
});
