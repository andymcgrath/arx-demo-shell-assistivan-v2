/**
 * The PES site: the patient's pages in the HCP-then-patient story (the `hcp_patient` enrollment variant). They are the same
 * pages the default PrES PAP uses, so they read the brand's tokens and carry the brand's logo. Before the application update
 * goes out the patient sees the site's home. The text opens the site, the patient consents, gives household size and income, and
 * agrees to the program terms. The address and date are the PAP screens that follow.
 *
 * Every rule sits in the `gate` slot and comes first in the map, so it wins over the phone-app enrollment and PAP screens. It stops
 * matching once the income is verified, and the PAP address and date rules take over.
 */
import type { Screen } from "@/engine/workflow/screens";
import type { CoaRoute } from "../slots";

const HCP_PATIENT = { module: "enrollment", props: { variant: "hcp_patient" } } as const;

export const HCP_PATIENT_SCREENS: Screen[] = [
  { path: "/pes-home", label: "Home", group: "", scope: HCP_PATIENT },
  { path: "/pes-pap-update-sms", label: "Application Update SMS", group: "Enrollment", scope: HCP_PATIENT, sticky: true },
  { path: "/pes-income-consent", label: "Income Consent", group: "Income verification", scope: HCP_PATIENT, sticky: true },
  { path: "/pes-income-submission", label: "Income Submission", group: "Income verification", scope: HCP_PATIENT, sticky: true },
  { path: "/pes-pap-terms", label: "PAP Terms", group: "Income verification", scope: HCP_PATIENT, sticky: true },
  { path: "/pes-confirmation", label: "Confirmation", group: "{program} order", scope: HCP_PATIENT, sticky: true },
];

export const HCP_PATIENT_ROUTES: CoaRoute[] = [
  // Home, with a note while the referral waits on BI and the agent's text.
  { id: "hcp_patient.home_waiting", slot: "gate", path: "/pes-home", scope: HCP_PATIENT, when: (d) => !d.papSmsSent },
  { id: "hcp_patient.update_sms", slot: "gate", path: "/pes-pap-update-sms", scope: HCP_PATIENT, when: (d) => d.papSmsSent && !d.papSmsVerified },
  // The tap opened the site. Home offers "I am a patient", which opens the consent. The consent opens the income form.
  { id: "hcp_patient.home_after_text", slot: "gate", path: "/pes-home", scope: HCP_PATIENT, when: (d) => d.incomeStatus === "none" },
  { id: "hcp_patient.income", slot: "gate", path: "/pes-income-submission", scope: HCP_PATIENT, when: (d) => d.incomeStatus === "pending" },
  // Income verified: the PAP address and date rules match next. After the date the patient's part ends here.
  { id: "hcp_patient.confirmation", slot: "tracking", path: "/pes-confirmation", scope: HCP_PATIENT, when: (d) => d.patientShipDate !== null && d.pharmacyStatus === "none" },
];
