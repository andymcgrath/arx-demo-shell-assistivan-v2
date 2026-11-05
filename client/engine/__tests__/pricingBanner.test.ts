import { describe, it, expect } from "vitest";
import { pricingBanner } from "@/portals/patient/components/pricing/pricingBanner";

const DRUG = "Drug";

describe("pricingBanner", () => {
  it("welcomes a patient who has not been told about coverage yet", () => {
    const b = pricingBanner({ copayEnrolled: false, paStatus: "none" }, DRUG);
    expect(b.kind).toBe("covered");
    expect(b.title).toContain(DRUG);
  });

  it("does not repeat the approval once a PA came back approved", () => {
    const b = pricingBanner({ copayEnrolled: false, paStatus: "approved" }, DRUG);
    expect(b.kind).toBe("approved");
    expect(b.title).not.toMatch(/good news|covers/i);
  });

  it("confirms copay enrollment, and that wins over the approval", () => {
    expect(pricingBanner({ copayEnrolled: true, paStatus: "approved" }, DRUG).kind).toBe("enrolled");
  });

  it("never says a prior authorization is required", () => {
    for (const copayEnrolled of [true, false]) {
      for (const paStatus of ["none", "submitted", "approved", "denied"] as const) {
        const b = pricingBanner({ copayEnrolled, paStatus }, DRUG);
        expect(`${b.title} ${b.detail}`).not.toMatch(/authorization/i);
      }
    }
  });
});
