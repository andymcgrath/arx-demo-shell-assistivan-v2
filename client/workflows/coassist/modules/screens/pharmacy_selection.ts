/** Pharmacy selection. `store` is the patient's retail pick (Copay). `network` is Coverage's one-tap network pharmacy. */
import type { Screen } from "@/engine/workflow/screens";
import type { CoaRoute } from "../slots";

const STORE = { module: "pharmacy_selection", props: { variant: "store" } } as const;
const NETWORK = { module: "pharmacy_selection", props: { variant: "network" } } as const;

export const PHARMACY_SELECTION_SCREENS: Screen[] = [
  { path: "/pharmacy-selection", label: "Pharmacy Selection", group: "Pricing and pharmacy", scope: STORE, sticky: true },
  { path: "/network-pharmacy-selection", label: "Network Pharmacy Selection", group: "Pricing and pharmacy", scope: NETWORK, sticky: true },
  { path: "/pharmacy-selection-confirmation", label: "Pharmacy Confirmation", group: "Pricing and pharmacy", scope: NETWORK, sticky: true },
  { path: "/pharmacy-transfer", label: "Pharmacy Transfer", group: "Provider transfer", scope: NETWORK, sticky: true },
];

export const PHARMACY_SELECTION_ROUTES: CoaRoute[] = [
  // The scenario assigns the pharmacy: the patient goes from the OTP straight to the transfer confirmation.
  {
    id: "pharmacy_selection.coverage_transfer",
    slot: "pharmacy",
    path: "/pharmacy-transfer",
    scope: NETWORK,
    when: (d) => d.pharmacyBenefitStatus === "covered" && d.pharmacyAssigned && d.paApprovedOtpVerified,
  },
  { id: "pharmacy_selection.coverage_network", slot: "pharmacy", path: "/network-pharmacy-selection", scope: NETWORK, when: (d) => d.pharmacyBenefitStatus === "covered" && d.pricingOption === null },
];
