/**
 * Tracking: fulfillment events that move the order tracker.
 */
import type { CoaRule } from "./shared";
import { inFulfillmentTail, waitsForShipDate } from "./shared";
import { hasBridge } from "./financial_assistance";

/** The recipe runs two dispenses (the Bridge, then the commercial pharmacy after the appeal). */
const TWO_LEGS = { module: "tracking", props: { variant: "two_legs" } } as const;

export const TRACKING_RULES: CoaRule[] = [
  {
    id: "tracking.fill_rx",
    on: "FILL_RX",
    // A pharmacy that ships what the patient scheduled waits for the ship date (see `waitsForShipDate`).
    when: (d, _e, s) => inFulfillmentTail(d) && (!waitsForShipDate(s) || d.patientShipDate !== null),
    // With a Bridge, the first dispense goes to the non-commercial pharmacy. The second leg already set the commercial one.
    set: (d, _e, s) => ({ pharmacyStatus: "processing", dispatchStatus: "dispatched", ...(hasBridge(s) && d.dispenseLeg === undefined ? { selectedPharmacy: s.content.transferPharmacy } : {}) }),
    emit: { portal: "field", step: 10 },
  },
  {
    // The second dispense. The first one is delivered and the appeal is approved. The patient confirms the address again
    // and picks a fresh date, so the order's own state resets. Everything the first leg set is kept in `firstLeg`.
    id: "tracking.start_second_leg",
    on: "START_SECOND_LEG",
    scope: TWO_LEGS,
    when: (d) => d.appealStatus === "approved" && d.pharmacyStatus === "delivered" && d.dispenseLeg === undefined && !!d.commercialPharmacy,
    set: (d) => ({
      dispenseLeg: 2,
      firstLeg: { pharmacy: d.selectedPharmacy, shipDate: d.patientShipDate },
      selectedPharmacy: d.commercialPharmacy ?? null,
      pharmacyStatus: "none",
      dispatchStatus: "none",
      patientShipDate: null,
    }),
    emit: { portal: "crm", step: 9 },
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
