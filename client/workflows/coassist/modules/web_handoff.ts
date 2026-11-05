/**
 * Web handoff: the `web` variant of the enrollment block. A client-managed web page starts the case. The page has
 * already collected consent and the patient's details, so there is no SMS, one-time code, or consent step here.
 *
 * Three events move the case, and the Gateway tab is what releases the calls:
 * - WEB_SUBMIT: the patient finishes the Rx screen. The event carries `prescriberNpi`, typed or picked from the provider
 *   search. ABV and APA both use it. BI starts ("Checking your coverage") and stays in flight.
 * - VIEW_GATEWAY: the presenter opens the Gateway tab. BI then completes after a short delay, the PA (APA) starts on its
 *   own, and decides on its own (see spine.ts). The Gateway only reports that it is on screen. The machine owns the rest.
 * - CHECK_PRICING: the patient taps Check Pricing on the coverage summary. The PA approval was already shown there, so the
 *   PA-approved text and code are skipped. From here the case runs like Copay: pricing, copay enrollment, pricing at the
 *   reduced amount, pharmacy selection.
 */
import type { CoaRule } from "./shared";

/** How long the gateway takes to return a BI result once it is released. */
export const WEB_BI_MS = 2000;
/** How long the gateway takes to return a PA decision after the PA starts. */
export const WEB_PA_MS = 3000;

const WEB = { module: "enrollment", props: { variant: "web" } } as const;

export const WEB_HANDOFF_RULES: CoaRule[] = [
  {
    id: "web_handoff.submit",
    on: "WEB_SUBMIT",
    scope: WEB,
    when: (d) => d.enrollmentStatus === "none",
    // The client page verified and consented the patient, so the platform treats them as verified.
    set: (_d, e) => ({
      enrollmentStatus: "enrolled",
      smsVerified: true,
      otpVerified: true,
      consentStatus: "confirmed",
      prescriberNpi: typeof e.prescriberNpi === "string" ? e.prescriberNpi : null,
    }),
    emit: { portal: "patient", step: 1 },
    // BI starts now. It completes when the Gateway is opened.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
  {
    // Releases the held calls. Opening the Gateway before the page submits, or a second time, does nothing.
    // Undoable: Undo takes BI back to in flight, so the presenter can show the calls going out again.
    id: "web_handoff.view_gateway",
    on: "VIEW_GATEWAY",
    scope: WEB,
    when: (d) => d.biStatus === "running" && !d.gatewayViewed,
    set: () => ({ gatewayViewed: true }),
    // COMPLETE_BI then sends SUBMIT_PA on its own (spine.ts), and the PA decides on its own.
    then: { trigger: "system", id: "web-bi", after: WEB_BI_MS, send: () => ({ type: "COMPLETE_BI" }) },
  },
  {
    id: "web_handoff.check_pricing",
    on: "CHECK_PRICING",
    scope: WEB,
    when: (d) => d.paStatus === "approved" && !d.pricingChecked,
    // The coverage summary showed the approval, so the text and code about it are not sent.
    set: () => ({ pricingChecked: true, paApprovedSmsVerified: true, paApprovedOtpVerified: true }),
    emit: { portal: "patient", step: 2 },
  },
];
