import { describe, expect, it } from "vitest";
import { colorsIn, distance, isNeutral, propose, rules, stylesheetUrls } from "../../../scripts/lib/brandScan.mjs";

const PAGE = `<html><head>
<meta name="theme-color" content="#36B0C9">
<link rel="stylesheet" href="/css/site.css"><link rel="stylesheet" href="https://cdn.example.com/x.css">
<style>:root{--brand-primary:#36b0c9;--gray-900:#111}</style></head><body></body></html>`;

const CSS = `
.btn-primary{background-color:#278093;color:#fff}
.btn-primary:hover{background-color:rgb(30,100,120)}
a{color:#36b0c9}
header{background:#ffffff}
.footer{color:#333}
@media (min-width:600px){.cta{background:#278093}}
`;

describe("colorsIn", () => {
  it("reads hex, rgb, and hsl, and expands three-digit hex", () => {
    expect(colorsIn("#FFF rgb(54, 176, 201) hsl(190, 58%, 50%)")).toEqual(["#ffffff", "#36b0c9", "#36b1c9"]);
  });
});

describe("neutrals", () => {
  it("treats white, black, and grays as no brand", () => {
    for (const hex of ["#ffffff", "#111111", "#888888"]) expect(isNeutral(hex)).toBe(true);
    expect(isNeutral("#36b0c9")).toBe(false);
  });
});

describe("rules", () => {
  it("flattens a media query", () => {
    expect(rules(CSS).map(([s]) => s)).toContain(".cta");
  });
});

describe("propose", () => {
  const result = propose({ html: PAGE, css: [CSS], url: "https://client.example/" });

  it("picks the theme color as the brand and a different button fill as the action", () => {
    expect(result.colors?.brand).toBe("#36b0c9");
    expect(result.colors?.action).toBe("#278093");
  });

  it("proposes an exact brand that records where the colors came from", () => {
    expect(result.colors?.fidelity).toBe("exact");
    expect(result.colors?.source).toBe("https://client.example/");
  });

  it("explains each pick", () => {
    expect(result.ranked[0].evidence.join(" ")).toMatch(/theme-color/);
  });

  it("leaves action out when the buttons use the brand color", () => {
    const same = propose({ html: PAGE, css: [".btn{background:#36b0c9}"], url: "https://client.example/" });
    expect(same.colors?.action).toBeUndefined();
  });

  it("returns nothing for a page with no color", () => {
    expect(propose({ html: "<html></html>", css: [], url: "https://client.example/" }).colors).toBeNull();
  });

  it("merges near-identical colors", () => {
    expect(distance("#36b0c9", "#37b0ca")).toBeLessThan(2);
    const merged = propose({ html: "", css: [".btn{background:#36b0c9}.btn2{background:#37b0ca}"], url: "x" });
    expect(merged.ranked.length).toBe(1);
  });
});

describe("stylesheetUrls", () => {
  it("resolves links against the page", () => {
    expect(stylesheetUrls(PAGE, "https://client.example/a/")).toEqual(["https://client.example/css/site.css", "https://cdn.example.com/x.css"]);
  });
});

describe("noise a real site carries", () => {
  const url = "https://client.example/";

  it("ignores hover, focus, and status variants and stock framework colors", () => {
    const css = `
      .btn-success{background:#36b0c9}
      .btn-success:hover{background:#0b829a}
      .btn-danger{background:#c12e2a}
      .btn-primary{background:#337ab7}
      a{color:#337ab7}
    `;
    const { colors, ranked } = propose({ html: "", css: [css], url });
    expect(colors?.brand).toBe("#36b0c9");
    expect(colors?.action).toBeUndefined();
    expect(ranked.map((r) => r.hex)).not.toContain("#c12e2a");
    expect(ranked.map((r) => r.hex)).not.toContain("#337ab7");
    expect(ranked.map((r) => r.hex)).not.toContain("#0b829a");
  });
});

describe("accent", () => {
  const url = "https://client.example/";

  it("needs a role that names a brand color, not only button text or frequency", () => {
    const css = `.icon .btnRefresh{color:#465b92}.x .btnRefresh{color:#465b92}.y .btnRefresh{color:#465b92}.btn-success{background:#36b0c9}a{color:#36b0c9}`;
    expect(propose({ html: "", css: [css], url }).colors?.accent).toBeUndefined();
  });

  it("takes a second brand color from a variable", () => {
    const css = `:root{--brand-primary:#36b0c9;--brand-secondary:#f26522}`;
    expect(propose({ html: "", css: [css], url }).colors?.accent).toBe("#f26522");
  });
});
