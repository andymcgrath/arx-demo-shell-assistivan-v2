/**
 * resetToStage.ts — shared CoA_DME "jump to Benefits Investigation complete"
 * replay sequence.
 *
 * Two call sites need this exact same sequence and must not drift apart:
 *   1. DemoShell.tsx's own stage-jump dropdown (resetActorToStage) — its
 *      "Benefits Investigation" rung for CoA_DME, which defaults to
 *      Scenario 1 (Pharmacy Coverage).
 *   2. crm/pages/Index.tsx's BIR-0431 scenario toggle buttons ("Pharmacy
 *      Coverage" / "Covered by Both" / "No Coverage (Cash)"), which let an
 *      operator switch scenarios live without leaving the BIR detail view.
 *
 * This lives in its own standalone module (not exported from DemoShell.tsx
 * or Index.tsx) so neither file has to import from the other — Index.tsx is
 * rendered inside DemoShell's portal chrome, so a DemoShell -> Index.tsx
 * import already exists one direction; having Index.tsx import UI logic back
 * out of DemoShell.tsx would risk a circular import. Both files instead
 * import this one, which only touches the actor singleton and demoStore.
 */
import { getWorkflowActor } from "@/engine/actorSingleton";
import { useDemoStore } from "@/store/demoStore";

export interface DmeBiScenario {
  pharmacyBenefitStatus: "covered" | "not_covered";
  medicalBenefitStatus: "covered" | "not_covered";
}

/** Scenario 1 — Pharmacy Coverage. The default for every CoA_DME entry
 *  point into this replay (DemoShell's ladder, and Index.tsx's toggle
 *  buttons when no explicit scenario is passed). */
export const DME_SCENARIO_1_PHARMACY_COVERAGE: DmeBiScenario = {
  pharmacyBenefitStatus: "covered",
  medicalBenefitStatus: "not_covered",
};

export const DME_SCENARIO_2_COVERED_BY_BOTH: DmeBiScenario = {
  pharmacyBenefitStatus: "covered",
  medicalBenefitStatus: "covered",
};

export const DME_SCENARIO_3_NO_COVERAGE: DmeBiScenario = {
  pharmacyBenefitStatus: "not_covered",
  medicalBenefitStatus: "not_covered",
};

/**
 * Replays ENROLL -> VERIFY_SMS -> VERIFY_OTP -> CONFIRM_CONSENT -> RUN_BI ->
 * COMPLETE_BI on an already-RESET actor. Callers that need a full reset
 * first should call resetDmeToBiComplete() below instead — this lower-level
 * version exists so DemoShell's own resetActorToStage (which already does
 * its own top-level resetDemo()/RESET before branching by stage) doesn't
 * have to redo that work for its "Benefits Investigation" rung.
 */
export function replayDmeToBiComplete(
  actor: ReturnType<typeof getWorkflowActor>,
  scenario: DmeBiScenario = DME_SCENARIO_1_PHARMACY_COVERAGE
): void {
  actor.send({ type: "ENROLL", portal: "crm" });
  actor.send({ type: "VERIFY_SMS", portal: "patient" });
  actor.send({ type: "VERIFY_OTP", portal: "patient" });
  actor.send({ type: "CONFIRM_CONSENT", portal: "patient" });
  actor.send({ type: "RUN_BI", portal: "crm" });
  actor.send({
    type: "COMPLETE_BI",
    portal: "crm",
    pharmacyBenefitStatus: scenario.pharmacyBenefitStatus,
    medicalBenefitStatus: scenario.medicalBenefitStatus,
  });
}

/**
 * Full reset + replay — resets the whole demo (bumping resetNonce, which
 * Index.tsx's own effect already uses to snap its open stage tabs back to
 * "keanu" and re-run its consent-confirmed auto-open-detail effect, landing
 * the CRM back on Keanu's BIR-0431 detail view with the new combo visible)
 * before replaying ENROLL through COMPLETE_BI with the given scenario.
 * Defaults to Scenario 1 (Pharmacy Coverage) when no scenario is given.
 */
export function resetDmeToBiComplete(scenario: DmeBiScenario = DME_SCENARIO_1_PHARMACY_COVERAGE): void {
  useDemoStore.getState().resetDemo();

  const actor = getWorkflowActor();
  actor.send({ type: "RESET" });
  replayDmeToBiComplete(actor, scenario);
}

/**
 * Full reset + replay, but stops at RUN_BI — leaves biStatus "running"
 * instead of jumping straight to a resolved BIR. This is what Index.tsx's
 * BIR-0431 scenario toggle buttons actually use: clicking a scenario button
 * should look exactly like the demo's own natural "Enrollment Assistance
 * complete, Benefits Investigation running" resting state (matching every
 * other flow's reset-to-stage-3 behavior), not skip straight to a completed
 * result. The scenario is picked up later — by the existing BI-14273
 * tab-open auto-complete effect or the "Check Status" button in
 * crm/pages/Index.tsx — once the operator actually lets/asks BI resolve.
 * Callers are responsible for also remembering which scenario was picked
 * (e.g. component state) so that later COMPLETE_BI dispatch uses it instead
 * of falling back to Scenario 1.
 */
export function resetDmeToBiRunning(): void {
  useDemoStore.getState().resetDemo();

  const actor = getWorkflowActor();
  actor.send({ type: "RESET" });
  actor.send({ type: "ENROLL", portal: "crm" });
  actor.send({ type: "VERIFY_SMS", portal: "patient" });
  actor.send({ type: "VERIFY_OTP", portal: "patient" });
  actor.send({ type: "CONFIRM_CONSENT", portal: "patient" });
  actor.send({ type: "RUN_BI", portal: "crm" });
}
