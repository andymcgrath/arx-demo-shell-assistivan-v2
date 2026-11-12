/**
 * HCP, then patient: the `hcp_patient` variant of the enrollment block. One story on the client's web page, in two parts.
 *
 * 1. The HCP completes the enrollment form on the HCP site. The submit (HCP_REFERRAL_SUBMIT) is the referral: the platform texts
 *    the patient (`enrollmentInviteSent`). The standard enrollment rules then take over (VERIFY_SMS, VERIFY_OTP, CONFIRM_CONSENT).
 * 2. Once the patient consents, the web page turns to the patient: authorization, details, and the prescription with the
 *    prescriber's NPI. That submit (PATIENT_RX_SUBMIT) starts BI.
 *
 * Both submits are `system` triggers: the web page fires them, not an agent. Each has a precondition, so neither can fire out of
 * order: the referral needs a case that is not enrolled yet, the patient's submit needs their consent and no BI yet.
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
      enrollmentInviteSent: true,
      prescriberNpi: typeof e.prescriberNpi === "string" ? e.prescriberNpi : null,
    }),
    emit: { portal: "patient", step: 1 },
  },
  {
    id: "hcp_patient.patient_submit",
    on: "PATIENT_RX_SUBMIT",
    scope: HCP_PATIENT,
    when: (d) => d.consentStatus === "confirmed" && d.biStatus === "none",
    set: (d, e) => ({ prescriberNpi: typeof e.prescriberNpi === "string" ? e.prescriberNpi : d.prescriberNpi }),
    emit: { portal: "patient", step: 5 },
    // BI starts now and waits for the agent to open the BI stage in the CRM.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
];
