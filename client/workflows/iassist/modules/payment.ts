/**
 * Payment: the pricing pick, self-pay, and payment verification. Representative only, no real payment. Only self-pay collects payment through the app.
 */
import type { IaRule } from "./shared";
import { selfPayOwesPayment } from "./shared";

export const PAYMENT_RULES: IaRule[] = [

  // ── Pricing and pharmacy choice (iAssist_PA_Approved) ──────────────
  {
    id: "payment.select_pricing_option",
    on: "SELECT_PRICING_OPTION",
    scope: { module: "payment" },
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, e, s) => ({
      pricingOption: e.option,
      selectedPharmacy: e.option === "retail" ? s.content.retail : s.content.mailOrder,
    }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "payment.select_self_pay",
    on: "SELECT_SELF_PAY",
    scope: { module: "payment" },
    when: (d) => d.paApprovedOtpVerified && d.pricingOption === null,
    set: (_d, _e, s) => ({ pricingOption: "self_pay", selectedPharmacy: s.content.selfPay }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // Representative only: no real payment. Only self-pay collects payment through the app.
    id: "payment.patient_pays",
    on: "PATIENT_PAYS",
    scope: { module: "payment" },
    when: (d) => selfPayOwesPayment(d) && d.patientShipDate !== null && d.cashOfferStatus !== "paid",
    set: () => ({ cashOfferStatus: "paid" }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "payment.verify_payment",
    on: "VERIFY_PAYMENT",
    scope: { module: "payment" },
    when: (d) => d.cashOfferStatus === "paid" && !d.paymentVerified,
    set: () => ({ paymentVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
];
