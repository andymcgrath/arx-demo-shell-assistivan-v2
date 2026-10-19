/**
 * Scheduling. `delivery` is the address and ship date. `infusion` is the infusion date the appeal unlocks.
 */
import type { IaRule } from "./shared";
import { nowIso } from "./shared";

export const SCHEDULING_RULES: IaRule[] = [
  {
    id: "scheduling.patient_selects_infusion_date",
    on: "PATIENT_SELECTS_INFUSION_DATE",
    scope: { module: "scheduling", props: { variant: "infusion" } },
    when: (d) => d.appealStatus === "approved",
    set: (_d, e) => ({ infusionDate: e.date ?? null }),
    emit: { portal: "patient", step: 9 },
  },

  // ── Delivery details and payment (iAssist_PA_Approved) ─────────────
  {
    id: "scheduling.patient_sets_address",
    on: "PATIENT_SETS_ADDRESS",
    scope: { module: "scheduling", props: { variant: "delivery" } },
    when: (d) => d.pricingOption !== null && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection") && d.pharmacyStatus === "none",
    set: () => ({ dispatchStatus: "selected" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "scheduling.patient_selects_ship_date",
    on: "PATIENT_SELECTS_SHIP_DATE",
    scope: { module: "scheduling", props: { variant: "delivery" } },
    when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null && d.pharmacyStatus === "none",
    set: () => ({ patientShipDate: nowIso() }),
    emit: { portal: "patient", step: 9 },
  },
];
