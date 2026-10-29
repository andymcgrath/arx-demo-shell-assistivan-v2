import { describe, it, expect } from "vitest";
import { copayMemberId } from "../data/copayProgram";
import { SITES_OF_CARE, siteByName } from "../data/sitesOfCare";
import { medbvHeadline, medbvSummary } from "../data/medbvResult";
import { BRAND } from "@/brand";

describe("Buy and Bill demo data", () => {
  it("makes one member ID per patient, the same every time", () => {
    const a = copayMemberId("Keanu Dixon", "Program");
    expect(a).toBe(copayMemberId("Keanu Dixon", "Program"));
    expect(a).not.toBe(copayMemberId("Sam Lee", "Program"));
    expect(a).toMatch(/^PRO \d{3} \d{3} \d{3}$/);
  });

  it("gives every site of care its own NPI and TIN", () => {
    expect(new Set(SITES_OF_CARE.map((s) => s.hopdNpi)).size).toBe(SITES_OF_CARE.length);
    expect(new Set(SITES_OF_CARE.map((s) => s.tin)).size).toBe(SITES_OF_CARE.length);
    expect(siteByName(SITES_OF_CARE[1].name)).toBe(SITES_OF_CARE[1]);
  });

  it("names the brand's drug in the eMedBV headline and not the billing model", () => {
    const headline = medbvHeadline(true);
    expect(headline).toContain(BRAND.program.drugDisplayName);
    expect(headline.toLowerCase()).not.toContain("buy and bill");
    expect(medbvSummary(false)).toContain(BRAND.program.drugDisplayName);
  });

  it("summarizes the eMedBV result in one line", () => {
    const line = medbvSummary();
    expect(line).not.toContain("\n");
    expect(line).toContain("J3590");
    expect(line).toContain("PA required");
  });

  it("keeps the indication's wording free of the drug name, with a placeholder for it", () => {
    const i = BRAND.program.indication;
    if (!i) return;
    expect(i.rationale).toContain("{drug}");
    expect(i.icd10).toMatch(/^[A-Z]\d{2}(\.\d+)?$/);
  });
});
