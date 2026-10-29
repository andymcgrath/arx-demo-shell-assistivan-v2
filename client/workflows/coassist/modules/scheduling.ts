/**
 * Scheduling: delivery address and ship date. A recipe without the `scheduling` module rejects both events.
 */
import type { CoaRule } from "./shared";
import { nowIso, inFulfillmentTail } from "./shared";

export const SCHEDULING_RULES: CoaRule[] = [
  {
    id: "scheduling.patient_sets_address",
    on: "PATIENT_SETS_ADDRESS",
    scope: { module: "scheduling" },
    // `pending_selection`: the free drug program clears the case to dispatch when income verifies.
    when: (d) => (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection") && inFulfillmentTail(d),
    set: () => ({ dispatchStatus: "selected" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "scheduling.patient_selects_ship_date",
    on: "PATIENT_SELECTS_SHIP_DATE",
    scope: { module: "scheduling" },
    when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null && d.pharmacyStatus === "none",
    set: () => ({ patientShipDate: nowIso() }),
    emit: { portal: "patient", step: 9 },
  },
];
