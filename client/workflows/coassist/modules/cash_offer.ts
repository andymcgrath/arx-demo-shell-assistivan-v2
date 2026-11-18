/**
 * Cash offer: a denied PA gets a cash offer (DTP and Copay), and no coverage gets a cash-offer SMS (Coverage).
 */
import { appealStart } from "./appeal";
import type { CoaRule } from "./shared";

/** How long after the denial the automatic bridge text goes out (`system` trigger). */
export const BRIDGE_TEXT_MS = 2000;

const BRIDGE = { module: "cash_offer", props: { variant: "bridge" } } as const;

import { bridgeTrigger } from "../triggers";
export { bridgeTrigger };

/** The denial. Both variants share the precondition and the data change. The bridge adds its automatic text. */
const denyPa = (id: string, variant: "pa_denied" | "bridge"): CoaRule => ({
  id,
  on: "DENY_PA",
  scope: { module: "cash_offer", props: { variant } },
  when: (d) => d.paStatus === "submitted",
  set: () => ({ paStatus: "denied" }),
  emit: { portal: "provider", step: 9 },
  // The denial starts the appeal when the recipe has one (modules/appeal.ts), and the bridge text when it is automatic.
  then: [
    ...(variant === "bridge"
      ? [
          {
            // The precondition is the denial either way. SEND_BRIDGE ignores it unless the PA is denied.
            trigger: "system" as const,
            id: "bridge-text",
            after: BRIDGE_TEXT_MS,
            when: (_d: unknown, _e: unknown, s: Parameters<typeof bridgeTrigger>[0]) => bridgeTrigger(s) === "system",
            send: () => ({ type: "SEND_BRIDGE" }),
          },
        ]
      : []),
    appealStart,
  ],
});

export const CASH_OFFER_RULES: CoaRule[] = [
  // Coverage has no denial branch: the PA is a formality.
  denyPa("cash_offer.deny_pa", "pa_denied"),
  denyPa("cash_offer.deny_pa.bridge", "bridge"),
  {
    id: "cash_offer.verify_sms",
    on: "VERIFY_CASH_OFFER_SMS",
    scope: { module: "cash_offer", props: { variant: "sms" } },
    when: (d) => d.cashOfferSmsSent && !d.cashOfferSmsVerified,
    set: () => ({ cashOfferSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    // Coverage: cash pay after the cash-offer SMS.
    id: "cash_offer.select_self_pay.coverage",
    on: "SELECT_SELF_PAY",
    // A recipe on the assistance fork picks self-pay through CHOOSE_ASSISTANCE.
    scope: [{ module: "cash_offer", props: { variant: "sms" } }, { not: { fork: "assistance" } }],
    when: (d) => d.cashOfferSmsVerified && d.pricingOption === null,
    set: (_d, _e, s) => ({ pricingOption: "self_pay", selectedPharmacy: s.content.selfPay }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "cash_offer.send_cash_offer",
    on: "SEND_CASH_OFFER",
    scope: { module: "cash_offer", props: { variant: "pa_denied" } },
    when: (d) => d.paStatus === "denied" && d.cashOfferStatus === "none",
    set: () => ({ cashOfferStatus: "sent" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    // The bridge replaces the cash offer. No offer, no price. The text starts the free supply.
    id: "cash_offer.send_bridge",
    on: "SEND_BRIDGE",
    scope: BRIDGE,
    when: (d) => d.paStatus === "denied" && d.bridgeStatus === undefined,
    // The Bridge is dispensed by the non-commercial pharmacy. The CRM's Triage card shows it from the first text, and the HCP's
    // eRx pick (the commercial pharmacy) waits on the case for the second shipment (`commercialPharmacy`).
    set: (_d, _e, s) => ({ bridgeStatus: "sent", selectedPharmacy: s.content.transferPharmacy }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "cash_offer.verify_bridge",
    on: "VERIFY_BRIDGE_SMS",
    scope: BRIDGE,
    when: (d) => d.bridgeStatus === "sent",
    set: () => ({ bridgeStatus: "active" }),
    emit: { portal: "patient", step: 9 },
  },
];
