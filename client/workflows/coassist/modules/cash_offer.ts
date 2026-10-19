/**
 * Cash offer: a denied PA gets a cash offer (DTP and Copay), and no coverage gets a cash-offer SMS (DME).
 */
import type { CoaRule } from "./shared";
import { DTP_COPAY } from "./shared";

export const CASH_OFFER_RULES: CoaRule[] = [
  {
    // DME has no denial branch: the PA is a formality.
    id: "cash_offer.deny_pa",
    on: "DENY_PA",
    scenarios: [...DTP_COPAY],
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "denied" }),
    emit: { portal: "provider", step: 9 },
  },
  {
    id: "cash_offer.verify_sms",
    on: "VERIFY_CASH_OFFER_SMS",
    scenarios: ["CoA_DME"],
    when: (d) => d.cashOfferSmsSent && !d.cashOfferSmsVerified,
    set: () => ({ cashOfferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // DME: cash pay after the cash-offer SMS.
    id: "cash_offer.select_self_pay.dme",
    on: "SELECT_SELF_PAY",
    scenarios: ["CoA_DME"],
    when: (d) => d.cashOfferSmsVerified && d.pricingOption === null,
    set: (_d, _e, s) => ({ pricingOption: "self_pay", selectedPharmacy: s.content.selfPay }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "cash_offer.send_cash_offer",
    on: "SEND_CASH_OFFER",
    scenarios: [...DTP_COPAY],
    when: (d) => d.paStatus === "denied" && d.cashOfferStatus === "none",
    set: () => ({ cashOfferStatus: "sent" }),
    emit: { portal: "crm", step: 9 },
  },
];
