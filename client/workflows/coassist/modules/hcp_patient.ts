/**
 * HCP, then patient: the `hcp_patient` variant of the enrollment block. One story on the client's two web sites: the PrES
 * site (the HCP's, on the Provider tab) and the PES site (the patient's, on the Patient tab).
 *
 * The HCP completes the enrollment form on the PrES site. The submit (HCP_REFERRAL_SUBMIT) is the referral. It enrolls the case,
 * records the HCP's attestation (the patient's phone counts as verified, and the authorization as given, as in the legacy PrES),
 * and starts BI. The patient is not texted yet. The patient's own steps come later, on the PES site, after BI finds no coverage
 * and the agent sends the application update (`income_qualification`).
 *
 * The `audience` fork (forks.ts) picks who starts. `hcp` (PrES) is the story above. `patient` (PES) starts on the PES site: the
 * patient enters the prescription and consents, and PES_SUBMIT enrolls the case with the same data and starts BI the same way.
 * Everything after is shared: BI, the agent's application update, then the patient's PES pages.
 *
 * Each submit is a `system` step: the web page fires it, not an agent. The precondition keeps it from firing twice and keeps it
 * to the audience that owns the page.
 */
import { audienceOf } from "../forks";
import type { CoaRule } from "./shared";

const HCP_PATIENT = { module: "enrollment", props: { variant: "hcp_patient" } } as const;

/** True when the `audience` fork's pick (the demo pins it) is this exit. Without a pick the fork's first exit, `hcp`, applies. */
const audienceIs = (id: "hcp" | "patient") => (d: Parameters<typeof audienceOf>[0]) => audienceOf(d) === id;

const enrolled = (e: { prescriberNpi?: unknown }) => ({
  enrollmentStatus: "enrolled" as const,
  smsVerified: true,
  otpVerified: true,
  consentStatus: "confirmed" as const,
  prescriberNpi: typeof e.prescriberNpi === "string" ? e.prescriberNpi : null,
});

export const HCP_PATIENT_RULES: CoaRule[] = [
  {
    id: "hcp_patient.referral",
    on: "HCP_REFERRAL_SUBMIT",
    scope: HCP_PATIENT,
    when: (d) => d.enrollmentStatus === "none" && audienceIs("hcp")(d),
    set: (_d, e) => enrolled(e),
    emit: { portal: "provider", step: 1 },
    // BI starts now and waits for the agent to open the BI stage in the CRM.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
  {
    // PES: the patient enrolls themself on the PES site. Same data, same BI start, no HCP.
    id: "hcp_patient.patient_submit",
    on: "PES_SUBMIT",
    scope: HCP_PATIENT,
    when: (d) => d.enrollmentStatus === "none" && audienceIs("patient")(d),
    set: (_d, e) => enrolled(e),
    emit: { portal: "patient", step: 1 },
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
];
