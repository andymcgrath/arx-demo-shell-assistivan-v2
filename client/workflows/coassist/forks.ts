import type { FlowType } from "@/engine/types";
import type { ForkDefinition, ForkStage, StageEvent } from "@/engine/workflow/types";
import { forkApplies } from "@/engine/workflow/forks";

/**
 * CoAssist forks. A fork is a point where the story has a default branch and named alternatives.
 * The pick lives in `workflowData.choices`, and the rule that resolves the fork reads it.
 *
 * Each exit also lists the stages of its story after the fork. The presenter's stage-jump list is the
 * fork's `stagesBefore` plus the selected exit's `stages`, so the list follows the branch.
 * The events match the golden paths in engine/__tests__/scenarios.ts.
 */

const ev = (type: string, portal: string, extra: Record<string, unknown> = {}): StageEvent => ({ type, portal, ...extra });

/**
 * The events that enroll the patient and verify them. BI starts on its own when the referral lands
 * (see rules.ts), so after these the fork is waiting to resolve.
 */
export const ENROLL_AND_VERIFY: StageEvent[] = [
  ev("REFERRAL_RECEIVED", "crm"),
  ev("VERIFY_SMS", "patient"),
  ev("VERIFY_OTP", "patient"),
  ev("CONFIRM_CONSENT", "patient"),
];

/** The pharmacy a stage jump picks for the patient. */
const DME_DEFAULT_PHARMACY = {
  name: "CVS Pharmacy #3795",
  address: "210 N Orange Ave",
  city: "Orlando",
  state: "FL",
  zip: "32801",
  phone: "(407) 555-0142",
};

/**
 * Each branch's COMPLETE_BI names its statuses, so a stage jump lands on that branch even when the
 * machine's own choice is different (the headless ladder tests start on the default).
 */
const completeBi = (pharmacyBenefitStatus: string, medicalBenefitStatus: string) =>
  ev("COMPLETE_BI", "crm", { pharmacyBenefitStatus, medicalBenefitStatus });

const fulfillment = (firstLabel: string) => [
  { label: firstLabel, events: [ev("FILL_RX", "crm")] },
  { label: "Rx Shipped", events: [ev("READY_RX", "field"), ev("SHIP_RX", "crm")] },
  { label: "Medication Delivered", events: [ev("DELIVER_RX", "crm")] },
];

/**
 * The benefits investigation, one fork for every CoAssist scenario. One BI resolves to one of four coverage
 * outcomes. Every exit sets both benefit statuses, and `biResult` is derived from them (rules: spine.complete_bi).
 * The story, or a demo in the brand file, picks the exit. Medical benefit always wins when covered.
 *
 * An exit `requires` the modules its branch needs, so a recipe that lacks them cannot pick it. The rungs after the
 * fork belong to the scenario (see BI_STAGES), because the journey after the same exit differs between scenarios.
 */
export const BI_FORK: ForkDefinition = {
  id: "bi",
  label: "Benefits investigation result",
  chooser: "story",
  // CoAssist only. iAssist and the standard workflow declare their own `bi` fork.
  scenarios: ["CoA_DTP", "CoA_Copay", "CoA_DME"],
  resolved: (d) => d.biStatus === "complete",
  exits: [
    {
      id: "pharmacy_covered",
      label: "Pharmacy Coverage",
      description: "The pharmacy benefit covers it and needs a PA.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" },
    },
    {
      id: "pharmacy_transfer",
      label: "Pharmacy Transfer",
      description:
        "The pharmacy benefit covers it and the PA starts on its own. The patient does not choose a pharmacy. The Rx transfers to an assigned one and the patient sees its contact details.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered", pharmacyAssigned: true },
      requires: ["provider_transfer"],
    },
    {
      id: "medical_covered",
      label: "Medical Coverage",
      description: "The medical benefit covers it. The case transfers to an outside provider.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered" },
      requires: ["provider_transfer"],
    },
    {
      id: "no_coverage",
      label: "No Coverage (Cash)",
      description: "Neither benefit covers it. The patient gets a cash offer.",
      data: { pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" },
      requires: ["cash_offer"],
    },
  ],
};

/**
 * The stage-jump rungs after the `bi` fork, owned by the scenario and keyed by exit id. A scenario with no table
 * here has no rungs for the fork (DTP and Copay keep their hand-built ladder in shell/coassistLadders.ts).
 */
const BI_STAGES: Partial<Record<FlowType, { before: ForkStage[]; exits: Record<string, ForkStage[]> }>> = {
  CoA_DME: {
    before: [
      { label: "Referral Received", events: [] },
      { label: "Patient Enrolled", events: ENROLL_AND_VERIFY },
      { label: "Benefits Investigation", events: [] },
    ],
    exits: {
      pharmacy_covered: [
        { label: "Pharmacy Coverage Confirmed (PA not yet submitted)", events: [completeBi("covered", "not_covered")] },
        {
          label: "PA Approved & Pharmacy Selected",
          events: [
            ev("APPROVE_PA", "crm"),
            ev("VERIFY_PA_APPROVED_SMS", "patient"),
            ev("VERIFY_PA_APPROVED_OTP", "patient"),
            ev("SELECT_PHARMACY", "patient", { pharmacy: DME_DEFAULT_PHARMACY }),
          ],
        },
        ...fulfillment("Rx Processing"),
      ],
      pharmacy_transfer: [
        { label: "Pharmacy Coverage Confirmed (PA submitted)", events: [completeBi("covered", "not_covered")] },
        { label: "PA Approved", events: [ev("APPROVE_PA", "crm")] },
        {
          label: "Patient Verified, Rx Transferred",
          events: [ev("VERIFY_PA_APPROVED_SMS", "patient"), ev("VERIFY_PA_APPROVED_OTP", "patient")],
        },
      ],
      medical_covered: [
        { label: "Medical Coverage Confirmed (transfer to DME provider)", events: [completeBi("covered", "covered")] },
        { label: "DME Provider Notified", events: [ev("NOTIFY_PROVIDER_TRANSFER", "crm")] },
        { label: "Transfer SMS Confirmed", events: [ev("VERIFY_DME_TRANSFER_SMS", "patient")] },
      ],
      no_coverage: [
        { label: "No Coverage Confirmed (cash offer SMS sent)", events: [completeBi("not_covered", "not_covered")] },
        { label: "Cash Option Chosen", events: [ev("VERIFY_CASH_OFFER_SMS", "patient"), ev("SELECT_SELF_PAY", "patient")] },
        { label: "Cash Payment Verified", events: [ev("PATIENT_PAYS", "patient"), ev("VERIFY_PAYMENT", "crm")] },
        { label: "Delivery Address & Date Set", events: [ev("PATIENT_SETS_ADDRESS", "patient"), ev("PATIENT_SELECTS_SHIP_DATE", "patient")] },
        ...fulfillment("Rx Processing"),
      ],
    },
  },
};

/**
 * The PA decision, the same fork for every CoAssist scenario. The story picks it, so the decision lands when the
 * agent opens the PA stage. DME declares it too and pins `approved`. Its rules do not handle a denial yet, so
 * `denied` requires `cash_offer`. Step 2.4 gives that module the denial rules.
 */
export const PA_FORK: ForkDefinition = {
  id: "pa",
  label: "Prior authorization decision",
  chooser: "story",
  // CoAssist only. Another workflow declares its own `pa` fork, with exits that require its own modules.
  scenarios: ["CoA_DTP", "CoA_Copay", "CoA_DME"],
  resolved: (d) => d.paStatus === "approved" || d.paStatus === "denied",
  exits: [
    { id: "approved", label: "Approved", description: "The PA is approved.", data: { paStatus: "approved" } },
    {
      id: "denied",
      label: "Denied",
      description: "The PA is denied and the patient gets a cash offer.",
      data: { paStatus: "denied" },
      requires: ["cash_offer"],
    },
  ],
};

/**
 * What the patient picks on the pricing screens. Exit ids match `pricingOption`, so no read site changes.
 * The patient's pick is read from the data (`picked`), not stored in `choices`: `choices` survives RESET.
 * The pharmacy each exit names comes from scenario content (rules.ts), because exit data is static.
 * DME has no patient pick here. Its pricing follows the BI exit.
 */
export const DTP_PRICING_FORK: ForkDefinition = {
  id: "pricing",
  label: "Pricing option",
  chooser: "patient",
  scenarios: ["CoA_DTP"],
  resolved: (d) => d.pricingOption !== null,
  picked: (d) => d.pricingOption,
  exits: [
    { id: "retail", label: "Retail", description: "Fill at a retail pharmacy.", data: { pricingOption: "retail" } },
    { id: "mail_order", label: "Mail Order", description: "Ship from the mail-order pharmacy.", data: { pricingOption: "mail_order" } },
    {
      id: "self_pay",
      label: "Self-pay",
      description: "Cash pay through CoAssist's own pharmacy. The patient accepts the offer first.",
      data: { pricingOption: "self_pay" },
      // A pin lands the patient on the offer screen. Accepting it is what picks self-pay.
      confirm: true,
    },
  ],
};

/**
 * Copay is two decisions. First the patient enrolls in the copay program or does not. `enroll` only unlocks the
 * reduced price. The patient still picks Retail or Mail Order next. `decline` means they went straight to a pick.
 */
export const COPAY_FORK: ForkDefinition = {
  id: "copay",
  label: "Copay program",
  chooser: "patient",
  scenarios: ["CoA_Copay"],
  resolved: (d) => d.copayEnrolled || d.pricingOption !== null,
  picked: (d) => (d.copayEnrolled ? "enroll" : d.pricingOption !== null ? "decline" : null),
  exits: [
    { id: "enroll", label: "Enroll", description: "Enroll for the reduced price.", data: { copayEnrolled: true } },
    { id: "decline", label: "Decline", description: "Pay the full price.", data: {} },
  ],
};

export const COPAY_PRICING_FORK: ForkDefinition = {
  id: "pricing",
  label: "Pricing option",
  chooser: "patient",
  scenarios: ["CoA_Copay"],
  resolved: (d) => d.pricingOption !== null,
  picked: (d) => d.pricingOption,
  exits: [
    { id: "retail", label: "Retail", description: "Fill at a retail pharmacy. No address or ship date.", data: { pricingOption: "retail" } },
    { id: "mail_order", label: "Mail Order", description: "Ship from the mail-order pharmacy.", data: { pricingOption: "mail_order" } },
  ],
};

export const COASSIST_FORKS: ForkDefinition[] = [
  BI_FORK,
  PA_FORK,
  DTP_PRICING_FORK,
  COPAY_FORK,
  COPAY_PRICING_FORK,
];

/** True when a pin names a pricing exit the patient still has to confirm on its own screen (the self-pay offer). */
export const pricingPinNeedsConfirm = (d: { flowType: FlowType; choices?: Record<string, string> }): boolean =>
  !!pricingForkFor(d.flowType)?.exits.find((e) => e.id === d.choices?.pricing)?.confirm;

/** The pricing fork that applies to a scenario, or undefined when it has none (DME). */
export const pricingForkFor = (flowType: FlowType): ForkDefinition | undefined =>
  COASSIST_FORKS.find((f) => f.id === "pricing" && forkApplies(f, flowType));

/**
 * The BI fork for a scenario: the shared exits, with the rungs that scenario owns (BI_STAGES). A scenario with no
 * rungs gets the shared fork as is.
 */
const BI_FORKS: Partial<Record<FlowType, ForkDefinition>> = {};
export const biForkFor = (flowType: FlowType): ForkDefinition => {
  const stages = BI_STAGES[flowType];
  if (!stages) return BI_FORK;
  return (BI_FORKS[flowType] ??= {
    ...BI_FORK,
    stagesBefore: stages.before,
    exits: BI_FORK.exits.map((e) => ({ ...e, stages: stages.exits[e.id] })),
  });
};
