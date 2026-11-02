/**
 * stageAt.ts: which stage of the jump list a case is on. The patient view's phase rail marks it, and guided Next and
 * Back start from it.
 *
 * A stage is reached when the case has done everything that stage's ladder does. So for each stage this replays the
 * ladder on a throwaway machine, keeps the progress it reached, and asks whether the live case is at least that far on
 * every counter. The answer is the last stage reached. A case that got there by another path (the patient did the work, a
 * different order) still counts, because only progress is compared, never the events that made it.
 *
 * Pure apart from the throwaway machine. No store, no React.
 */
import { createActor } from "xstate";
import { workflowRegistry } from "@/engine/WorkflowRegistry";
import type { FlowType, WorkflowData } from "@/engine/types";
import { jumpEvents, stageList } from "./stageJump";

type Choices = Record<string, string> | undefined;

const rank = <T extends string>(order: readonly T[], value: T | undefined): number => Math.max(0, order.indexOf(value as T));
const flag = (v: unknown): number => (v ? 1 : 0);

/** The counters in `progress`, by name, for the ones a rule has to single out. */
export const PROGRESS_NAMES = [
  "enrollment", "sms", "otp", "consent", "bi", "pa", "appeal", "paApprovedSms", "paApprovedOtp", "pricing", "cashOffer",
  "cashOfferSms", "cashOfferSmsVerified", "paymentVerified", "shipDate", "selectedPharmacy", "pharmacyAssigned", "dispatch",
  "pharmacy", "providerNotified", "providerSmsSent", "providerSmsVerified", "pap", "papSms", "papSmsVerified", "papOtp",
  "income", "papTransfer", "copayEnrolled", "copayClaims", "medbv", "infusionDate",
] as const;

/**
 * Counters a case can finish without. The ladder pays for the order and picks an infusion date, but a story that ends at
 * the claim, the transfer, or a date-less pick has not left anything undone. Finishing ignores them.
 */
const OPTIONAL_AT_END = new Set<string>(["cashOffer", "paymentVerified", "infusionDate", "papOtp", "shipDate", "pricing"]);

/** How far along a case is, as counters that only go up. Optional extras (the welcome card, a provider's extra form) are left out. */
export function progress(d: WorkflowData): number[] {
  return [
    rank(["none", "pending", "invited", "enrolled", "completed"], d.enrollmentStatus),
    flag(d.smsVerified),
    flag(d.otpVerified),
    flag(d.consentStatus === "confirmed"),
    rank(["none", "running", "complete"], d.biStatus === "submitted" ? "running" : d.biStatus),
    rank(["none", "submitted", "decided"], d.paStatus === "approved" || d.paStatus === "denied" ? "decided" : d.paStatus),
    rank(["none", "initiated", "approved"], d.appealStatus),
    flag(d.paApprovedSmsVerified),
    flag(d.paApprovedOtpVerified),
    flag(d.pricingOption),
    rank(["none", "sent", "paid"], d.cashOfferStatus),
    flag(d.cashOfferSmsSent),
    flag(d.cashOfferSmsVerified),
    flag(d.paymentVerified),
    flag(d.patientShipDate),
    flag(d.selectedPharmacy),
    flag(d.pharmacyAssigned),
    rank(["none", "pending_selection", "selected", "dispatched"], d.dispatchStatus),
    rank(["none", "processing", "ready", "shipped", "delivered"], d.pharmacyStatus),
    flag(d.providerTransferStatus === "notified"),
    flag(d.providerTransferSmsSent),
    flag(d.providerTransferSmsVerified),
    rank(["none", "active", "complete"], d.papStatus === "audit_pending" ? "active" : d.papStatus),
    flag(d.papSmsSent),
    flag(d.papSmsVerified),
    flag(d.papOtpVerified),
    rank(["none", "pending", "verified"], d.incomeStatus),
    flag(d.papTransferStatus === "referred"),
    flag(d.copayEnrolled),
    d.copayClaims?.length ?? 0,
    flag(d.medbvStatus),
    flag(d.infusionDate),
  ];
}

/**
 * A stage is reached when the case shows what that stage adds: at least half the counters its ladder moved (compared with
 * the stage before) are as far on as the ladder took them. One counter is not enough: a referral alone marks the patient
 * "enrolled", but "Patient Enrolled" also means the text, the code, and the consent. A stage that adds nothing (BI starts on its own at the referral, so
 * "Benefits Investigation" can look like "Patient Enrolled") is reached with the stage before it. Comparing only what a
 * stage adds is what lets a case that took another path count: the ladder may pay for the order, or pick an infusion
 * date, where the story paid nothing and sent a date-less pick. The last stage reached is the stage the case is on.
 */
const cache = new Map<string, number[][]>();

/** The progress each stage's ladder reaches, in stage order. */
function stageProgress(flowType: FlowType, choices: Choices): number[][] {
  const key = `${flowType}|${JSON.stringify(Object.entries(choices ?? {}).sort())}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const machine = workflowRegistry.getWorkflow(flowType);
  if (!machine) return [];
  const reached = stageList(flowType, choices).map(({ stage }) => {
    const actor = createActor(machine as any, { input: { flowType, ...(choices ? { choices } : {}) } } as any);
    actor.start();
    for (const event of jumpEvents(flowType, stage, choices)) actor.send(event as any);
    const data = (actor.getSnapshot().context as { workflowData: WorkflowData }).workflowData;
    actor.stop();
    return progress(data);
  });
  cache.set(key, reached);
  return reached;
}

/**
 * The first stage the case has not finished: 1-based, at least 2. A stage is finished when every counter it adds is as far on
 * as its ladder took it, bar the optional ones, and a stage that adds nothing is finished. Null when every stage is. Guided
 * Next works on this stage, so it keeps the ladder's order (the patient consents before the PA is decided) where `stageAt`,
 * which marks the stage a case has reached on half its work, would let it run ahead.
 */
export function firstUnfinishedStage(flowType: FlowType, choices: Choices, data: WorkflowData): number | null {
  const stages = stageProgress(flowType, choices);
  const have = progress(data);
  for (let i = 1; i < stages.length; i++) {
    const unmet = stages[i].some((n, k) => n > stages[i - 1][k] && !OPTIONAL_AT_END.has(PROGRESS_NAMES[k]) && have[k] < n);
    if (unmet) return i + 1;
  }
  return null;
}

/**
 * True when the case has done everything the last stage's ladder does (bar the optional counters above), or the Rx was
 * delivered. Stricter than reaching the last stage on one counter: a case that has reached it may still have a phone step
 * to take, and Next must not say "done" then.
 */
export function isFinished(flowType: FlowType, choices: Choices, data: WorkflowData): boolean {
  if (data.pharmacyStatus === "delivered") return true;
  const stages = stageProgress(flowType, choices);
  if (stages.length < 2) return false;
  const have = progress(data);
  const need = stages[stages.length - 1];
  return need.every((n, k) => OPTIONAL_AT_END.has(PROGRESS_NAMES[k]) || have[k] >= n);
}

/** The stage the case is on: 1-based, the last stage whose own step the case has taken. Stage 1 when none is. */
export function stageAt(flowType: FlowType, choices: Choices, data: WorkflowData): number {
  const have = progress(data);
  const stages = stageProgress(flowType, choices);
  let at = 1;
  let previousReached = true;
  stages.forEach((need, i) => {
    if (i === 0) return;
    const added = need.map((n, k) => (n > stages[i - 1][k] ? k : -1)).filter((k) => k >= 0);
    const done = added.filter((k) => have[k] >= need[k]).length;
    const reached = added.length === 0 ? previousReached : done >= Math.ceil(added.length / 2);
    if (reached) at = i + 1;
    previousReached = reached;
  });
  return at;
}
