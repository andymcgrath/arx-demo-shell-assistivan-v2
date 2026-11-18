/**
 * Enrollment: the patient verifies their phone and consents. BI starts off the eRx alone, so it does not wait for them.
 */
import { propValueEquals } from "@/engine/workflow/props";
import { ENROLLMENT_CAPTURE_FULL } from "@/engine/workflow/components";
import { hasBridge } from "./financial_assistance";
import type { CoaRule } from "./shared";
import { assignment, prePicked, prescriberPharmacy } from "./shared";

/** The recipe's enrollment block captures the signature and the insurance upload (`capture`). */
export const hasCapture = (s: { recipe?: { modules: { id: string; props?: Record<string, unknown> }[] } }) =>
  !!s.recipe?.modules.some((m) => m.id === "enrollment" && propValueEquals(m.props?.capture, ENROLLMENT_CAPTURE_FULL));

const CAPTURE = { module: "enrollment", props: { capture: ENROLLMENT_CAPTURE_FULL } } as const;

export const ENROLLMENT_RULES: CoaRule[] = [
  {
    id: "enrollment.referral_received",
    on: "REFERRAL_RECEIVED",
    when: (d) => d.enrollmentStatus === "none",
    // The pharmacy the prescriber picked on the eRx stays with the case when the recipe uses it. With a Bridge it is the commercial
    // pharmacy of the second dispense, so it is kept apart (the first dispense takes `selectedPharmacy`).
    set: (_d, e, s) => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true, ...(prescriberPharmacy(s) && e.pharmacy ? { selectedPharmacy: e.pharmacy } : {}), ...(hasBridge(s) ? { commercialPharmacy: e.pharmacy ?? s.content.commercial ?? null } : {}) }),
    emit: { portal: "crm", step: 1 },
    // BI runs off the eRx alone. It does not wait for the patient.
    then: { trigger: "system", send: () => ({ type: "RUN_BI" }) },
  },
  {
    id: "enrollment.verify_sms",
    on: "VERIFY_SMS",
    when: (d) => d.enrollmentStatus === "enrolled" && !d.smsVerified,
    set: () => ({ smsVerified: true }),
    emit: { portal: "patient", step: 3 },
  },
  {
    id: "enrollment.verify_otp",
    on: "VERIFY_OTP",
    when: (d) => d.smsVerified && !d.otpVerified,
    set: () => ({ otpVerified: true }),
    emit: { portal: "patient", step: 4 },
  },
  {
    // If the PA was approved while the patient was still enrolling, they are already in the app
    // (and already verified), so they go straight to pricing. The PA-approved SMS and one-time code
    // exist for a patient who is away when the decision lands.
    id: "enrollment.confirm_consent",
    on: "CONFIRM_CONSENT",
    // With `capture`, the signature and the upload come first.
    when: (d, _e, s) => d.otpVerified && d.consentStatus === "pending" && (!hasCapture(s) || (!!d.signatureCaptured && !!d.insuranceUploaded)),
    set: (d, _e, s) => ({
      consentStatus: "confirmed",
      ...(d.paStatus === "approved"
        ? { paApprovedSmsVerified: true, paApprovedOtpVerified: true, ...assignment(d, s), ...prePicked(d, s) }
        : {}),
    }),
    emit: { portal: "patient", step: 5 },
  },
  {
    // The patient signs. Only a recipe with `capture` asks for it, and only after onboarding has reached consent.
    id: "enrollment.capture_signature",
    on: "CAPTURE_SIGNATURE",
    scope: CAPTURE,
    when: (d, _e, s) => hasCapture(s) && d.otpVerified && d.consentStatus === "pending" && !d.signatureCaptured,
    set: () => ({ signatureCaptured: true }),
    emit: { portal: "patient", step: 5 },
  },
  {
    id: "enrollment.upload_insurance",
    on: "UPLOAD_INSURANCE",
    scope: CAPTURE,
    when: (d, _e, s) => hasCapture(s) && d.consentStatus === "pending" && !!d.signatureCaptured && !d.insuranceUploaded,
    set: () => ({ insuranceUploaded: true }),
    emit: { portal: "patient", step: 5 },
  },
];
