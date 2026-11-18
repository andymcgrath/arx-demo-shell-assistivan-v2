import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatBrandJson, replaceDemos } from "../../../scripts/formatBrandJson";

const brandFiles = () => {
  const dir = path.resolve(__dirname, "../../../brands");
  return fs.readdirSync(dir).filter((s) => fs.existsSync(path.join(dir, s, "brand.json"))).map((s) => ({ slug: s, text: fs.readFileSync(path.join(dir, s, "brand.json"), "utf8") }));
};

describe("formatBrandJson", () => {
  it("keeps short arrays and small objects on one line, and breaks what does not fit in 80 columns", () => {
    expect(formatBrandJson({ a: ["25 mg"], b: [], c: { x: 1 } })).toBe('{\n  "a": ["25 mg"],\n  "b": [],\n  "c": { "x": 1 }\n}\n');
    const long = Array.from({ length: 12 }, (_, i) => `item number ${i}`);
    expect(formatBrandJson({ a: long })).toContain('"a": [\n    "item number 0",');
  });
});

describe("replaceDemos", () => {
  it("returns every committed brand file unchanged when its demos do not change", () => {
    for (const { slug, text } of brandFiles()) {
      const json = JSON.parse(text);
      expect(replaceDemos(text, json, json), slug).toBe(text);
    }
  });

  it("adds a demo and leaves every other line of the file as it was", () => {
    const { text } = brandFiles().find((f) => f.slug === "abivax")!;
    const json = JSON.parse(text);
    const added = { id: "new-demo", flow: "CoA_Copay", label: "New demo", choices: { bi: "pharmacy_covered" } };
    const out = replaceDemos(text, json, { ...json, demos: [...json.demos, added] })!;
    expect(JSON.parse(out).demos.at(-1)).toEqual(added);
    // Nothing else moved: every original line is still there, in order. The new entry only adds lines.
    const lines = out.split("\n");
    let at = 0;
    for (const l of text.split("\n")) {
      at = lines.indexOf(l, at);
      expect(at, l).toBeGreaterThanOrEqual(0);
      at++;
    }
  });

  it("refuses when something besides demos changed", () => {
    const { text } = brandFiles()[0];
    const json = JSON.parse(text);
    expect(replaceDemos(text, json, { ...json, name: "Other", demos: json.demos })).toBeUndefined();
  });
});
