/**
 * HCP enrollment: the `hcp` variant of the enrollment block. An HCP completes the enrollment form on the client's web
 * page. The page sends HCP_ENROLL_SUBMIT, and the platform texts the patient (`enrollmentInviteSent`). Nothing else
 * starts: no BI, PA, or order. The patient then runs the standard enrollment rules (VERIFY_SMS, VERIFY_OTP,
 * CONFIRM_CONSENT) in the patient experience, and the scenario ends on the enrollment confirmation.
 *
 * The HCP submit is a `system` trigger: the web page fires it, not an agent. The precondition is the same as for the
 * CRM referral: the case has not been enrolled yet.
 */
import type { CoaRule } from "./shared";

export const HCP_ENROLL_RULES: CoaRule[] = [
  {
    id: "hcp_enroll.submit",
    on: "HCP_ENROLL_SUBMIT",
    scope: { module: "enrollment", props: { variant: "hcp" } },
    when: (d) => d.enrollmentStatus === "none",
    set: (_d, e) => ({
      enrollmentStatus: "enrolled",
      enrollmentInviteSent: true,
      prescriberNpi: typeof e.prescriberNpi === "string" ? e.prescriberNpi : null,
    }),
    emit: { portal: "patient", step: 1 },
  },
];
