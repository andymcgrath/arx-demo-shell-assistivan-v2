/**
 * Appeal in CoAssist: a denied PA stays denied, and the appeal runs after it.
 *
 * Needs: a denied PA. The denial starts the appeal on its own (`system`, see `appealStart` and the DENY_PA rules in
 * cash_offer.ts). The decision lands when the agent opens the Appeals stage in the CRM (`agent`), after a delay the machine
 * owns. The `appeal` fork decides the outcome (rule 14): `approved` or `denied`.
 * Sets: `appealStatus`. Approved leaves `paStatus` as `denied`, the way the iAssist appeal does.
 */
import { exitFor } from "@/engine/workflow/forks";
import type { Automation } from "@/engine/workflow/types";
import { APPEAL_FORK } from "../forks";
import type { CoaRule } from "./shared";
import { secondLegStart } from "./tracking";

/** How long the CRM shows the appeal as working before the decision lands. */
export const APPEAL_DECISION_MS = 2500;
/** How long after the denial the appeal is filed. */
export const APPEAL_START_MS = 1500;

const SCOPE = { module: "appeal" } as const;

/** Whether the scenario's recipe has an appeal block. */
export const hasAppeal = (s: { recipe?: { modules: { id: string }[] } }): boolean => !!s.recipe?.modules.some((m) => m.id === "appeal");

/**
 * The denial starts the appeal. It is an automation on the denial rule, because one event runs only its first matching
 * rule. INITIATE_APPEAL ignores it unless the PA is denied, so the trigger repeats no condition.
 */
export const appealStart: Automation = {
  trigger: "system",
  id: "appeal-start",
  after: APPEAL_START_MS,
  when: (_d, _e, s) => hasAppeal(s),
  send: () => ({ type: "INITIATE_APPEAL" }),
};

export const APPEAL_RULES: CoaRule[] = [
  {
    id: "appeal.initiate",
    on: "INITIATE_APPEAL",
    scope: SCOPE,
    when: (d) => d.paStatus === "denied" && d.appealStatus === "none",
    set: () => ({ appealStatus: "initiated" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    id: "appeal.approve",
    on: "APPROVE_APPEAL",
    scope: SCOPE,
    when: (d) => d.appealStatus === "initiated",
    set: () => ({ appealStatus: "approved" }),
    emit: { portal: "crm", step: 9 },
    // An approved appeal starts the second shipment when the recipe has one and the first is already delivered (modules/tracking.ts).
    then: secondLegStart,
  },
  {
    id: "appeal.deny",
    on: "DENY_APPEAL",
    scope: SCOPE,
    when: (d) => d.appealStatus === "initiated",
    set: () => ({ appealStatus: "denied" }),
    emit: { portal: "crm", step: 9 },
  },
  {
    // Opening the Appeals stage starts the decision. The `appeal` fork's exit says which way it goes.
    id: "appeal.view_stage",
    on: "VIEW_STAGE",
    scope: SCOPE,
    snapshot: false,
    when: (d, e) => e.stage === "APPEAL" && d.appealStatus === "initiated",
    then: {
      trigger: "agent",
      id: "appeal-decision",
      after: APPEAL_DECISION_MS,
      send: (d) => ({ type: exitFor(APPEAL_FORK, d).id === "denied" ? "DENY_APPEAL" : "APPROVE_APPEAL" }),
    },
  },
  { id: "appeal.leave_stage", on: "LEAVE_STAGE", scope: SCOPE, snapshot: false, when: (_d, e) => e.stage === "APPEAL", cancel: ["appeal-decision"] },
];
