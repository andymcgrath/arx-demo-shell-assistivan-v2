/**
 * The spine: BI and PA. Every scenario passes through it, so these rules belong to no module. The CRM reports
 * "the agent is looking at this stage" (VIEW_STAGE) and "left it" (LEAVE_STAGE). The machine owns the delay and the
 * outcome. Leaving the stage cancels a pending reveal. The `bi` and `pa` forks decide the outcomes.
 */
import type { IaRule } from "./shared";
import { nowIso, REVEAL_MS, APPEAL_MS } from "./shared";
import { exitFor } from "@/engine/workflow/forks";
import { IASSIST_BI_FORK, IASSIST_PA_FORK } from "../forks";

export const SPINE_RULES: IaRule[] = [
  {
    id: "spine.complete_provider_pa",
    on: "COMPLETE_PROVIDER_PA",
    when: (d) => !d.providerPACompleted,
    set: () => ({ providerPACompleted: true }),
    emit: { portal: "provider", step: 13 },
  },

  // ── Benefits Investigation ─────────────────────────────────────────
  {
    id: "spine.run_bi",
    on: "RUN_BI",
    when: (d) => d.enrollmentStatus === "enrolled" && d.biStatus === "none",
    set: () => ({ biStatus: "running" }),
    emit: { portal: "analytics", step: 6 },
  },
  {
    id: "spine.complete_bi",
    on: "COMPLETE_BI",
    when: (d) => d.biStatus === "running",
    set: (d, e) => ({ biStatus: "complete", biResult: e.result ?? exitFor(IASSIST_BI_FORK, d).data.biResult }),
    emit: { portal: "analytics", step: 7 },
    // The PA starts when BI returns. SUBMIT_PA checks that the result requires one.
    then: { trigger: "system", send: () => ({ type: "SUBMIT_PA" }) },
  },

  // ── Prior Authorization ────────────────────────────────────────────
  {
    // A PA needs a completed BI whose result says one is required.
    id: "spine.submit_pa",
    on: "SUBMIT_PA",
    when: (d) => d.biStatus === "complete" && d.biResult === "coverage_found" && d.paStatus === "none",
    set: () => ({ paStatus: "submitted", paSubmittedAt: nowIso() }),
    emit: { portal: "provider", step: 8 },
  },
  {
    // The appeal scenario never approves its PA. The appeal is what unlocks it.
    id: "spine.approve_pa",
    on: "APPROVE_PA",
    scope: { module: "pa_notification" },
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "approved", paApprovedAt: nowIso(), dispatchStatus: "pending_selection" }),
    emit: { portal: "provider", step: 9 },
  },
  {
    id: "spine.deny_pa",
    on: "DENY_PA",
    when: (d) => d.paStatus === "submitted",
    set: () => ({ paStatus: "denied" }),
    emit: { portal: "provider", step: 9 },
    // The appeal rule (built in the Rules portal) files the appeal when a PA is denied.
    then: {
      trigger: "system",
      id: "appeal-start",
      after: APPEAL_MS,
      when: (d) => d.appealRuleActive === true,
      send: () => ({ type: "INITIATE_APPEAL" }),
    },
  },

  // ── Agent-driven reveals ───────────────────────────────────────────
  // The CRM reports "the agent is looking at this stage" (VIEW_STAGE) and "left it" (LEAVE_STAGE).
  // The machine owns the delay and the outcome. Leaving the stage cancels a pending reveal.
  {
    id: "spine.view_stage.bi",
    on: "VIEW_STAGE",
    snapshot: false,
    when: (d, e) => e.stage === "BI" && d.biStatus === "running",
    then: {
      trigger: "agent",
      id: "bi-reveal",
      after: REVEAL_MS,
      send: (d) => ({ type: "COMPLETE_BI", result: exitFor(IASSIST_BI_FORK, d).data.biResult }),
    },
  },
  {
    id: "spine.view_stage.pa",
    on: "VIEW_STAGE",
    snapshot: false,
    when: (d, e) => e.stage === "PA" && d.paStatus === "submitted",
    then: {
      trigger: "agent",
      id: "pa-decision",
      after: REVEAL_MS,
      send: (d) => ({ type: exitFor(IASSIST_PA_FORK, d).id === "denied" ? "DENY_PA" : "APPROVE_PA" }),
    },
  },
  { id: "spine.leave_stage.bi", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "BI", cancel: ["bi-reveal"] },
  { id: "spine.leave_stage.pa", on: "LEAVE_STAGE", snapshot: false, when: (_d, e) => e.stage === "PA", cancel: ["pa-decision"] },
];
