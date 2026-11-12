/**
 * Audience enrollment: the `audience` variant of the enrollment block. The client's web page offers two audiences and the
 * `audience` fork (forks.ts) picks which one starts the case. The page sends AUDIENCE_SUBMIT either way, and the rule reads the
 * pick, so the difference lives here and not in the UI.
 *
 * - `hcp` (PrES): the HCP completed the enrollment form. The platform texts the patient (`enrollmentInviteSent`), and the
 *   standard enrollment rules take over (VERIFY_SMS, VERIFY_OTP, CONFIRM_CONSENT).
 * - `patient` (PES): the patient entered the prescription on a form that collects their consent, so they are verified and
 *   consented, as in the `web` variant. There is no text, code or consent step.
 *
 * BI starts off the submit in both. The submit is a `system` trigger: the web page fires it. The precondition is the same as
 * for the CRM referral: the case has not been enrolled yet.
 */
import { exitFor } from "@/engine/workflow/forks";
import { AUDIENCE_FORK } from "../forks";
import type { CoaRule } from "./shared";

const AUDIENCE = { module: "enrollment", props: { variant: "audience" } } as const;

export const AUDIENCE_ENROLL_RULES: CoaRule[] = [
  {
    id: "audience_enroll.submit",
    on: "AUDIENCE_SUBMIT",
    scope: AUDIENCE,
    when: (d) => d.enrollmentStatus === "none",
    set: (d, e) => {
      const prescriberNpi = typeof e.prescriberNpi === "string" ? e.prescriberNpi : null;
      return exitFor(AUDIENCE_FORK, d).id === "hcp"
        ? { enrollmentStatus: "enrolled", enrollmentInviteSent: true, prescriberNpi }
        : { enrollmentStatus: "enrolled", smsVerified: true, otpVerified: true, consentStatus: "confirmed", prescriberNpi };
    },
    emit: { portal: "patient", step: 1 },
    // BI runs off the submit alone. It does not wait for the patient.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
];
