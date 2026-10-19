/**
 * Payment: the pricing pick (the `pricing` fork), cash pay, and payment verification. Representative only, no real payment.
 */
import type { CoaRule } from "./shared";
import { inFulfillmentTail, pricingExit, pricingPick } from "./shared";

export const PAYMENT_RULES: CoaRule[] = [
  {
    // The patient picks an exit of the scenario's `pricing` fork (forks.ts). An option that is not one of its
    // exits is ignored: Copay has no self-pay exit, because enrolling in the copay program is its own fork.
    id: "payment.select_pricing_option",
    on: "SELECT_PRICING_OPTION",
    scope: { fork: "pricing" },
    when: (d, e) => d.paApprovedOtpVerified && d.pricingOption === null && !!pricingExit(d, e.option),
    set: (d, e, s) => pricingPick(pricingExit(d, e.option)!, s),
    emit: { portal: "patient", step: 9 },
  },
  {
    // DTP: cash pay through CoAssist's own pharmacy. It is the `self_pay` exit of the `pricing` fork.
    id: "payment.select_self_pay.dtp",
    on: "SELECT_SELF_PAY",
    scope: { fork: "pricing", exit: "self_pay" },
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (d, _e, s) => pricingPick(pricingExit(d, "self_pay")!, s),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "payment.patient_pays",
    on: "PATIENT_PAYS",
    scope: { module: "payment" },
    when: (d) => d.cashOfferStatus !== "paid" && (d.cashOfferStatus === "sent" || inFulfillmentTail(d)),
    set: () => ({ cashOfferStatus: "paid" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "payment.verify_payment",
    on: "VERIFY_PAYMENT",
    scope: { module: "payment" },
    when: (d) => !d.paymentVerified && d.pharmacyStatus === "none" && (d.cashOfferStatus === "paid" || inFulfillmentTail(d)),
    set: () => ({ paymentVerified: true }),
    emit: { portal: "crm", step: 9 },
  },
];
