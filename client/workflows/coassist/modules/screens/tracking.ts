/** Tracking: the order tracker, from confirmation to delivery. */
import type { Screen } from "@/engine/workflow/screens";
import { dmeNeitherCovered } from "../shared";
import { DME_BI, STANDARD_BI, type CoaRoute } from "../slots";

const SCOPE = { module: "tracking" } as const;
const COPAY = { fork: "copay" } as const;

export const TRACKING_SCREENS: Screen[] = [
  { path: "/order-tracker", label: "Order Tracker", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/order-shipped", label: "Order Shipped / In Transit", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/medication-delivered", label: "Medication Delivered", group: "{program} order", scope: SCOPE, sticky: true },
];

export const TRACKING_ROUTES: CoaRoute[] = [
  // Copay Retail is filled at a pharmacy counter. No address or ship date.
  { id: "tracking.copay_retail", slot: "shortcut", path: "/order-tracker", scope: COPAY, when: (d) => d.pricingOption === "retail" },
  // Copay Mail Order ends once the address is set. The filling pharmacy handles the date.
  { id: "tracking.copay_mail_order", slot: "shortcut", path: "/order-tracker", scope: COPAY, when: (d) => d.pricingOption === "mail_order" && d.dispatchStatus !== "none" },

  { id: "tracking.order_confirmed", slot: "tracking", path: "/enrollment-complete", scope: STANDARD_BI, when: (d) => d.patientShipDate !== null && d.pharmacyStatus === "none" },
  { id: "tracking.processing", slot: "tracking", path: "/order-tracker", scope: STANDARD_BI, when: (d) => d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready" },
  { id: "tracking.shipped", slot: "tracking", path: "/order-shipped", scope: STANDARD_BI, when: (d) => d.pharmacyStatus === "shipped" },
  // The tracker already shows a finished "delivered" state.
  { id: "tracking.delivered", slot: "tracking", path: "/order-tracker", scope: STANDARD_BI, when: (d) => d.pharmacyStatus === "delivered" },

  // DME, pharmacy covered: the order ends at the tracker.
  { id: "tracking.dme_pharmacy_covered", slot: "tracking", path: "/order-tracker", scope: DME_BI, when: (d) => d.pharmacyBenefitStatus === "covered" },
  // DME, neither covered.
  { id: "tracking.dme_order_confirmed", slot: "tracking", path: "/enrollment-complete", scope: DME_BI, when: (d) => dmeNeitherCovered(d) && d.pharmacyStatus === "none" },
  { id: "tracking.dme_processing", slot: "tracking", path: "/order-tracker", scope: DME_BI, when: (d) => dmeNeitherCovered(d) && (d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready") },
  { id: "tracking.dme_shipped", slot: "tracking", path: "/order-shipped", scope: DME_BI, when: (d) => dmeNeitherCovered(d) && d.pharmacyStatus === "shipped" },
  { id: "tracking.dme_delivered", slot: "tracking", path: "/order-tracker", scope: DME_BI, when: (d) => dmeNeitherCovered(d) },
];
