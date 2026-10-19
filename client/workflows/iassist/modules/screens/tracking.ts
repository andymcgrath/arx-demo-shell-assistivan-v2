/** Tracking: the order tracker, from confirmation to delivery. The appeal scenario ends at /medication-delivered. */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const SCOPE = [{ module: "tracking" }, { module: "scheduling", props: { variant: "delivery" } }];

export const TRACKING_SCREENS: Screen[] = [
  { path: "/order-tracker", label: "Order Tracker", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/order-shipped", label: "Order Shipped / In Transit", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/medication-delivered", label: "Medication Delivered", group: "{program} order", scope: { module: "tracking" }, sticky: true },
];

export const TRACKING_ROUTES: IaRoute[] = [
  { id: "tracking.order_confirmed", slot: "tracking", path: "/enrollment-complete", scope: SCOPE, when: (d) => d.paStatus === "approved" && d.pharmacyStatus === "none" },
  { id: "tracking.processing", slot: "tracking", path: "/order-tracker", scope: SCOPE, when: (d) => d.paStatus === "approved" && (d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready") },
  { id: "tracking.shipped", slot: "tracking", path: "/order-shipped", scope: SCOPE, when: (d) => d.paStatus === "approved" && d.pharmacyStatus === "shipped" },
  // The tracker already shows a finished "delivered" state.
  { id: "tracking.delivered", slot: "tracking", path: "/order-tracker", scope: SCOPE, when: (d) => d.paStatus === "approved" },
];
