/**
 * The iAssist route spine. See workflows/coassist/modules/slots.ts for how slots work: a slot is a named point in
 * the journey, and a module puts each of its route rules at one. Order matters only between rules that can match
 * the same data. `iassist.routes.test.ts` walks both scenarios and fails when a reorder moves a patient to another screen.
 */
import type { ScreenRule } from "@/engine/workflow/screens";

export const IASSIST_SLOTS = [
  /** Lock screen, SMS, OTP, consent. */
  "gate",
  /** BI has not started. It starts with the referral, so this is a moment only. */
  "started",
  /** The appeal was approved: the result, then the infusion date. */
  "appeal_result",
  /** The PA was denied. */
  "denied",
  /** Waiting on the PA decision. */
  "waiting",
  /** PA approved: SMS and OTP again. */
  "pa_notice",
  /** The Rx goes to an assigned pharmacy. The patient has nothing to choose. */
  "transfer",
  "pricing",
  "address",
  "date",
  "payment",
  /** Order confirmed, processing, shipped, delivered. */
  "tracking",
] as const;

export type IassistSlot = (typeof IASSIST_SLOTS)[number];

/** The menu groups, in the order a patient meets them. */
export const IASSIST_GROUPS = ["Enrollment", "Prior authorization", "Pricing", "Pharmacy transfer", "{program} order"] as const;

/** An iAssist route rule. It names its id, its slot, and (when it is not for every scenario) its scope. */
export type IaRoute = ScreenRule & { id: string; slot: IassistSlot };
