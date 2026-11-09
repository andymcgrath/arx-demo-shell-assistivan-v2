/**
 * Pharmacy intake: the assigned pharmacy receives the Rx on an intake screen in the Field app, under the client's name,
 * and accepts it. Accepting is what hands the case to the client's CRM (`crm_handoff`). This module never knows that
 * (CLAUDE.md rule 5): the handoff's own precondition holds it, and the trigger sits on this rule's `then`.
 *
 * Needs: a verified PA result and an assigned pharmacy. Sets: `pharmacyIntakeStatus`.
 * Triggers: the pharmacy agent clicks Accept in the Field app (`agent`).
 */
import type { WorkflowData } from "@/engine/types";
import type { CoaRule } from "./shared";

/** The Rx is with an assigned pharmacy and the patient verified the PA result. The intake screen shows from here. */
export const intakeOpen = (d: WorkflowData) => d.pharmacyAssigned && d.paApprovedOtpVerified && d.pharmacyIntakeStatus === "none";

export const PHARMACY_INTAKE_RULES: CoaRule[] = [
  {
    id: "pharmacy_intake.accept",
    on: "ACCEPT_PHARMACY_INTAKE", // trigger: agent
    scope: { module: "pharmacy_intake" },
    when: intakeOpen,
    set: () => ({ pharmacyIntakeStatus: "accepted" }),
    emit: { portal: "field", step: 10 },
    then: { trigger: "system", send: () => ({ type: "HAND_OFF_TO_CRM" }) },
  },
];
