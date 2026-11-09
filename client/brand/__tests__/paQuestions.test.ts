import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { listBrandSlugs, resolveBrand } from "@/brand/resolve";
import { paQuestionsFor } from "@/brand/paQuestions";

/**
 * The provider's PA form asks questions that fit the drug. They come from the brand, never from the form's source.
 */
const BRANDS = path.join(process.cwd(), "brands");
const indication = { name: "Chronic spontaneous urticaria", icd10: "L50.1", icd10Label: "Idiopathic urticaria", currentTreatment: "x", rationale: "y" };

describe("paQuestionsFor", () => {
  it("uses the brand's own list when it has one", () => {
    expect(paQuestionsFor({ paQuestions: ["Is it A?", "Is it B?"], indication })).toEqual(["Is it A?", "Is it B?"]);
  });

  it("builds the questions from the indication when the brand has no list", () => {
    const q = paQuestionsFor({ indication });
    expect(q).toHaveLength(3);
    expect(q.every((x) => x.includes("Chronic spontaneous urticaria") && x.endsWith("?"))).toBe(true);
  });

  it("treats an empty or blank list as no list", () => {
    expect(paQuestionsFor({ paQuestions: [], indication })).toEqual(paQuestionsFor({ indication }));
    expect(paQuestionsFor({ paQuestions: ["  ", ""], indication })).toEqual(paQuestionsFor({ indication }));
  });

  it("falls back to generic questions that name no condition", () => {
    const q = paQuestionsFor({});
    expect(q).toHaveLength(3);
    expect(q.join(" ")).not.toMatch(/weight|obesity|BMI|diagnosis of \w/i);
  });
});

describe("every brand", () => {
  for (const slug of listBrandSlugs(BRANDS)) {
    const brand = resolveBrand(BRANDS, slug) as { program: { paQuestions?: unknown; ndc?: unknown; indication?: { name: string } } };
    it(`${slug}: has valid PA fields and at least one question`, () => {
      const { paQuestions, ndc } = brand.program;
      expect(paQuestions === undefined || (Array.isArray(paQuestions) && paQuestions.every((q) => typeof q === "string" && q.trim().endsWith("?")))).toBe(true);
      expect(ndc === undefined || typeof ndc === "string").toBe(true);
      expect(paQuestionsFor(brand.program as any).length).toBeGreaterThan(0);
    });
  }

  it("a brand that is not about weight loss does not show weight-loss questions", () => {
    for (const slug of listBrandSlugs(BRANDS)) {
      const brand = resolveBrand(BRANDS, slug) as { program: any };
      const text = paQuestionsFor(brand.program).join(" ");
      if (/weight|BMI|obesity/i.test(text)) expect(brand.program.paQuestions, `${slug} shows weight-loss wording`).toBeDefined();
    }
  });
});

describe("the provider app", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "client/portals/provider/index.tsx"), "utf8");

  it("has no clinical question or NDC of its own", () => {
    expect(source).not.toMatch(/weight loss|weight-related|obesity|NDC: \d/i);
  });

  it("reads its questions and NDC from the brand", () => {
    expect(source).toContain("paQuestionsFor(BRAND.program)");
    expect(source).toContain("BRAND.program.ndc");
  });
});
