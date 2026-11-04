/**
 * Web handoff: the `web` variant of the enrollment block. A client-managed web page starts the case. The page has
 * already collected consent and the patient's details, so there is no SMS, one-time code, or consent step here.
 *
 * Two events cross from the client page into the platform, one per gateway call and one for the handoff:
 * - WEB_SUBMIT: the patient finishes the Rx screen. The page calls benefit verification (ABV). BI runs and lands on its
 *   own after a short delay. The PA (APA) then starts on its own and decides on its own (see spine.ts), so no agent
 *   opens a stage. Every step here is a `system` trigger.
 * - WEB_HANDOFF: the patient taps Enroll once BI is back. They land on the copay screen of the patient experience,
 *   with the PA still running. The existing PA-approved text and code verify them before pricing.
 */
import type { CoaRule } from "./shared";

/** How long the gateway takes to return a BI result to the client page. */
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
    set: () => ({ enrollmentStatus: "enrolled", smsVerified: true, otpVerified: true, consentStatus: "confirmed" }),
    emit: { portal: "patient", step: 1 },
    then: [
      { trigger: "system", send: () => ({ type: "RUN_BI" }) },
      // ABV returns after a short delay. COMPLETE_BI then sends SUBMIT_PA on its own, and the PA decides on its own.
      { trigger: "system", id: "web-bi", after: WEB_BI_MS, send: () => ({ type: "COMPLETE_BI" }) },
    ],
  },
  {
    id: "web_handoff.handoff",
    on: "WEB_HANDOFF",
    scope: WEB,
    when: (d) => d.biStatus === "complete" && !d.webHandoff,
    set: () => ({ webHandoff: true }),
    emit: { portal: "patient", step: 2 },
  },
];
