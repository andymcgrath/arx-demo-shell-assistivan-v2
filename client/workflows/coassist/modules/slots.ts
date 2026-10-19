/**
 * The CoAssist route spine and the scopes route rules share.
 *
 * Route rules run first match wins, and the modules interleave in the order a patient meets them (payment, then
 * scheduling, then payment again). One position per module cannot say that. A slot can: it is a named point in
 * the journey, and a module puts each of its route rules at one. Order matters only between rules that can match
 * the same data. The behavior test `coassist.routes.test.ts` walks every scenario and fails when a reorder moves a
 * patient to another screen.
 */
import type { ScreenRule } from "@/engine/workflow/screens";
import type { RuleScope } from "@/engine/workflow/types";

export const COASSIST_SLOTS = [
  /** Lock screen, SMS, OTP, consent. Every scenario. */
  "gate",
  /** The patient waits for BI, then for the PA decision. */
  "awaiting",
  /** Medical benefit covered: the Rx goes to the provider. */
  "transfer",
  /** PA approved: SMS and OTP again. */
  "pa_notice",
  /** The patient picks Retail, Mail Order, or the self-pay offer. */
  "pricing",
  /** A network pharmacy takes the Rx. */
  "pharmacy",
  /** The order ends here: no address, no ship date. */
  "shortcut",
  /** PA denied, or no coverage: the cash offer. */
  "cash_offer",
  "address",
  "date",
  "payment",
  /** Order confirmed, processing, shipped, delivered. */
  "tracking",
  /** A state no rule above expects. */
  "fallback",
] as const;

export type CoassistSlot = (typeof COASSIST_SLOTS)[number];

/** A CoAssist route rule. It names its id, its slot, and (when it is not for every scenario) its scope. */
export type CoaRoute = ScreenRule & { id: string; slot: CoassistSlot };

/** The menu groups, in the order a patient meets them. */
export const COASSIST_GROUPS = [
  "Enrollment",
  "Prior authorization",
  "Pricing and pharmacy",
  "Cash pay",
  "Provider transfer",
  "{program} order",
] as const;

/**
 * The two journeys after BI. Every scenario shares the `bi` fork, so the fork cannot tell them apart. The recipe can.
 * `PRICING_JOURNEY`: the patient picks Retail, Mail Order, or the self-pay offer. Only DTP and Copay declare the
 * `pricing` fork.
 */
export const PRICING_JOURNEY: RuleScope = { fork: "pricing" };

/** `TRANSFER_JOURNEY`: the Rx goes to a network pharmacy, a provider, or a cash offer. Only a recipe with `provider_transfer` has it. */
export const TRANSFER_JOURNEY: RuleScope = { module: "provider_transfer" };
