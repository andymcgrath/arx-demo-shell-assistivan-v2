/**
 * Appeal: a denied PA stays denied. The appeal (started by a rule built in the Rules portal) unlocks fulfillment.
 */
import type { IaRule } from "./shared";
import { APPEAL_MS } from "./shared";

export const APPEAL_RULES: IaRule[] = [

  // ── Appeal (iAssist_PAP) ───────────────────────────────────────────
  {
    // The Rules portal reports that the "Initiate Appeal on PA denial" rule is active. A case already
    // sitting at PA Denied springs into motion.
    id: "appeal.rule_on",
    on: "SET_APPEAL_RULE",
    scope: { module: "appeal" },
    snapshot: false,
    when: (_d, e) => e.active === true,
    set: () => ({ appealRuleActive: true }),
    then: {
      trigger: "system",
      id: "appeal-start",
      after: APPEAL_MS,
      when: (d) => d.paStatus === "denied" && d.appealStatus === "none",
      send: () => ({ type: "INITIATE_APPEAL" }),
    },
  },
  {
    id: "appeal.rule_off",
    on: "SET_APPEAL_RULE",
    scope: { module: "appeal" },
    snapshot: false,
    set: () => ({ appealRuleActive: false }),
    cancel: ["appeal-start"],
  },
  {
    // Files the appeal and unlocks fulfillment, the way an approval would.
    id: "appeal.initiate",
    on: "INITIATE_APPEAL",
    scope: { module: "appeal" },
    when: (d) => d.paStatus === "denied" && d.appealStatus === "none",
    set: () => ({ appealStatus: "initiated", dispatchStatus: "pending_selection" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "appeal.approve",
    on: "APPROVE_APPEAL",
    scope: { module: "appeal" },
    when: (d) => d.appealStatus === "initiated",
    set: () => ({ appealStatus: "approved" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "appeal.view_stage",
    on: "VIEW_STAGE",
    scope: { module: "appeal" },
    snapshot: false,
    when: (d, e) => e.stage === "APPEAL" && d.appealStatus === "initiated",
    then: { trigger: "agent", id: "appeal-decision", after: APPEAL_MS, send: () => ({ type: "APPROVE_APPEAL" }) },
  },
  { id: "appeal.leave_stage", on: "LEAVE_STAGE", snapshot: false, scope: { module: "appeal" }, when: (_d, e) => e.stage === "APPEAL", cancel: ["appeal-decision"] },
];
