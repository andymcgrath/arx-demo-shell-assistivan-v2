import type { ForkDefinition, StageEvent } from "@/engine/workflow/types";

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

export const COASSIST_FORKS: ForkDefinition[] = [DME_BI_FORK];
