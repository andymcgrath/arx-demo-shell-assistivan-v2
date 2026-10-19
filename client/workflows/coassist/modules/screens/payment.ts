/** Payment: the patient's pricing pick (Retail, Mail Order, self-pay offer) and the delivery payment. */
import type { Screen } from "@/engine/workflow/screens";
import { pricingPinNeedsConfirm } from "../../forks";
import { neitherCovered } from "../shared";
import { TRANSFER_JOURNEY, PRICING_JOURNEY, type CoaRoute } from "../slots";

// A pinned pricing pick skips the pricing menu. The patient lands on the self-pay offer when the pin needs
// confirming, or past pricing when it does not. So Benefit Pricing is skipped on any pin, and the offer unless it needs confirming.
const PAYMENT = { module: "payment" } as const;

export const PAYMENT_SCREENS: Screen[] = [
  { path: "/benefit-pricing", label: "Benefit Pricing", group: "Pricing and pharmacy", scope: { fork: "pricing" }, skipped: (d) => !!d.choices?.pricing, sticky: true },
  {
    path: "/copay-enroll",
    label: "Copay Enrollment",
    group: "Pricing and pharmacy",
    scope: { fork: "pricing" },
    skipped: (d) => !!d.choices?.pricing && !pricingPinNeedsConfirm(d),
    sticky: true,
  },
  { path: "/delivery-payment", label: "Payment", group: "{program} order", scope: { module: "payment" }, sticky: true },
  { path: "/delivery-confirmation", label: "Order Confirmation", group: "{program} order", scope: { module: "payment" }, sticky: true },
];

export const PAYMENT_ROUTES: CoaRoute[] = [
  // A pin on an exit the patient must confirm (the self-pay offer) skips the menu and lands on that screen.
  {
    id: "payment.self_pay_offer",
    slot: "pricing",
    path: "/copay-enroll",
    scope: { fork: "pricing", exit: "self_pay" },
    when: (d) => d.paStatus === "approved" && d.paApprovedOtpVerified && d.pricingOption === null && pricingPinNeedsConfirm(d),
  },
  {
    id: "payment.benefit_pricing",
    slot: "pricing",
    path: "/benefit-pricing",
    scope: { fork: "pricing" },
    when: (d) => d.paStatus === "approved" && d.paApprovedOtpVerified && d.pricingOption === null,
  },
  { id: "payment.delivery_payment", slot: "payment", path: "/delivery-payment", scope: [PAYMENT, PRICING_JOURNEY], when: (d) => d.cashOfferStatus === "sent" && !d.paymentVerified },
  { id: "payment.coverage_delivery_payment", slot: "payment", path: "/delivery-payment", scope: [PAYMENT, TRANSFER_JOURNEY], when: (d) => neitherCovered(d) && !d.paymentVerified },
];
