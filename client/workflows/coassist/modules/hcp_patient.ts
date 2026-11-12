/**
 * HCP, then patient: the `hcp_patient` variant of the enrollment block. One story on the client's two web sites: the PrES
 * site (the HCP's, on the Provider tab) and the PES site (the patient's, on the Patient tab).
 *
 * The HCP completes the enrollment form on the PrES site. The submit (HCP_REFERRAL_SUBMIT) is the referral. It enrolls the case,
 * records the HCP's attestation (the patient's phone counts as verified, and the authorization as given, as in the legacy PrES),
 * and starts BI. The patient is not texted yet. The patient's own steps come later, on the PES site, after BI finds no coverage
 * and the agent sends the application update (`income_qualification`).
 *
 * The submit is a `system` step: the web page fires it, not an agent. Its precondition keeps it from firing twice.
 */
import type { CoaRule } from "./shared";

const HCP_PATIENT = { module: "enrollment", props: { variant: "hcp_patient" } } as const;

export const HCP_PATIENT_RULES: CoaRule[] = [
  {
    id: "hcp_patient.referral",
    on: "HCP_REFERRAL_SUBMIT",
    scope: HCP_PATIENT,
    when: (d) => d.enrollmentStatus === "none",
    set: (_d, e) => ({
      enrollmentStatus: "enrolled",
      smsVerified: true,
      otpVerified: true,
      consentStatus: "confirmed",
      prescriberNpi: typeof e.prescriberNpi === "string" ? e.prescriberNpi : null,
    }),
    emit: { portal: "provider", step: 1 },
    // BI starts now and waits for the agent to open the BI stage in the CRM.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
];
