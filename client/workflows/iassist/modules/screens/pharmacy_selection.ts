/** Pharmacy selection. `assigned`: the BI exit hands the Rx to one pharmacy, and the patient sees its contact details. */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const ASSIGNED = { module: "pharmacy_selection", props: { variant: "assigned" } } as const;

export const PHARMACY_SELECTION_SCREENS: Screen[] = [
  { path: "/pharmacy-transfer", label: "Pharmacy Transfer", group: "Pharmacy transfer", scope: ASSIGNED, sticky: true },
];

export const PHARMACY_SELECTION_ROUTES: IaRoute[] = [
  // The OTP verified and the pharmacy was assigned: the order ends here. No pricing, scheduling, or payment.
  { id: "pharmacy_selection.assigned_transfer", slot: "transfer", path: "/pharmacy-transfer", scope: ASSIGNED, when: (d) => d.pharmacyAssigned && d.paApprovedOtpVerified },
];
