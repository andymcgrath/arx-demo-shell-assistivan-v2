/**
 * Copay claim: after the PA is approved, the HCP files a claim for the administered dose. A new claim is in review.
 */
import type { CopayClaim } from "@/engine/types";
import { nowIso, type IaRule } from "./shared";

export const COPAY_CLAIM_RULES: IaRule[] = [
  {
    id: "copay_claim.submit",
    on: "SUBMIT_COPAY_CLAIM",
    scope: { module: "copay_claim" },
    when: (d) => d.copayEnrolled && d.paStatus === "approved",
    set: (d, e) => {
      const claims = d.copayClaims ?? [];
      const claim: CopayClaim = {
        id: `CLM-${1001 + claims.length}`,
        dateOfService: typeof e.dateOfService === "string" ? e.dateOfService : "",
        status: "in_review",
        submittedAt: nowIso(),
      };
      return { copayClaims: [...claims, claim] };
    },
    emit: { portal: "provider", step: 8 },
  },
];
