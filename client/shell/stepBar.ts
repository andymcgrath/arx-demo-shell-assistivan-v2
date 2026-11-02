/**
 * stepBar.ts: the shell step bar's labels, per-step done flags, and current step, as a pure function of the
 * flow and its workflowData. No store, no actor, no React. DemoShell's StepBar() draws what this returns.
 *
 * The label sets and done functions moved here from DemoShell.tsx unchanged (rule 7 cleanup, step 53), so
 * `engine/__tests__/stepBar.test.ts` pins them against a fixture.
 */
import type { WorkflowData } from "@/engine/types";
import { scenarioFacts } from "@/workflows/scenarioFacts";
import { pspStepBar } from "./pspStepBar";
import { isBuyAndBillScenario } from "./buyAndBillLadders";

export const STEP_LABELS_DEFAULT = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "Prior Authorization",
  "Triage to Pharmacy",
  "Rx Processing",
  "Rx Shipped",
  "Medication Delivered",
];

// Dispense tail reuses WF1's exact four labels — WF2 has no traditional PA
// (Prior Authorization is replaced by "PAP Enrolled," the eIncome/PAP
// milestone), but once CRM dispatches to a pharmacy the rest is driven by
// the same pharmacyStatus states WF1 uses (see WorkflowEngine.ts's
// Fax_PAP_Audit branch), so "Triage to Pharmacy / Rx Processing / Rx
// Shipped / Medication Delivered" describes it accurately — unlike the
// "First Dispense / Audit Initiated / PA Approved" labels this replaced,
// which didn't correspond to anything the demo actually does (no audit or
// PA ever runs for this flow).
export const STEP_LABELS_PAP_AUDIT = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "PAP Enrolled",
  "Triage to Pharmacy",
  "Rx Processing",
  "Rx Shipped",
  "Medication Delivered",
];

// WF5 (iAssist_PAP) — WF4's STEP_LABELS_DEFAULT with one extra "Appeal"
// milestone inserted after Prior Authorization (matching this flow's
// denied-PA-then-appeal path — see computeIAssistPapStepDone above), but
// WITHOUT WF4's Rx Processing/Rx Shipped/Medication Delivered tail: WF5
// dispenses "Keanu to facility" (a site of care, not a pharmacy shipment —
// see crm/pages/Index.tsx's SITES_OF_CARE/officeDispenseOptions), so
// "Triage to Pharmacy" is this flow's final, terminal step.
export const STEP_LABELS_IASSIST_PAP = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "Prior Authorization",
  "Appeal",
  "Triage to Pharmacy",
];

// Buy and Bill: the HCP buys and bills, so there is no triage, order, or tracking. The bar ends at the PA decision.
export const STEP_LABELS_BUY_AND_BILL = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "Prior Authorization",
];

// Free drug (PAP): no PA. The bar ends when the application is approved and the order goes to the site of care.
export const STEP_LABELS_FREE_DRUG = [
  "Referral Received",
  "Patient Enrolled",
  "Benefits Investigation",
  "Free Drug Application",
  "Triage to Site of Care",
];

// "Copay Enrollment" and "Patient Payment" used to be two separate steps,
// but Benefit Pricing covers Retail/Mail/Copay uniformly now (see
// BenefitPricing.tsx) — there's no distinct "enrollment" milestone that
// applies to all three pricing paths, just one "Payment" phase that runs
// from PA approval through the actual charge. Merged into a single step so
// the bar doesn't show enrollment as a separate, checkable milestone that
// doesn't apply to two-thirds of patients.
// "Prior Authorization" gets its own step (CoA_DTP does go through a real
// PA submission/approval cycle — see coaDtp.ts's paSubmitted/paApproved
// states), and the dispense tail reuses WF1's exact four labels since
// CoA_DTP's rxProcessing/rxReady/rxShipped/rxDelivered states now mirror
// WF1's order sub-machine one-for-one (see coaDtp.ts's READY_RX handling).
export const STEP_LABELS_COA = [
  "eRx Received",
  "Consent",
  "Benefits Investigation",
  "Prior Authorization",
  "Payment",
  "Triage to Pharmacy",
  "Rx Processing",
  "Rx Shipped",
  "Medication Delivered",
];

// CoA_Copay's Retail and Mail Order paths (pricingOption === "retail" or
// "mail_order", see isCopayRetailFlow in StepBar below and
// crm/pages/Index.tsx's own isCopayRetailFlow) — STEP_LABELS_COA's exact
// same first six labels, but without the Rx Processing/Rx Shipped/
// Medication Delivered tail. Same reasoning as STEP_LABELS_IASSIST_PAP
// dropping that tail for its own out-of-pipeline dispense: both are filled
// outside AssistRx's own dispensing pipeline (a retail counter, or the
// mail-order pharmacy's own facility), so "Triage to Pharmacy" is this
// path's final, terminal step either way. CoA_DTP keeps the full 9-step
// STEP_LABELS_COA bar.
export const STEP_LABELS_COA_COPAY_RETAIL = [
  "eRx Received",
  "Consent",
  "Benefits Investigation",
  "Prior Authorization",
  "Payment",
  "Triage to Pharmacy",
];

// CoA_Coverage (one Benefits Investigation, three coverage outcomes — see
// workflows/coassist/'s header comment) — mirrors CoA_DTP's own
// STEP_LABELS_COA bar (same "eRx Received"/"Consent" naming, same
// eRx-to-fulfillment shape), just without a Prior Authorization step at all
// — only Scenario 3 (neither covered, cash pay) never submits one; Scenario
// 1 (pharmacy covered) now does, see STEP_LABELS_COVERAGE_PHARMACY below. Used
// for Scenario 3 only now (neither covered, cash pay) — Scenario 1 (pharmacy
// covered) has its own, shorter STEP_LABELS_COVERAGE_PHARMACY bar below. Scenario
// 2 (medical covered) is a completely different, much shorter path — see
// STEP_LABELS_COVERAGE_MEDICAL below — swapped in once medicalBenefitStatus
// resolves to "covered" (see isCoverageMedicalFlow in StepBar below), the same
// way isCopayRetailFlow swaps in STEP_LABELS_COA_COPAY_RETAIL once
// CoA_Copay's own pricingOption resolves.
export const STEP_LABELS_COVERAGE = [
  "eRx Received",
  "Consent",
  "Benefits Investigation",
  "Payment",
  "Triage to Pharmacy",
  "Rx Processing",
  "Rx Shipped",
  "Medication Delivered",
];

// CoA_Coverage Scenario 1 only (pharmacyBenefitStatus === "covered",
// medicalBenefitStatus !== "covered") — this outcome now requires a real
// Prior Authorization (mirroring CoA_DTP's own submit/auto-approve/SMS+OTP
// re-verify pattern, no denial branch — see workflows/coassist/'s header comment and
// its paSubmitted/paApproved/paApprovedSmsVerified/paApprovedOtpVerified
// states), then the patient picks a network pharmacy, and fulfillment
// happens outside AssistRx's own pipeline from there — same shape as
// STEP_LABELS_COA_COPAY_RETAIL's own 6-step, Triage-to-Pharmacy-terminal bar,
// just with this flow's own step names. This replaces the scenario's old
// single automatic tap-through SMS milestone ("Patient Notification")
// entirely.
export const STEP_LABELS_COVERAGE_PHARMACY = [
  "eRx Received",
  "Consent",
  "Benefits Investigation",
  "Prior Authorization",
  "Pharmacy Selection",
  "Triage to Pharmacy",
];

// CoA_Coverage Scenario 2 only (medicalBenefitStatus === "covered", medical
// benefit always wins — see workflows/coassist/) — this outcome ends the
// moment CoAssist notifies the outside provider (Advanced Diabetes
// Supply) of the transfer, so it never reaches Payment/Dispatch/fulfillment
// at all. Same first 3 steps as STEP_LABELS_COVERAGE above (eRx Received/
// Consent/Benefits Investigation sit at the same positions in both bars),
// just a different, terminal 4th step instead of continuing on.
export const STEP_LABELS_COVERAGE_MEDICAL = [
  "eRx Received",
  "Consent",
  "Benefits Investigation",
  "Provider Transfer",
];

// CoA_DTP-specific step calculation — the generic one below was tuned for
// WF1's fields (dispatchStatus/paStatus meaning "pharmacy dispatch") and,
// applied to CoA's different fields, jumped straight to a late step number
// the instant PA was approved — checking off "Payment" (and, before this
// merge, "Copay Enrollment") before the patient had even opened Benefit
// Pricing. This mirrors coaDtp.ts's real milestones instead.
export function computeCoaWorkflowStep(workflowData: WorkflowData): number {
  const { pharmacyStatus, biStatus, consentStatus, enrollmentStatus, paStatus, cashOfferStatus, patientShipDate } = workflowData;
  // No pricing option collects payment through this flow anymore — Retail/
  // Mail never did (cost is handled at the pharmacy counter), and testing
  // confirmed Copay/self-pay doesn't either (enrollment at /copay-enroll
  // only unlocks the reduced price). So a ship date alone means Payment is
  // done, for all three options uniformly.
  const paymentDone = patientShipDate !== null;
  // Mirrors WF1's own "pa === 'approved'" threshold below — a denial alone
  // doesn't move things forward (WF1 groups submitted+denied into the same
  // Prior Authorization step); only once the cash-offer alternative is
  // actually in motion (SEND_CASH_OFFER) does the denied path count as
  // "PA resolved" and advance into Payment.
  const paResolved = paStatus === 'approved' || cashOfferStatus !== 'none';

  if (pharmacyStatus === 'delivered') return 10;
  if (pharmacyStatus === 'shipped') return 8;
  // Matches WF1's own step bar, which collapses pharmacyStatus
  // "processing" and "ready" into the same "Rx Processing" step — see the
  // generic workflowStep calculation below.
  if (pharmacyStatus === 'processing' || pharmacyStatus === 'ready') return 7;
  if (paymentDone) return 6;
  if (paResolved) return 5;
  if (biStatus === 'complete') return 4;
  if (biStatus === 'running' || biStatus === 'submitted') return 3;
  if (consentStatus === 'confirmed') return 3;
  if (enrollmentStatus !== 'none') return 2;
  return 1;
}

// CoA_DTP/CoA_Copay (WF3/WF4) per-step completion — Benefits Investigation no
// longer waits on patient consent (business rule change: BI can run off the
// referral/eRx alone — see coaDtp.ts/coaCopay.ts's RUN_BI handlers and
// crm/pages/Index.tsx's isCoaFlow-scoped auto-trigger effect), so BI can now
// finish well before the patient has even verified their SMS, let alone
// confirmed consent. computeCoaWorkflowStep's single scalar above can't
// represent that gap without lying — returning 4 for "BI complete" also
// silently marks "Consent" (step 2) as checked off, even when the patient
// hasn't actually done it yet. This is the same problem
// computeIAssistStepDone below already solved for iAssist's own BI/PA race
// ahead of consent — same per-step boolean pattern, applied here to CoA's
// 9-step (or, for CoA_Copay Retail/Mail Order, 6-step truncated — see
// STEP_LABELS_COA_COPAY_RETAIL) bar instead. computeCoaWorkflowStep itself is
// left in place rather than removed — same as how it coexists unused
// alongside iAssistStepDone for iAssist flows below — StepBar prefers this
// array whenever isCoaFlow is true.
export function computeCoaStepDone(workflowData: WorkflowData): boolean[] {
  const { enrollmentStatus, consentStatus, biStatus, paStatus, cashOfferStatus, patientShipDate, pharmacyStatus } = workflowData;
  // Matches computeCoaWorkflowStep's own thresholds exactly — see that
  // function's comments for why each one is defined the way it is.
  const paResolved = paStatus === 'approved' || cashOfferStatus !== 'none';
  const paymentDone = patientShipDate !== null;
  // CoA_Copay's Retail/Mail Order paths flip pharmacyStatus to "processing"
  // via the exact same FILL_RX handler every other pricing option uses (see
  // coaCopay.ts) — the CRM just doesn't show a separate Pharmacy Status tab
  // for them (see isCopayRetailFlow in crm/pages/Index.tsx). So a single
  // pharmacyStatus check works uniformly for every pricing option here, with
  // no special-casing needed for Retail/Mail Order.
  const dispatched = pharmacyStatus !== 'none';
  return [
    enrollmentStatus !== 'none',                                     // 1 eRx Received
    consentStatus === 'confirmed',                                   // 2 Consent
    biStatus === 'complete',                                         // 3 Benefits Investigation
    paResolved,                                                      // 4 Prior Authorization
    paymentDone,                                                     // 5 Payment
    dispatched,                                                      // 6 Triage to Pharmacy
    pharmacyStatus === 'shipped' || pharmacyStatus === 'delivered',  // 7 Rx Processing
    pharmacyStatus === 'delivered',                                  // 8 Rx Shipped
    pharmacyStatus === 'delivered',                                  // 9 Medication Delivered
  ];
}

// CoA_Coverage (medical-benefit coverage) per-step completion — same "BI can race
// ahead of consent" reasoning as computeCoaStepDone above (CoA_Coverage's own
// RUN_BI fires off enrollment alone, see crm/pages/Index.tsx's isCoverageFlow-
// scoped effect), applied to this flow's own 3-step bar (STEP_LABELS_COVERAGE)
// instead of CoA_DTP's 9-step one. Step 1 (Enrollment) is judged on real
// consent, not just an invite sent — matches computeIAssistStepDone's own
// "Patient Enrolled" step for the same reason.
export function computeCoverageStepDone(workflowData: WorkflowData): boolean[] {
  const { enrollmentStatus, consentStatus, biStatus, medicalBenefitStatus, pharmacyBenefitStatus, providerTransferStatus, pricingOption, paymentVerified, pharmacyStatus, paStatus } = workflowData;

  // Scenario 2 — medical benefit covered (always wins). Same first-3-step
  // shape as the branches below, but its own short, terminal bar (see
  // STEP_LABELS_COVERAGE_MEDICAL).
  if (medicalBenefitStatus === 'covered') {
    return [
      enrollmentStatus !== 'none',               // 1 eRx Received
      consentStatus === 'confirmed',              // 2 Consent
      biStatus === 'complete',                    // 3 Benefits Investigation
      providerTransferStatus === 'notified',   // 4 Provider Transfer
    ];
  }

  // Scenario 1 — pharmacy covered, medical not. Requires a real PA now (see
  // workflows/coassist/'s header comment); Step 4 is judged on paStatus === 'approved'
  // (always true once reached, per the confirmed no-denial design) instead
  // of this outcome's old single tap-through SMS flag. Once approved, the
  // patient picks a network pharmacy, then this mirrors CoA_Copay Retail's
  // own short, Triage-to-Pharmacy-terminal bar (see STEP_LABELS_COVERAGE_PHARMACY/
  // computeCoaStepDone's own isCopayRetailFlow shape for the analogous
  // "dispatched" signal).
  if (pharmacyBenefitStatus === 'covered') {
    return [
      enrollmentStatus !== 'none',       // 1 eRx Received
      consentStatus === 'confirmed',     // 2 Consent
      biStatus === 'complete',           // 3 Benefits Investigation
      paStatus === 'approved',           // 4 Prior Authorization
      pricingOption !== null,            // 5 Pharmacy Selection
      pharmacyStatus !== 'none',         // 6 Triage to Pharmacy
    ];
  }

  // Scenario 3 — neither covered, cash pay. Same 8-step shape as CoA_DTP's
  // own computeCoaStepDone, minus the Prior Authorization slot this flow
  // never has. This outcome's pricingOption is always "self_pay," so
  // Payment is judged on real payment verification, not a ship date.
  const dispatched = pharmacyStatus !== 'none';
  return [
    enrollmentStatus !== 'none',                                     // 1 eRx Received
    consentStatus === 'confirmed',                                   // 2 Consent
    biStatus === 'complete',                                         // 3 Benefits Investigation
    paymentVerified,                                                 // 4 Payment
    dispatched,                                                      // 5 Triage to Pharmacy
    pharmacyStatus === 'shipped' || pharmacyStatus === 'delivered',  // 6 Rx Processing
    pharmacyStatus === 'delivered',                                  // 7 Rx Shipped
    pharmacyStatus === 'delivered',                                  // 8 Medication Delivered
  ];
}

// iAssist-specific step completion — unlike WF1/WF2/CoA (where consent,
// BI, and PA naturally happen in that order, so a single "how far along"
// number works), iAssist's Rx submission auto-completes BI and auto-submits
// PA immediately (see iAssist.ts's REFERRAL_RECEIVED handlers on those regions),
// independent of and often well ahead of the patient's own SMS/OTP/consent
// progress. A single scalar workflowStep can't represent "PA already
// submitted, but the patient hasn't consented yet" — the generic threshold
// calc below would (wrongly) mark Patient Enrolled/Benefits Investigation as
// done just because a later field advanced. Each step here is judged only
// by its own field, so the bar can show gaps instead of lying about them.
export function computeIAssistStepDone(workflowData: WorkflowData): boolean[] {
  const { enrollmentStatus, consentStatus, biStatus, paStatus, dispatchStatus, pharmacyStatus } = workflowData;
  const dispatched = dispatchStatus === 'selected' || dispatchStatus === 'dispatched';
  const pastDispatch = pharmacyStatus === 'processing' || pharmacyStatus === 'ready' || pharmacyStatus === 'shipped' || pharmacyStatus === 'delivered';
  return [
    enrollmentStatus !== 'none',                 // 1 Referral Received
    consentStatus === 'confirmed',                // 2 Patient Enrolled — real consent, not just an invite sent
    biStatus === 'complete',                      // 3 Benefits Investigation
    paStatus === 'approved',                      // 4 Prior Authorization — "submitted" alone isn't done yet
    dispatched || pastDispatch,                   // 5 Triage to Pharmacy
    pharmacyStatus === 'shipped' || pharmacyStatus === 'delivered', // 6 Rx Processing
    pharmacyStatus === 'delivered',                // 7 Rx Shipped
    pharmacyStatus === 'delivered',                // 8 Medication Delivered
  ];
}

// WF5 (iAssist_PAP) variant of computeIAssistStepDone above — identical
// except it inserts its own "Appeal" milestone right after Prior
// Authorization, and has no dispense tail at all: WF5 dispenses "Keanu to
// facility" (a site of care, not a pharmacy shipment), so "Triage to
// Pharmacy" (step 6) is this flow's final step — it never touches
// pharmacyStatus. Step 4 (Prior Authorization) is judged as "resolved" on
// denial, not approval — this flow's PA never reaches 'approved' (see
// workflows/iassist/rules.ts) — and step 5 only ticks once the Appeal is
// actually filed (appealStatus, INITIATE_APPEAL), which is also what
// unlocks dispatch/fulfillment here.
export function computeIAssistPapStepDone(workflowData: WorkflowData): boolean[] {
  const { enrollmentStatus, consentStatus, biStatus, paStatus, appealStatus, dispatchStatus } = workflowData;
  const dispatched = dispatchStatus === 'selected' || dispatchStatus === 'dispatched';
  return [
    enrollmentStatus !== 'none',                  // 1 Referral Received
    consentStatus === 'confirmed',                 // 2 Patient Enrolled
    biStatus === 'complete',                       // 3 Benefits Investigation
    paStatus === 'denied' || paStatus === 'approved', // 4 Prior Authorization — this flow resolves to denied
    // Only 'approved' counts as done — per request, this step shouldn't
    // check off just because the appeal was sent (appealStatus ===
    // 'initiated'); it should wait for the payer response (see
    // workflows/iassist/rules.ts's APPROVE_APPEAL). While 'initiated', StepBar
    // below gives it the same pending/pulsing treatment as Prior
    // Authorization while awaiting its own response.
    appealStatus === 'approved',                   // 5 Appeal
    dispatched,                                    // 6 Triage to Pharmacy — final step, ticks once a site of care is selected
  ];
}

export function computeBuyAndBillStepDone(workflowData: WorkflowData): boolean[] {
  const { enrollmentStatus, consentStatus, biStatus, paStatus } = workflowData;
  return [
    enrollmentStatus !== 'none',     // 1 Referral Received
    consentStatus === 'confirmed',   // 2 Patient Enrolled
    biStatus === 'complete',         // 3 Benefits Investigation
    paStatus === 'approved',         // 4 Prior Authorization
  ];
}

export function computeFreeDrugStepDone(workflowData: WorkflowData): boolean[] {
  const { enrollmentStatus, consentStatus, biStatus, papStatus, dispatchStatus } = workflowData;
  return [
    enrollmentStatus !== 'none',     // 1 Referral Received
    consentStatus === 'confirmed',   // 2 Patient Enrolled
    biStatus === 'complete',         // 3 Benefits Investigation
    papStatus === 'active',          // 4 Free Drug Application
    dispatchStatus === 'selected' || dispatchStatus === 'dispatched', // 5 Triage to Site of Care
  ];
}


export interface StepBarModel {
  labels: string[];
  /** Per-step done flags, or null when the bar derives done from `workflowStep`. */
  stepDone: boolean[] | null;
  workflowStep: number;
  /** The "Pending…" ring on step 4 applies while the PA is submitted. False for the flows that run no PA. */
  paRingApplies: boolean;
  /** True when the bar ends at Triage to Pharmacy, so the Rx rings must not land on its last dot. */
  rxRingsOff: boolean;
  /** The 1-based step the "Processing…" and "In Transit…" rings sit on, or 0 when the bar has no such step. */
  rxProcessingStepN: number;
  /** The 1-based step the "Shipping…" ring sits on, or 0 when the bar has no such step. */
  rxShippedStepN: number;
}

/** The 1-based position of a labelled step, or 0 when the bar has none. */
const stepNumberOf = (labels: string[], label: string): number => labels.indexOf(label) + 1;

export function stepBarModel(flowType: string, workflowData: WorkflowData): StepBarModel {
  const facts = scenarioFacts(flowType);
  // The patient picks a pricing option: CoA_DTP and CoA_Copay.
  const isCoaFlow = facts.hasPricingFork;
  // Covers both Retail and Mail Order: both end at Triage to Pharmacy (see derivePatientRoute).
  const isCopayRetailFlow = facts.isCopayRetail(workflowData.pricingOption);
  // Covers WF4 and WF5 (iAssist_PAP). WF5 uses its own computeIAssistPapStepDone, with an extra "Appeal" step.
  const isIAssistFlow = facts.isIassistSource;
  const isIAssistPapFlow = facts.isIassistAppeal;
  const isCoverageFlow = facts.isCoverageScenario;
  // Scenario 2 only: the short, terminal bar once medicalBenefitStatus resolves to "covered" (medical always wins).
  const isCoverageMedicalFlow = isCoverageFlow && workflowData.medicalBenefitStatus === "covered";
  // Scenario 1 only: the short, Triage-to-Pharmacy-terminal bar. The full bar then applies to Scenario 3 only.
  const isCoveragePharmacyFlow = isCoverageFlow && workflowData.pharmacyBenefitStatus === "covered" && workflowData.medicalBenefitStatus !== "covered";
  const isBuyAndBill = isBuyAndBillScenario(flowType);
  const isFreeDrug = facts.isFreeDrug;
  const iAssistStepDone = isBuyAndBill
    ? computeBuyAndBillStepDone(workflowData)
    : isFreeDrug
    ? computeFreeDrugStepDone(workflowData)
    : isIAssistPapFlow
    ? computeIAssistPapStepDone(workflowData)
    : isIAssistFlow
    ? computeIAssistStepDone(workflowData)
    : null;
  // See computeCoaStepDone's header comment: BI can race ahead of consent.
  const coaStepDone = isCoaFlow ? computeCoaStepDone(workflowData) : null;
  const coverageStepDone = isCoverageFlow ? computeCoverageStepDone(workflowData) : null;
  const pspBar = pspStepBar(flowType);
  const stepDone = pspBar ? pspBar.map((step) => step.done(workflowData)) : (iAssistStepDone ?? coaStepDone ?? coverageStepDone);

  const workflowStep = isCoaFlow ? computeCoaWorkflowStep(workflowData) : (() => {
    const p = workflowData.pharmacyStatus;
    const d = workflowData.dispatchStatus;
    const pa = workflowData.paStatus;
    const bi = workflowData.biStatus;
    const consent = workflowData.consentStatus;
    const enrollment = workflowData.enrollmentStatus;

    if (p === 'delivered') return 9;
    if (p === 'shipped') return 7;
    if (p === 'processing' || p === 'ready') return 6;
    if (d === 'pending_selection' || d === 'selected' || d === 'dispatched') return 5;
    if (pa === 'approved') return 5;
    if (pa === 'submitted' || pa === 'denied') return 4;
    if (bi === 'running' || bi === 'submitted') return 3;
    if (bi === 'complete') return 4;
    if (consent === 'confirmed') return 3;
    if (enrollment === 'enrolled') return 2;
    return 1;
  })();

  const labels = pspBar ? pspBar.map((step) => step.label)
    : isBuyAndBill ? STEP_LABELS_BUY_AND_BILL
    : isFreeDrug ? STEP_LABELS_FREE_DRUG
    : facts.isNoPaIntake ? STEP_LABELS_PAP_AUDIT
    : isCopayRetailFlow ? STEP_LABELS_COA_COPAY_RETAIL
    : isCoaFlow ? STEP_LABELS_COA
    : isCoverageMedicalFlow ? STEP_LABELS_COVERAGE_MEDICAL
    : isCoveragePharmacyFlow ? STEP_LABELS_COVERAGE_PHARMACY
    : isCoverageFlow ? STEP_LABELS_COVERAGE
    : isIAssistPapFlow ? STEP_LABELS_IASSIST_PAP
    : STEP_LABELS_DEFAULT;

  // The rings follow the bar's own steps. The patient support program bar has no Rx steps: its Delivery step covers
  // both. The iAssist appeal bar keeps its ring on the last dot, as it always has (it has no Rx steps either).
  const pspTransitStep = pspBar ? pspBar.findIndex((step) => step.rxInTransit) + 1 : 0;
  const rx = pspTransitStep
    ? { processing: pspTransitStep, shipped: pspTransitStep }
    : labels === STEP_LABELS_IASSIST_PAP
    ? { processing: labels.length, shipped: 0 }
    : { processing: stepNumberOf(labels, "Rx Processing"), shipped: stepNumberOf(labels, "Rx Shipped") };

  return {
    labels,
    stepDone,
    workflowStep,
    // Only paProcessing stays WF1/CoA-only: Fax_PAP_Audit and PrES_PAP never leave paStatus "none".
    paRingApplies: !facts.isNoPaIntake,
    rxRingsOff: isCoveragePharmacyFlow,
    rxProcessingStepN: rx.processing,
    rxShippedStepN: rx.shipped,
  };
}
