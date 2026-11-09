/** Tracking: the order tracker, from confirmation to delivery. */
import type { Screen } from "@/engine/workflow/screens";
import type { RuleScope } from "@/engine/workflow/types";
import { neitherCovered } from "../shared";
import { PAP_JOURNEY, TRANSFER_JOURNEY, PRICING_JOURNEY, type CoaRoute } from "../slots";

const SCOPE = { module: "tracking" } as const;
const COPAY = { fork: "copay" } as const;
/** An assigned pharmacy after a PA: the scenario has the `pa` fork. The free drug program has none. */
const ASSIGNED_AFTER_PA: RuleScope[] = [{ module: "pharmacy_selection", props: { variant: "assigned" } }, { fork: "pa" }];

export const TRACKING_SCREENS: Screen[] = [
  { path: "/pap-enrollment-complete", label: "Confirmation", group: "{program} order", scope: PAP_JOURNEY },
  { path: "/order-tracker", label: "Order Tracker", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/order-shipped", label: "Order Shipped / In Transit", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/medication-delivered", label: "Medication Delivered", group: "{program} order", scope: SCOPE, sticky: true },
];

export const TRACKING_ROUTES: CoaRoute[] = [
  // Copay Retail is filled at a pharmacy counter. No address or ship date.
  { id: "tracking.copay_retail", slot: "shortcut", path: "/order-tracker", scope: COPAY, when: (d) => d.pricingOption === "retail" },
  // Copay Mail Order ends once the address is set. The filling pharmacy handles the date.
  { id: "tracking.copay_mail_order", slot: "shortcut", path: "/order-tracker", scope: COPAY, when: (d) => d.pricingOption === "mail_order" && d.dispatchStatus !== "none" },

  { id: "tracking.order_confirmed", slot: "tracking", path: "/enrollment-complete", scope: PRICING_JOURNEY, when: (d) => d.patientShipDate !== null && d.pharmacyStatus === "none" },
  { id: "tracking.processing", slot: "tracking", path: "/order-tracker", scope: PRICING_JOURNEY, when: (d) => d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready" },
  { id: "tracking.shipped", slot: "tracking", path: "/order-shipped", scope: PRICING_JOURNEY, when: (d) => d.pharmacyStatus === "shipped" },
  // The tracker already shows a finished "delivered" state.
  { id: "tracking.delivered", slot: "tracking", path: "/order-tracker", scope: PRICING_JOURNEY, when: (d) => d.pharmacyStatus === "delivered" },

  // The free drug program: nothing more for the patient until the pharmacy fills it.
  { id: "tracking.pap_confirmation", slot: "tracking", path: "/pap-enrollment-complete", scope: PAP_JOURNEY, when: (d) => d.pharmacyStatus === "none" },
  { id: "tracking.pap_processing", slot: "tracking", path: "/order-tracker", scope: PAP_JOURNEY, when: (d) => d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready" },
  { id: "tracking.pap_shipped", slot: "tracking", path: "/order-shipped", scope: PAP_JOURNEY, when: (d) => d.pharmacyStatus === "shipped" },
  { id: "tracking.pap_delivered", slot: "tracking", path: "/medication-delivered", scope: PAP_JOURNEY, when: (d) => d.pharmacyStatus === "delivered" },

  // An assigned pharmacy ships after its PA (the BI exit assigned it). Without scheduling, the confirmation is the transfer screen.
  { id: "tracking.assigned_processing", slot: "tracking", path: "/order-tracker", scope: ASSIGNED_AFTER_PA, when: (d) => d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready" },
  { id: "tracking.assigned_shipped", slot: "tracking", path: "/order-shipped", scope: ASSIGNED_AFTER_PA, when: (d) => d.pharmacyStatus === "shipped" },
  { id: "tracking.assigned_delivered", slot: "tracking", path: "/medication-delivered", scope: ASSIGNED_AFTER_PA, when: (d) => d.pharmacyStatus === "delivered" },

  // Coverage, pharmacy covered: the order ends at the tracker.
  { id: "tracking.coverage_pharmacy_covered", slot: "tracking", path: "/order-tracker", scope: TRANSFER_JOURNEY, when: (d) => d.pharmacyBenefitStatus === "covered" },
  // Coverage, neither covered.
  { id: "tracking.coverage_order_confirmed", slot: "tracking", path: "/enrollment-complete", scope: TRANSFER_JOURNEY, when: (d) => neitherCovered(d) && d.pharmacyStatus === "none" },
  { id: "tracking.coverage_processing", slot: "tracking", path: "/order-tracker", scope: TRANSFER_JOURNEY, when: (d) => neitherCovered(d) && (d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready") },
  { id: "tracking.coverage_shipped", slot: "tracking", path: "/order-shipped", scope: TRANSFER_JOURNEY, when: (d) => neitherCovered(d) && d.pharmacyStatus === "shipped" },
  { id: "tracking.coverage_delivered", slot: "tracking", path: "/order-tracker", scope: TRANSFER_JOURNEY, when: (d) => neitherCovered(d) },
];
