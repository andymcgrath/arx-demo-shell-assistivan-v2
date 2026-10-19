/**
 * Enrollment: the referral, the patient's SMS, OTP, and consent. BI starts with the referral and does not wait for them.
 */
import type { IaRule } from "./shared";

export const ENROLLMENT_RULES: IaRule[] = [
  // ── Referral and patient onboarding ────────────────────────────────
  {
    // The referral lands and the welcome text goes out in the same moment. BI starts on its own.
    id: "enrollment.referral_received",
    on: "REFERRAL_RECEIVED",
    when: (d) => d.enrollmentStatus === "none",
    set: () => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true }),
    emit: { portal: "crm", step: 1 },
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
    id: "enrollment.confirm_consent.approved",
    on: "CONFIRM_CONSENT",
    scope: { module: "pa_notification" },
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: (d) => ({
      consentStatus: "confirmed",
      enrollmentAcknowledged: true,
      ...(d.paStatus === "approved" ? { paApprovedSmsVerified: true, paApprovedOtpVerified: true } : {}),
    }),
    emit: { portal: "patient", step: 5 },
  },
  {
    id: "enrollment.confirm_consent.appeal",
    on: "CONFIRM_CONSENT",
    scope: { module: "appeal" },
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: () => ({ consentStatus: "confirmed", enrollmentAcknowledged: true }),
    emit: { portal: "patient", step: 5 },
  },
  {
    id: "enrollment.dismiss_welcome",
    on: "DISMISS_WELCOME",
    when: (d) => !d.welcomeDismissed,
    set: () => ({ welcomeDismissed: true }),
    emit: { portal: "patient", step: 2 },
  },
];
