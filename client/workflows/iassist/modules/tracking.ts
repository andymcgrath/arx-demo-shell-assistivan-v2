/**
 * Tracking: fulfillment events that move the order tracker.
 */
import { siteOfCareUnlocked, type IaRule } from "./shared";

export const TRACKING_RULES: IaRule[] = [

  // ── Fulfillment ────────────────────────────────────────────────────
  {
    id: "tracking.fill_rx.delivery",
    on: "FILL_RX",
    scope: [{ module: "tracking" }, { module: "scheduling", props: { variant: "delivery" } }],
    when: (d) => d.paStatus === "approved" && d.patientShipDate !== null && d.pharmacyStatus === "none" && (d.pricingOption !== "self_pay" || d.paymentVerified),
    set: () => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
    emit: { portal: "field", step: 10 },
  },
  {
    // Fulfillment unlocks off the appeal being filed, then waits for the site of care to be picked.
    id: "tracking.fill_rx.site_of_care",
    on: "FILL_RX",
    scope: [{ module: "tracking" }, { module: "scheduling", props: { variant: "infusion" } }],
    when: (d) => siteOfCareUnlocked(d) && d.dispatchStatus === "selected" && d.pharmacyStatus === "none",
    set: () => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched" }),
    emit: { portal: "field", step: 10 },
  },
  {
    id: "tracking.ready_rx",
    on: "READY_RX",
    when: (d) => d.pharmacyStatus === "processing",
    set: () => ({ pharmacyStatus: "ready" }),
    emit: { portal: "field", step: 10 },
  },
  {
    id: "tracking.ship_rx",
    on: "SHIP_RX",
    when: (d) => d.pharmacyStatus === "ready",
    set: () => ({ pharmacyStatus: "shipped" }),
    emit: { portal: "field", step: 11 },
  },
  {
    id: "tracking.deliver_rx",
    on: "DELIVER_RX",
    when: (d) => d.pharmacyStatus === "shipped",
    set: () => ({ pharmacyStatus: "delivered" }),
    emit: { portal: "field", step: 12 },
  },
];
