/**
 * Prior authorization by form (APA, Advanced Prior Authorization): the `prior_authorization` block's `apa` and
 * `apa_skip` variants. Once BI says a PA is required, the system identifies the form and emails the prescriber a
 * secure link. The prescriber opens it, verifies by NPI, completes the prefilled form, and submits it. The
 * submission starts the PA, the same `SUBMIT_PA` that `auto` sends on its own. The `pa` fork still decides the outcome.
 *
 * Needs: a completed BI whose exit requires a PA. Sets: `paFormStatus`, `prescriberVerified`, then `paStatus` through
 * `SUBMIT_PA`.
 *
 * Triggers (CLAUDE.md rule 11). The precondition for `SUBMIT_PA` never changes, only who fires it:
 * - `auto`: the system submits as soon as BI completes. The demo today.
 * - `apa`: the system sends the form email. The prescriber acts (open, verify, submit), then `SUBMIT_PA` fires.
 * - `apa_skip`: the system sends the form email, then submits for the prescriber after a short delay. The demo
 *   override: nobody visits the Provider app.
 * A recipe with no `prior_authorization` block behaves as `auto`.
 */
import type { ScenarioRecipe } from "@/engine/workflow/components";
import type { WorkflowData } from "@/engine/types";
import type { Rule } from "@/engine/workflow/types";

export type PaVariant = "auto" | "apa" | "apa_skip";

/** How long `apa_skip` waits after the form email before it submits for the prescriber. */
export const PA_FORM_SKIP_MS = 3000;

/** The scenario's PA variant, or undefined when its recipe has no `prior_authorization` block. */
export const paVariant = (s: { recipe?: ScenarioRecipe }): PaVariant | undefined => {
  const v = s.recipe?.modules.find((m) => m.id === "prior_authorization")?.props?.variant;
  return v === "auto" || v === "apa" || v === "apa_skip" ? v : undefined;
};

/** The system emails the prescriber a form. */
export const sendsPaForm = (s: { recipe?: ScenarioRecipe }): boolean => paVariant(s) === "apa" || paVariant(s) === "apa_skip";

/** The PA submits as soon as BI completes: `auto`, and every recipe with no `prior_authorization` block. */
export const startsPaOnItsOwn = (s: { recipe?: ScenarioRecipe }): boolean => !sendsPaForm(s);

/** A ten-digit NPI. When the case already holds the prescriber's NPI (the web page collected it), it must match. */
export const isValidNpi = (npi: unknown, d: Pick<WorkflowData, "prescriberNpi">): npi is string =>
  typeof npi === "string" && /^\d{10}$/.test(npi) && (d.prescriberNpi === null || d.prescriberNpi === npi);

/** What the Provider app shows. Derived from the data, never from a UI effect. Undefined: no form to show. */
export const providerFormStep = (d: Pick<WorkflowData, "paFormStatus" | "paStatus">): "email" | "login" | "form" | undefined => {
  if (d.paStatus !== "none") return undefined;
  if (d.paFormStatus === "sent") return "email";
  if (d.paFormStatus === "opened") return "login";
  if (d.paFormStatus === "verified") return "form";
  return undefined;
};

const NOW = () => new Date().toISOString();
const APA_FORM = (s: { recipe?: ScenarioRecipe }) => paVariant(s) === "apa";

export const PRIOR_AUTHORIZATION_RULES: Rule<any, any>[] = [
  {
    // `system`: BI came back and says a PA is required, so the form goes out. Ignored where it does not hold.
    on: "SEND_PA_FORM",
    when: (d, _e, s) => sendsPaForm(s) && d.biStatus === "complete" && d.paRequired && d.paStatus === "none" && d.paFormStatus === "none",
    set: () => ({ paFormStatus: "sent", paFormSentAt: NOW() }),
    emit: { portal: "provider", step: 8 },
    // `apa_skip` only: nobody visits the Provider app, so the demo submits for the prescriber.
    then: { trigger: "system", id: "pa-form-skip", after: PA_FORM_SKIP_MS, when: (_d, _e, s) => paVariant(s) === "apa_skip", send: () => ({ type: "SUBMIT_PA" }) },
  },
  {
    // `agent`: the prescriber clicks the link in the email.
    on: "OPEN_PA_FORM_LINK",
    when: (d, _e, s) => APA_FORM(s) && d.paFormStatus === "sent",
    set: () => ({ paFormStatus: "opened" }),
    emit: { portal: "provider", step: 8 },
  },
  {
    // `agent`: the prescriber enters their NPI and PIN. A bad NPI is ignored, so the gate stays closed.
    on: "VERIFY_PRESCRIBER",
    when: (d, e, s) => APA_FORM(s) && d.paFormStatus === "opened" && isValidNpi(e.npi, d) && typeof e.pin === "string" && e.pin.trim() !== "",
    set: (_d, e) => ({ paFormStatus: "verified", prescriberVerified: true, prescriberNpi: e.npi as string }),
    emit: { portal: "provider", step: 8 },
  },
  {
    // `agent`: the prescriber submits the prefilled form. That starts the PA.
    on: "SUBMIT_PA_FORM",
    when: (d, _e, s) => APA_FORM(s) && d.paFormStatus === "verified",
    set: () => ({ paFormStatus: "submitted" }),
    emit: { portal: "provider", step: 8 },
    then: { trigger: "agent", send: () => ({ type: "SUBMIT_PA" }) },
  },
];
