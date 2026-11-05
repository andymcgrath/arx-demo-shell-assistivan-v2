/**
 * What the banner above the pricing cards says. It depends on what the patient has already been told, so the screen
 * never repeats it:
 * - enrolled: the patient joined the copay program and came back to pick a pharmacy channel.
 * - approved: a prior authorization came back approved. The patient saw it on the coverage summary or in the PA text.
 * - covered: no approval was shown (a coverage-only scenario). This is where the patient first hears about coverage.
 * Pure, so a test can check each row. Reads case data only, never a scenario name (CLAUDE.md rule 7).
 */
export type PricingBannerKind = "enrolled" | "approved" | "covered";

export interface PricingBannerCopy {
  kind: PricingBannerKind;
  title: string;
  detail: string;
}

export function pricingBanner(
  data: { copayEnrolled: boolean; paStatus: "none" | "submitted" | "approved" | "denied" },
  drugName: string,
): PricingBannerCopy {
  if (data.copayEnrolled) {
    return {
      kind: "enrolled",
      title: "You're enrolled in the copay program.",
      detail: "Your lower price is shown below. Pick Retail or Mail Order.",
    };
  }
  if (data.paStatus === "approved") {
    return { kind: "approved", title: "Here's what you may pay", detail: "Pick the option that works best for you." };
  }
  return {
    kind: "covered",
    title: `Good news! Your plan covers ${drugName}.`,
    detail: "Here's what you may pay. Pick the option that works best for you.",
  };
}
