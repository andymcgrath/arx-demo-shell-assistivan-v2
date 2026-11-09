import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildTheme, contrastReport, contrastRatio, resolveSurfaces, themeToCssVars, type BrandColors } from "@/brand/theme";
import { listBrandSlugs, resolveBrand } from "@/brand/resolve";

/**
 * The patient footer: neutral white by default, or the brand color with the manufacturer's white logo.
 */
const colors: BrandColors = { brand: "#17324d", accent: "#da1c5c" };
const BRANDS = path.join(process.cwd(), "brands");

describe("the footer surface", () => {
  it("defaults to white, and the default theme changes nothing for a brand that does not set it", () => {
    expect(resolveSurfaces(undefined, true).footer).toBe("white");
    const vars = themeToCssVars(buildTheme(colors));
    expect(vars["--arx-footer"]).toBe("0 0% 100%");
    expect(vars["--arx-footer-heading"]).toBe("var(--arx-slate)");
    expect(vars["--arx-footer-text"]).toBe("var(--arx-body-copy)");
    expect(vars["--arx-footer-rule"]).toBe("var(--arx-borders)");
    expect(contrastReport(buildTheme(colors)).map((r) => r.id)).not.toContain("footer");
  });

  it("fills with the brand color and picks readable text when set to brand", () => {
    const theme = buildTheme({ ...colors, surfaces: { footer: "brand" } });
    expect(theme.footer).toBe("#17324d");
    expect(contrastRatio(theme.onFooter, theme.footer)).toBeGreaterThanOrEqual(4.5);
    const vars = themeToCssVars(theme);
    expect(vars["--arx-footer"]).not.toBe("0 0% 100%");
    expect(vars["--arx-footer-text"]).toBe(vars["--arx-footer-heading"]);
    expect(vars["--arx-footer-rule"]).not.toMatch(/^var\(/);
  });

  it("scores the footer text against the brand fill, and flags a pair that misses AA", () => {
    const ok = contrastReport(buildTheme({ ...colors, surfaces: { footer: "brand" } })).find((r) => r.id === "footer")!;
    expect(ok.levels.aaText).toBe(true);
    // A mid-tone brand has no text color that reaches 4.5, so the row is a warning, never a required failure.
    const mid = contrastReport(buildTheme({ brand: "#7a7a7a", fidelity: "exact", surfaces: { footer: "brand" } })).find((r) => r.id === "footer")!;
    expect(mid.required).toBe(false);
  });

  it("rejects an unknown footer option", () => {
    expect(() => resolveSurfaces({ footer: "gradient" } as any, true)).toThrow('Surface "footer" has no option "gradient"');
  });

  it("gives every brand with a brand footer a white logo, and uses tokens only in the footer", () => {
    for (const slug of listBrandSlugs(BRANDS)) {
      const b = resolveBrand(BRANDS, slug) as any;
      if (b.program.colors.surfaces?.footer === "brand") {
        expect(typeof b.manufacturer.logo.white, `${slug} needs manufacturer.logo.white`).toBe("string");
      }
    }
    const source = fs.readFileSync(path.join(process.cwd(), "client/portals/patient/components/Footer.tsx"), "utf8");
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|\brgb\(|text-(white|black|slate-|gray-)|bg-(white|black|slate-|gray-)/i);
  });
});
