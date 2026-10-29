/**
 * The spine: BI and PA. Every scenario passes through it, so these rules belong to no module. The CRM reports
 * "the agent is looking at this stage" (VIEW_STAGE) and "left it" (LEAVE_STAGE). The machine owns the delay and the
 * outcome. Leaving the stage cancels a pending reveal. The `bi` and `pa` forks decide the outcomes.
 */
import type { IassistContent } from "../scenarios";
import type { IaRule } from "./shared";
import { nowIso, REVEAL_MS, APPEAL_MS, PAP_UPDATE_MS } from "./shared";
import { resolveBi, submitPaRule } from "../../shared/bi";
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
    set: (d, e) => resolveBi(IASSIST_BI_FORK, d, e),
    emit: { portal: "analytics", step: 7 },
    then: [
      // The PA starts when BI returns. SUBMIT_PA checks that the result requires one.
      { trigger: "system", send: () => ({ type: "SUBMIT_PA" }) },
      // No coverage: the free drug application update goes out (a scenario with `financial_assistance` handles it).
      { trigger: "system", id: "pap-update", after: PAP_UPDATE_MS, when: (d) => d.biResult === "no_coverage", send: () => ({ type: "SEND_PAP_SMS" }) },
    ],
  },

  // ── Prior Authorization ────────────────────────────────────────────
  submitPaRule<IassistContent>(),
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
      send: () => ({ type: "COMPLETE_BI" }),
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
