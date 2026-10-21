/**
 * Benefit verification (eMedBV): the HCP verifies the medical benefit in iAssist before submitting. Buy and Bill only.
 */
import type { IaRule } from "./shared";

export const BENEFIT_VERIFICATION_RULES: IaRule[] = [
  {
    // Runs once, before the submission. The UI shows the modal after the HCP enters insurance.
    id: "benefit_verification.run_medbv",
    on: "RUN_MEDBV",
    scope: { module: "benefit_verification" },
    when: (d) => d.medbvStatus !== "complete" && d.enrollmentStatus === "none",
    set: () => ({ medbvStatus: "complete" }),
    emit: { portal: "provider", step: 8 },
  },
];
