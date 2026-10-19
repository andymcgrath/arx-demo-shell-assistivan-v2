/** Payment: the patient's pricing pick (Retail, Mail Order, self-pay offer) and the delivery payment. */
import type { Screen } from "@/engine/workflow/screens";
import { pricingPinNeedsConfirm } from "../../forks";
import { dmeNeitherCovered } from "../shared";
import { DME_BI, STANDARD_BI, type CoaRoute } from "../slots";

export const PAYMENT_SCREENS: Screen[] = [
  { path: "/benefit-pricing", label: "Benefit Pricing", group: "Pricing and pharmacy", scope: { fork: "pricing" }, sticky: true },
  { path: "/copay-enroll", label: "Copay Enrollment", group: "Pricing and pharmacy", scope: { fork: "pricing" }, sticky: true },
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
  { id: "payment.delivery_payment", slot: "payment", path: "/delivery-payment", scope: STANDARD_BI, when: (d) => d.cashOfferStatus === "sent" && !d.paymentVerified },
  { id: "payment.dme_delivery_payment", slot: "payment", path: "/delivery-payment", scope: DME_BI, when: (d) => dmeNeitherCovered(d) && !d.paymentVerified },
];
