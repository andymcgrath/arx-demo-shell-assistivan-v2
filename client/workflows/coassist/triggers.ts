/**
 * Who starts a step that the intake channel can decide (CLAUDE.md rule 11). Pure, with no imports, so the rules in `modules/`
 * and the CRM's buttons read the same answer.
 *
 * A block's own `trigger` prop wins. Without it the intake decides: an `erx` case needs nothing from a person, so the step is a
 * `system` one. A `fax` case is worked by a person, so the step is an `agent` one: the case manager's "Notify Patient" click on the
 * result of the event that causes it. The precondition is the same either way.
 */
type Scenario = { intake: "erx" | "fax" | "esign"; recipe?: { modules: { id: string; props?: Record<string, unknown> }[] } };

const decide = (s: Scenario, id: string, variant: string): "system" | "agent" | undefined => {
  const spec = s.recipe?.modules.find((m) => m.id === id && m.props?.variant === variant);
  if (!spec) return undefined;
  const set = spec.props?.trigger;
  return set === "system" || set === "agent" ? set : s.intake === "erx" ? "system" : "agent";
};

/** Who sends the Bridge text after a denied PA. */
export const bridgeTrigger = (s: Scenario): "system" | "agent" => decide(s, "cash_offer", "bridge") ?? (s.intake === "erx" ? "system" : "agent");

/** Who starts the second shipment once the appeal is approved. */
export const secondLegTrigger = (s: Scenario): "system" | "agent" => decide(s, "tracking", "two_legs") ?? (s.intake === "erx" ? "system" : "agent");

/** The recipe has the Bridge and a person sends its text. */
export const agentSendsBridge = (s: Scenario): boolean => decide(s, "cash_offer", "bridge") === "agent";

/** The recipe has a second shipment and a person starts it. */
export const agentStartsSecondShipment = (s: Scenario): boolean => decide(s, "tracking", "two_legs") === "agent";
