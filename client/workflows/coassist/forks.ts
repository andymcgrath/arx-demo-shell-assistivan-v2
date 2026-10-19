import type { FlowType } from "@/engine/types";
import type { ForkDefinition, StageEvent } from "@/engine/workflow/types";
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
 * CoA_DME benefits investigation. One BI resolves to one of three coverage outcomes. The presenter picks
 * it on the CRM, or a demo in the brand file starts with it chosen. Medical benefit always wins when covered.
 */
export const DME_BI_FORK: ForkDefinition = {
  id: "bi",
  label: "Benefits investigation result",
  chooser: "presenter",
  scenarios: ["CoA_DME"],
  stagesBefore: [
    { label: "Referral Received", events: [] },
    { label: "Patient Enrolled", events: ENROLL_AND_VERIFY },
    { label: "Benefits Investigation", events: [] },
  ],
  resolved: (d) => d.biStatus === "complete",
  exits: [
    {
      id: "pharmacy_covered",
      label: "Pharmacy Coverage",
      description: "The pharmacy benefit covers it and needs a PA. The patient picks a network pharmacy.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered" },
      stages: [
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
    },
    {
      id: "pharmacy_transfer",
      label: "Pharmacy Transfer",
      description:
        "The pharmacy benefit covers it and the PA starts on its own. The patient does not choose a pharmacy. The Rx transfers to an assigned one and the patient sees its contact details.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "not_covered", pharmacyAssigned: true },
      stages: [
        { label: "Pharmacy Coverage Confirmed (PA submitted)", events: [completeBi("covered", "not_covered")] },
        { label: "PA Approved", events: [ev("APPROVE_PA", "crm")] },
        {
          label: "Patient Verified, Rx Transferred",
          events: [ev("VERIFY_PA_APPROVED_SMS", "patient"), ev("VERIFY_PA_APPROVED_OTP", "patient")],
        },
      ],
    },
    {
      id: "covered_by_both",
      label: "Covered by Both",
      description: "The medical benefit covers it. The case transfers to an outside DME provider.",
      data: { pharmacyBenefitStatus: "covered", medicalBenefitStatus: "covered" },
      stages: [
        { label: "Medical Coverage Confirmed (transfer to DME provider)", events: [completeBi("covered", "covered")] },
        { label: "DME Provider Notified", events: [ev("NOTIFY_PROVIDER_TRANSFER", "crm")] },
        { label: "Transfer SMS Confirmed", events: [ev("VERIFY_DME_TRANSFER_SMS", "patient")] },
      ],
    },
    {
      id: "no_coverage",
      label: "No Coverage (Cash)",
      description: "Neither benefit covers it. The patient gets a cash offer.",
      data: { pharmacyBenefitStatus: "not_covered", medicalBenefitStatus: "not_covered" },
      stages: [
        { label: "No Coverage Confirmed (cash offer SMS sent)", events: [completeBi("not_covered", "not_covered")] },
        { label: "Cash Option Chosen", events: [ev("VERIFY_CASH_OFFER_SMS", "patient"), ev("SELECT_SELF_PAY", "patient")] },
        { label: "Cash Payment Verified", events: [ev("PATIENT_PAYS", "patient"), ev("VERIFY_PAYMENT", "crm")] },
        { label: "Delivery Address & Date Set", events: [ev("PATIENT_SETS_ADDRESS", "patient"), ev("PATIENT_SELECTS_SHIP_DATE", "patient")] },
        ...fulfillment("Rx Processing"),
      ],
    },
  ],
};

/**
 * BI for DTP and Copay. The result decides whether a PA is needed: only `coverage_found` submits one.
 * The story picks it. No presenter button, so the demo's behavior is the same as before the fork existed.
 * `no_coverage` is reachable by event only. The patient app has no screens for it yet, so a recipe that picks
 * it must include `cash_offer`.
 */
export const STANDARD_BI_FORK: ForkDefinition = {
  id: "bi",
  label: "Benefits investigation result",
  chooser: "story",
  scenarios: ["CoA_DTP", "CoA_Copay"],
  resolved: (d) => d.biStatus === "complete",
  exits: [
    {
      id: "coverage_found",
      label: "Coverage found",
      description: "Coverage is found and a PA is required.",
      data: { biResult: "coverage_found" },
    },
    {
      id: "no_coverage",
      label: "No coverage",
      description: "No coverage is found. No PA is submitted.",
      data: { biResult: "no_coverage" },
      requires: ["cash_offer"],
    },
  ],
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

export const COASSIST_FORKS: ForkDefinition[] = [DME_BI_FORK, STANDARD_BI_FORK, PA_FORK];

/** The BI fork that applies to a scenario. DME has its own, so this reads the declarations and not the flow type. */
export const biForkFor = (flowType: FlowType): ForkDefinition =>
  COASSIST_FORKS.find((f) => f.id === "bi" && forkApplies(f, flowType)) ?? STANDARD_BI_FORK;
