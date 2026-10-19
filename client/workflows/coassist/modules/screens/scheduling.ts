/** Scheduling: the delivery address, then the ship date. */
import type { Screen } from "@/engine/workflow/screens";
import { dmeNeitherCovered } from "../shared";
import { DME_BI, STANDARD_BI, type CoaRoute } from "../slots";

/** The module's own scope. Each route rule also names its branch, so a recipe without scheduling drops them. */
const SCOPE = { module: "scheduling" } as const;

export const SCHEDULING_SCREENS: Screen[] = [
  { path: "/delivery-address", label: "Delivery Address", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/delivery-date", label: "Delivery Date", group: "{program} order", scope: SCOPE, sticky: true },
];

export const SCHEDULING_ROUTES: CoaRoute[] = [
  { id: "scheduling.address", slot: "address", path: "/delivery-address", scope: [SCOPE, STANDARD_BI], when: (d) => d.paStatus === "approved" && d.pricingOption !== null && d.dispatchStatus === "none" },
  { id: "scheduling.address_after_cash_offer", slot: "address", path: "/delivery-address", scope: [SCOPE, STANDARD_BI], when: (d) => d.cashOfferStatus === "paid" && d.dispatchStatus === "none" },
  {
    id: "scheduling.dme_address",
    slot: "address",
    path: "/delivery-address",
    scope: [SCOPE, DME_BI],
    when: (d) => dmeNeitherCovered(d) && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection"),
  },
  { id: "scheduling.date", slot: "date", path: "/delivery-date", scope: [SCOPE, STANDARD_BI], when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null },
  { id: "scheduling.dme_date", slot: "date", path: "/delivery-date", scope: [SCOPE, DME_BI], when: (d) => dmeNeitherCovered(d) && d.patientShipDate === null },
];
