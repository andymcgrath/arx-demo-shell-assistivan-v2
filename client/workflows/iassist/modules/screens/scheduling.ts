/** Scheduling: the delivery address, then the ship date. The `delivery` variant belongs to the approved scenario. */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const DELIVERY = { module: "scheduling", props: { variant: "delivery" } } as const;

export const SCHEDULING_SCREENS: Screen[] = [
  { path: "/delivery-address", label: "Delivery Address", group: "{program} order", scope: DELIVERY, sticky: true },
  { path: "/delivery-date", label: "Delivery Date", group: "{program} order", scope: DELIVERY, sticky: true },
];

export const SCHEDULING_ROUTES: IaRoute[] = [
  {
    id: "scheduling.address",
    slot: "address",
    path: "/delivery-address",
    scope: DELIVERY,
    when: (d) => d.paStatus === "approved" && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection"),
  },
  { id: "scheduling.date", slot: "date", path: "/delivery-date", scope: DELIVERY, when: (d) => d.paStatus === "approved" && d.patientShipDate === null },
];
