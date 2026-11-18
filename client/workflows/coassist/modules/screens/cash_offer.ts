/**
 * Cash offer. Three variants (see recipes.ts): `pa_denied` is the offer after a denied PA (DTP, Copay). `sms` is the
 * cash-offer SMS when neither benefit covers (Coverage). `bridge` is a free supply while the appeal runs: no cash offer and no price.
 */
import type { Screen } from "@/engine/workflow/screens";
import { neitherCovered } from "../shared";
import type { CoaRoute } from "../slots";

const PA_DENIED = { module: "cash_offer", props: { variant: "pa_denied" } } as const;
const BRIDGE = { module: "cash_offer", props: { variant: "bridge" } } as const;
const SMS = { module: "cash_offer", props: { variant: "sms" } } as const;

export const CASH_OFFER_SCREENS: Screen[] = [
  { path: "/pa-denied", label: "PA Denied and Cash Offer", group: "Prior authorization", scope: PA_DENIED },
  { path: "/bridge-sms", label: "Bridge Supply SMS", group: "Prior authorization", scope: BRIDGE },
  { path: "/bridge-supply", label: "Bridge Free Supply", group: "Prior authorization", scope: BRIDGE },
  { path: "/cash-offer-sms", label: "Cash Offer SMS", group: "Cash pay", scope: SMS },
  { path: "/pa-denied", label: "No Coverage and Cash Option", group: "Cash pay", scope: SMS },
];

export const CASH_OFFER_ROUTES: CoaRoute[] = [
  // PA denied: the cash offer, then payment and address.
  { id: "cash_offer.pa_denied", slot: "cash_offer", path: "/pa-denied", scope: PA_DENIED, when: (d) => d.paStatus === "denied" && d.cashOfferStatus === "none" },

  // PA denied with a bridge: no cash offer. The text, then the free supply. Until the text goes out the patient waits on home.
  { id: "cash_offer.bridge_waiting", slot: "cash_offer", path: "/", scope: BRIDGE, when: (d) => d.paStatus === "denied" && d.bridgeStatus === undefined },
  { id: "cash_offer.bridge_sms", slot: "cash_offer", path: "/bridge-sms", scope: BRIDGE, when: (d) => d.paStatus === "denied" && d.bridgeStatus === "sent" },
  { id: "cash_offer.bridge_supply", slot: "cash_offer", path: "/bridge-supply", scope: BRIDGE, when: (d) => d.paStatus === "denied" && d.bridgeStatus === "active" },

  // Neither covered. The SMS flips to sent in the same step BI completes. Until then, home.
  { id: "cash_offer.coverage_waiting_for_sms", slot: "cash_offer", path: "/", scope: SMS, when: (d) => neitherCovered(d) && !d.cashOfferSmsSent },
  { id: "cash_offer.coverage_sms", slot: "cash_offer", path: "/cash-offer-sms", scope: SMS, when: (d) => neitherCovered(d) && !d.cashOfferSmsVerified },
  { id: "cash_offer.coverage_no_coverage", slot: "cash_offer", path: "/pa-denied", scope: SMS, when: (d) => neitherCovered(d) && d.pricingOption === null },
];
