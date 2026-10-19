/**
 * Cash offer. Two variants (see recipes.ts): `pa_denied` is the offer after a denied PA (DTP, Copay). `sms` is the
 * cash-offer SMS when neither benefit covers (DME).
 */
import type { Screen } from "@/engine/workflow/screens";
import { dmeNeitherCovered } from "../shared";
import type { CoaRoute } from "../slots";

const PA_DENIED = { module: "cash_offer", props: { variant: "pa_denied" } } as const;
const SMS = { module: "cash_offer", props: { variant: "sms" } } as const;

export const CASH_OFFER_SCREENS: Screen[] = [
  { path: "/pa-denied", label: "PA Denied and Cash Offer", group: "Prior authorization", scope: PA_DENIED },
  { path: "/cash-offer-sms", label: "Cash Offer SMS", group: "Cash pay", scope: SMS },
  { path: "/pa-denied", label: "No Coverage and Cash Option", group: "Cash pay", scope: SMS },
];

export const CASH_OFFER_ROUTES: CoaRoute[] = [
  // PA denied: the cash offer, then payment and address.
  { id: "cash_offer.pa_denied", slot: "cash_offer", path: "/pa-denied", scope: PA_DENIED, when: (d) => d.paStatus === "denied" && d.cashOfferStatus === "none" },

  // Neither covered. The SMS flips to sent in the same step BI completes. Until then, home.
  { id: "cash_offer.dme_waiting_for_sms", slot: "cash_offer", path: "/", scope: SMS, when: (d) => dmeNeitherCovered(d) && !d.cashOfferSmsSent },
  { id: "cash_offer.dme_sms", slot: "cash_offer", path: "/cash-offer-sms", scope: SMS, when: (d) => dmeNeitherCovered(d) && !d.cashOfferSmsVerified },
  { id: "cash_offer.dme_no_coverage", slot: "cash_offer", path: "/pa-denied", scope: SMS, when: (d) => dmeNeitherCovered(d) && d.pricingOption === null },
];
