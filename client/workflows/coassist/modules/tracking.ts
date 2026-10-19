/**
 * Tracking: fulfillment events that move the order tracker.
 */
import type { CoaRule } from "./shared";
import { inFulfillmentTail } from "./shared";

export const TRACKING_RULES: CoaRule[] = [
  {
    id: "tracking.fill_rx",
    on: "FILL_RX",
    when: inFulfillmentTail,
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
