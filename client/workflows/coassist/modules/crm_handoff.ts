/**
 * CRM handoff: the case data goes to the client's own CRM once the pharmacy has the Rx. The CRM stage shows what was sent.
 *
 * Needs: an accepted pharmacy intake. Sets: `crmHandoffStatus`.
 * Triggers: `system`. `pharmacy_intake.accept` fires it, and the same precondition holds if an agent clicked it instead.
 * Fulfillment waits for it when a recipe has this block (tracking.fill_rx).
 */
import type { CoaRule } from "./shared";

export const CRM_HANDOFF_RULES: CoaRule[] = [
  {
    id: "crm_handoff.send",
    on: "HAND_OFF_TO_CRM",
    scope: { module: "crm_handoff" },
    when: (d) => d.pharmacyIntakeStatus === "accepted" && d.crmHandoffStatus === "none",
    set: () => ({ crmHandoffStatus: "sent" }),
    emit: { portal: "crm", step: 10 },
  },
];
