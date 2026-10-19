/** Payment: the patient's pricing pick and the delivery payment. Retail and Mail Order cost is handled at the counter. Only self-pay pays here. */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const SCOPE = { module: "payment" } as const;

export const PAYMENT_SCREENS: Screen[] = [
  { path: "/benefit-pricing", label: "Benefit Pricing", group: "Pricing", scope: SCOPE, sticky: true },
  { path: "/copay-enroll", label: "Copay Enrollment", group: "Pricing", scope: SCOPE, sticky: true },
  { path: "/delivery-payment", label: "Payment", group: "{program} order", scope: SCOPE, sticky: true },
  { path: "/delivery-confirmation", label: "Order Confirmation", group: "{program} order", scope: SCOPE, sticky: true },
];

export const PAYMENT_ROUTES: IaRoute[] = [
  { id: "payment.benefit_pricing", slot: "pricing", path: "/benefit-pricing", scope: SCOPE, when: (d) => d.paStatus === "approved" && d.pricingOption === null },
  { id: "payment.delivery_payment", slot: "payment", path: "/delivery-payment", scope: SCOPE, when: (d) => d.paStatus === "approved" && d.pricingOption === "self_pay" && !d.paymentVerified },
];
