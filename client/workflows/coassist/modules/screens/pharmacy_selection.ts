/**
 * Pharmacy selection. `store` is the patient's retail pick (Copay). `network` is Coverage's one-tap network pharmacy.
 * `assigned`: the BI exit hands the Rx to one pharmacy or site of care, and the patient sees its contact details.
 */
import type { Screen } from "@/engine/workflow/screens";
import type { CoaRoute } from "../slots";

const STORE = { module: "pharmacy_selection", props: { variant: "store" } } as const;
const NETWORK = { module: "pharmacy_selection", props: { variant: "network" } } as const;
const ASSIGNED = { module: "pharmacy_selection", props: { variant: "assigned" } } as const;

export const PHARMACY_SELECTION_SCREENS: Screen[] = [
  { path: "/pharmacy-selection", label: "Pharmacy Selection", group: "Pricing and pharmacy", scope: STORE, sticky: true },
  { path: "/network-pharmacy-selection", label: "Network Pharmacy Selection", group: "Pricing and pharmacy", scope: NETWORK, sticky: true },
  { path: "/pharmacy-selection-confirmation", label: "Pharmacy Confirmation", group: "Pricing and pharmacy", scope: NETWORK, sticky: true },
  { path: "/pharmacy-transfer", label: "Pharmacy Transfer", group: "Provider transfer", scope: NETWORK, sticky: true },
  { path: "/pharmacy-transfer", label: "Pharmacy Transfer", group: "Provider transfer", scope: ASSIGNED, sticky: true },
];

export const PHARMACY_SELECTION_ROUTES: CoaRoute[] = [
  // `assigned` has no pricing fork and no provider transfer, so it owns the waiting and PA notice screens too.
  { id: "pharmacy_selection.assigned_waiting", slot: "awaiting", path: "/", scope: ASSIGNED, when: (d) => d.consentStatus === "confirmed" && d.paStatus !== "approved" },
  { id: "pharmacy_selection.assigned_sms", slot: "pa_notice", path: "/pa-approved-sms", scope: ASSIGNED, when: (d) => d.paStatus === "approved" && !d.paApprovedSmsVerified },
  { id: "pharmacy_selection.assigned_otp", slot: "pa_notice", path: "/pa-approved-otp", scope: ASSIGNED, when: (d) => d.paStatus === "approved" && d.paApprovedSmsVerified && !d.paApprovedOtpVerified },
  // The OTP verified and the pharmacy was assigned: the order ends here. No pricing, scheduling, or payment.
  { id: "pharmacy_selection.assigned_transfer", slot: "pharmacy", path: "/pharmacy-transfer", scope: ASSIGNED, when: (d) => d.pharmacyAssigned && d.paApprovedOtpVerified },
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
