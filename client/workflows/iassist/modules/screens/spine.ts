/** The spine's screens: the PA denial and waiting on the decision. Every scenario passes through them. */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

export const SPINE_SCREENS: Screen[] = [{ path: "/pa-denied", label: "PA Denied", group: "Prior authorization" }];

export const SPINE_ROUTES: IaRoute[] = [
  { id: "spine.pa_denied", slot: "denied", path: "/pa-denied", when: (d) => d.paStatus === "denied" },
  // Waiting on the PA decision. Home, not /enrollment-complete: that screen is a one-time confirmation.
  { id: "spine.waiting", slot: "waiting", path: "/", when: (d) => d.biStatus !== "none" && d.paStatus !== "approved" },
];
