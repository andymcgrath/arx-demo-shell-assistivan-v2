/**
 * Copay: the HCP enrolls the patient in the copay program in iAssist. The patient takes no action.
 */
import { nowIso, type IaRule } from "./shared";

export const COPAY_RULES: IaRule[] = [
  {
    // Needs verified benefits. Enrolling twice is a no-op.
    id: "copay.enroll",
    on: "ENROLL_COPAY",
    scope: { module: "copay" },
    when: (d) => d.medbvStatus === "complete" && !d.copayEnrolled,
    set: () => ({ copayEnrolled: true, copayEnrolledAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
];
