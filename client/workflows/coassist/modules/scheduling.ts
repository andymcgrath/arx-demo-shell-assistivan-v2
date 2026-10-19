/**
 * Scheduling: delivery address and ship date.
 */
import type { CoaRule } from "./shared";
import { nowIso, inFulfillmentTail } from "./shared";

export const SCHEDULING_RULES: CoaRule[] = [
  {
    id: "scheduling.patient_sets_address",
    on: "PATIENT_SETS_ADDRESS",
    when: (d) => d.dispatchStatus === "none" && inFulfillmentTail(d),
    set: () => ({ dispatchStatus: "selected" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "scheduling.patient_selects_ship_date",
    on: "PATIENT_SELECTS_SHIP_DATE",
    when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null && d.pharmacyStatus === "none",
    set: () => ({ patientShipDate: nowIso() }),
    emit: { portal: "patient", step: 9 },
  },
];
