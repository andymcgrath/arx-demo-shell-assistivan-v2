import type { FlowType, WorkflowData } from "@/engine/types";
import type { ForkDefinition, ForkStage, StageEvent } from "@/engine/workflow/types";
import { forkApplies } from "@/engine/workflow/forks";
import { biFork } from "../shared/bi";

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
const COVERAGE_DEFAULT_PHARMACY = {
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
 * The benefits investigation, one fork for every CoAssist scenario, built from the shared BI catalog
 * (workflows/shared/bi.ts). The story, or a demo in the brand file, picks the exit. Medical benefit wins when covered.
 *
 * An exit `requires` the modules its branch needs, so a recipe that lacks them cannot pick it. The rungs after the
 * fork belong to the scenario (see BI_STAGES), because the journey after the same exit differs between scenarios.
 */
export const BI_FORK: ForkDefinition = biFork({
  scenarios: ["CoA_DTP", "CoA_Copay", "CoA_Web_Copay", "CoA_Coverage", "CoA_Medical_Transfer", "CoA_PAP", "CoA_APA_Specialty", "CoA_Web_PAP"],
  exits: [{ id: "pharmacy_covered" }, { id: "pharmacy_transfer" }, { id: "medical_covered" }, { id: "medical_pa_required" }, { id: "no_coverage" }, { id: "no_coverage_pap" }],
});

/**
 * The stage-jump rungs after the `bi` fork, owned by the scenario and keyed by exit id. A scenario with no table
 * here has no rungs for the fork (DTP and Copay keep their hand-built ladder in shell/coassistLadders.ts).
 */
const BI_STAGES: Partial<Record<FlowType, { before: ForkStage[]; exits: Record<string, ForkStage[]> }>> = {
  CoA_Coverage: {
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
            ev("SELECT_PHARMACY", "patient", { pharmacy: COVERAGE_DEFAULT_PHARMACY }),
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
        { label: "Medical Coverage Confirmed (transfer to Provider)", events: [completeBi("covered", "covered")] },
        { label: "Provider Notified", events: [ev("NOTIFY_PROVIDER_TRANSFER", "crm")] },
        { label: "Transfer SMS Confirmed", events: [ev("VERIFY_PROVIDER_TRANSFER_SMS", "patient")] },
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
  // APA with the pharmacy the prescriber picked on the eRx. The prescriber's form starts the PA, the patient schedules the
  // delivery after the approval, and the agent dispatches in the CRM. No pricing and no payment.
  CoA_APA_Specialty: {
    before: [
      { label: "Referral Received", events: [] },
      { label: "Patient Enrolled", events: ENROLL_AND_VERIFY },
      { label: "Benefits Investigation", events: [] },
    ],
    exits: {
      pharmacy_covered: [
        { label: "Pharmacy Coverage Confirmed (PA form emailed to the prescriber)", events: [completeBi("covered", "not_covered")] },
        {
          label: "Prescriber Submitted the PA Form",
          events: [ev("OPEN_PA_FORM_LINK", "provider"), ev("VERIFY_PRESCRIBER", "provider", { npi: "1234567890", pin: "4321" }), ev("SUBMIT_PA_FORM", "provider")],
        },
        { label: "PA Approved, Patient Verified", events: [ev("APPROVE_PA", "crm"), ev("VERIFY_PA_APPROVED_SMS", "patient"), ev("VERIFY_PA_APPROVED_OTP", "patient")] },
        { label: "Delivery Address & Date Set", events: [ev("PATIENT_SETS_ADDRESS", "patient"), ev("PATIENT_SELECTS_SHIP_DATE", "patient")] },
        ...fulfillment("Rx Processing"),
      ],
    },
  },
  // The web page's free drug program. The page submits, the Gateway releases BI, and the rest is PAP's: the transfer text, the
  // application update text and code, the income form, then the address and date. No enrollment text, code, or consent.
  CoA_Web_PAP: {
    before: [
      { label: "Patient Enrolled", events: [ev("WEB_SUBMIT", "patient")] },
      { label: "Benefits Investigation", events: [] },
    ],
    exits: {
      no_coverage_pap: [
        { label: "No Coverage Confirmed (referred to patient support program)", events: [ev("COMPLETE_BI", "crm")] },
        { label: "Transfer SMS Confirmed", events: [ev("VERIFY_PAP_TRANSFER_SMS", "patient")] },
        { label: "Application Code Confirmed", events: [ev("VERIFY_PAP_OTP", "patient")] },
        { label: "Income Verified", events: [ev("START_INCOME_QUALIFICATION", "patient"), ev("VERIFY_INCOME", "patient")] },
        { label: "Delivery Address & Date Set", events: [ev("PATIENT_SETS_ADDRESS", "patient"), ev("PATIENT_SELECTS_SHIP_DATE", "patient")] },
        ...fulfillment("Rx Processing"),
      ],
    },
  },
  // The free drug program. BI finds no coverage and no PA runs, so the rungs go from the referral to the income form,
  // then the address and date, then fulfillment.
  CoA_PAP: {
    before: [
      { label: "Referral Received", events: [] },
      { label: "Patient Enrolled", events: ENROLL_AND_VERIFY },
      { label: "Benefits Investigation", events: [] },
    ],
    exits: {
      no_coverage_pap: [
        // No statuses on the event: the exit decides. A forced result would drop the assigned pharmacy (resolveBi).
        { label: "No Coverage Confirmed (referred to patient support program)", events: [ev("COMPLETE_BI", "crm")] },
        { label: "Transfer SMS Confirmed", events: [ev("VERIFY_PAP_TRANSFER_SMS", "patient")] },
        { label: "Application Code Confirmed", events: [ev("VERIFY_PAP_OTP", "patient")] },
        { label: "Income Verified", events: [ev("START_INCOME_QUALIFICATION", "patient"), ev("VERIFY_INCOME", "patient")] },
        { label: "Delivery Address & Date Set", events: [ev("PATIENT_SETS_ADDRESS", "patient"), ev("PATIENT_SELECTS_SHIP_DATE", "patient")] },
        ...fulfillment("Rx Processing"),
      ],
    },
  },
};

/**
 * The PA decision, the same fork for every CoAssist scenario. The story picks it, so the decision lands when the
 * agent opens the PA stage. Coverage declares it too and pins `approved`. Its rules do not handle a denial yet, so
 * `denied` requires `cash_offer`. Step 2.4 gives that module the denial rules.
 */
export const PA_FORK: ForkDefinition = {
  id: "pa",
  label: "Prior authorization decision",
  chooser: "story",
  // CoAssist only. Another workflow declares its own `pa` fork, with exits that require its own modules.
  scenarios: ["CoA_DTP", "CoA_Copay", "CoA_Web_Copay", "CoA_Coverage", "CoA_Medical_Transfer", "CoA_APA_Specialty"],
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
 * Coverage has no patient pick here. Its pricing follows the BI exit.
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
  scenarios: ["CoA_Copay", "CoA_Web_Copay"],
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
  scenarios: ["CoA_Copay", "CoA_Web_Copay"],
  resolved: (d) => d.pricingOption !== null,
  picked: (d) => d.pricingOption,
  exits: [
    { id: "retail", label: "Retail", description: "Fill at a retail pharmacy. No address or ship date.", data: { pricingOption: "retail" } },
    { id: "mail_order", label: "Mail Order", description: "Ship from the mail-order pharmacy.", data: { pricingOption: "mail_order" } },
  ],
};

/** The patient's outcome on the assistance fork: PAP is active, copay is enrolled, or the patient chose self-pay. */
export const assistanceOutcomes = (d: WorkflowData): string[] =>
  [d.papStatus === "active" ? "pap" : null, d.copayEnrolled ? "copay" : null, d.pricingOption === "self_pay" ? "self_pay" : null].filter((x): x is string => !!x);

/**
 * Financial assistance: the patient's choice of PAP (the free drug program), the copay program, or self-pay. One fork,
 * and each exit `requires` its block, so the recipe decides which exits exist (the same way `denied` requires `cash_offer`).
 * A recipe with only `income_qualification` offers PAP only. The blocks never know about each other. This fork holds the
 * rule that the patient ends on one outcome (a recipe opts in to more with `assistance.allowMultiple`).
 *
 * PAP is offered after the patient qualifies (`income_qualification` with `activate: "on_choose"`). Qualifying does not commit
 * them: they can still pick copay or self-pay. Copay and self-pay are offered whenever their blocks are in the recipe.
 * The pick is `CHOOSE_ASSISTANCE` with an `option`. It is not written to `choices`: the data already records it.
 *
 * `scenarios` is passed in. No scenario uses the fork until the Abivax recipe lists it.
 */
export const assistanceFork = (scenarios: FlowType[]): ForkDefinition => ({
  id: "assistance",
  label: "Financial assistance",
  chooser: "patient",
  scenarios,
  resolved: (d) => assistanceOutcomes(d).length > 0,
  picked: (d) => assistanceOutcomes(d)[0] ?? null,
  exits: [
    { id: "pap", label: "Free drug program", description: "Qualified for the free drug program (PAP) and chose it.", data: { papStatus: "active" }, requires: ["income_qualification"] },
    { id: "copay", label: "Copay program", description: "Enroll in the copay program for the reduced price.", data: { copayEnrolled: true }, requires: ["financial_assistance:copay"] },
    { id: "self_pay", label: "Self-pay", description: "Pay out of pocket through the cash offer.", data: { pricingOption: "self_pay" }, requires: ["cash_offer:sms"] },
  ],
});

export const ASSISTANCE_FORK: ForkDefinition = assistanceFork([]);

export const COASSIST_FORKS: ForkDefinition[] = [
  BI_FORK,
  PA_FORK,
  DTP_PRICING_FORK,
  COPAY_FORK,
  COPAY_PRICING_FORK,
  ASSISTANCE_FORK,
];

/** True when a pin names a pricing exit the patient still has to confirm on its own screen (the self-pay offer). */
export const pricingPinNeedsConfirm = (d: { flowType: FlowType; choices?: Record<string, string> }): boolean =>
  !!pricingForkFor(d.flowType)?.exits.find((e) => e.id === d.choices?.pricing)?.confirm;

/** The pricing fork that applies to a scenario, or undefined when it has none (Coverage). */
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
    // Only the exits this scenario has rungs for. The others cannot be picked by its recipe.
    exits: BI_FORK.exits.filter((e) => stages.exits[e.id]).map((e) => ({ ...e, stages: stages.exits[e.id] })),
  });
};
