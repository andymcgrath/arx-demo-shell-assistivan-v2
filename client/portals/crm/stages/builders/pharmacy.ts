import type { WorkflowData } from "@/engine/types";
import { dateFromToday, daysFromToday } from "@/lib/relativeDate";
import type { Stage } from "../types";
import { TRANSFER_NOT_NEEDED_DETAIL, notNeeded } from "./coverage";

/** Pharmacy Status: the dispense in transit and delivered. The denied-PA Bridge dispenses twice, so the second says "Second". */

const ID = "PS-14278";
const NAME = "Pharmacy Status";

/** "First" for every scenario but the Bridge's second shipment (`dispenseLeg` is only ever set there). */
const dispense = (d: WorkflowData) => (d.dispenseLeg === 2 ? "Second" : "First");

const standard = (d: WorkflowData, name = NAME): Stage =>
  d.pharmacyStatus === "shipped"
    ? { id: ID, name, statusLabel: "In Transit", statusDetail: `${dispense(d)} dispense shipped — in transit to patient`, isComplete: false, isNotStarted: false, fields: [{ label: "Carrier", value: "FedEx" }, { label: "Tracking #", value: "775899987245" }, { label: "Est. Delivery", value: daysFromToday(7) }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : d.pharmacyStatus === "delivered"
    ? { id: ID, name, statusLabel: "Complete", statusDetail: `${dispense(d)} dispense delivered`, isComplete: true, isNotStarted: false, fields: [{ label: "Carrier", value: "FedEx" }, { label: "Tracking #", value: "775899987245" }, { label: "Delivered", value: daysFromToday(0) }], lastUpdated: dateFromToday(0).toLocaleDateString(), lastUpdatedAgo: "today" }
    : { id: ID, name, statusLabel: "Stage not started", statusDetail: "No Status available", isComplete: false, isNotStarted: true, fields: [], lastUpdated: null, lastUpdatedAgo: null };

export const PHARMACY_BUILDERS = {
  standard: (d: WorkflowData): Stage => standard(d),
  /** Free drug: the stage is the order status, at a site of care. */
  order_status: (d: WorkflowData): Stage => standard(d, "Order Status"),
  transfer_not_needed: (): Stage => notNeeded({ id: ID, name: NAME }, TRANSFER_NOT_NEEDED_DETAIL),
  /** Coverage scenario 1: filled at the patient's retail pharmacy, so there is nothing to track. */
  retail_not_needed: (): Stage =>
    notNeeded({ id: ID, name: NAME }, "Filled directly at the patient's selected retail pharmacy — no separate Pharmacy Status tracking"),
};
