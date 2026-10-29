/** Scheduling: the delivery address, then the ship date. */
import type { Screen } from "@/engine/workflow/screens";
import { neitherCovered } from "../shared";
import { PAP_JOURNEY, TRANSFER_JOURNEY, PRICING_JOURNEY, type CoaRoute } from "../slots";

/** The module's own scope. Each route rule also names its branch, so a recipe without scheduling drops them. */
const SCOPE = { module: "scheduling" } as const;

export const SCHEDULING_SCREENS: Screen[] = [
  { path: "/delivery-address", label: "Delivery Address", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/delivery-date", label: "Delivery Date", group: "{program} order", scope: SCOPE, sticky: true },
];

export const SCHEDULING_ROUTES: CoaRoute[] = [
  { id: "scheduling.address", slot: "address", path: "/delivery-address", scope: [SCOPE, PRICING_JOURNEY], when: (d) => d.paStatus === "approved" && d.pricingOption !== null && d.dispatchStatus === "none" },
  { id: "scheduling.address_after_cash_offer", slot: "address", path: "/delivery-address", scope: [SCOPE, PRICING_JOURNEY], when: (d) => d.cashOfferStatus === "paid" && d.dispatchStatus === "none" },
  {
    id: "scheduling.coverage_address",
    slot: "address",
    path: "/delivery-address",
    scope: [SCOPE, TRANSFER_JOURNEY],
    when: (d) => neitherCovered(d) && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection"),
  },
  // The free drug program: income verified clears the case to dispatch, then the same address and date.
  { id: "scheduling.pap_address", slot: "address", path: "/delivery-address", scope: [SCOPE, PAP_JOURNEY], when: (d) => d.incomeStatus === "verified" && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection") },
  { id: "scheduling.pap_date", slot: "date", path: "/delivery-date", scope: [SCOPE, PAP_JOURNEY], when: (d) => d.incomeStatus === "verified" && d.patientShipDate === null },
  { id: "scheduling.date", slot: "date", path: "/delivery-date", scope: [SCOPE, PRICING_JOURNEY], when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null },
  { id: "scheduling.coverage_date", slot: "date", path: "/delivery-date", scope: [SCOPE, TRANSFER_JOURNEY], when: (d) => neitherCovered(d) && d.patientShipDate === null },
];
