/**
 * Enrollment: the patient verifies their phone and consents. BI starts off the eRx alone, so it does not wait for them.
 */
import type { CoaRule } from "./shared";
import { assignment, prePicked } from "./shared";

export const ENROLLMENT_RULES: CoaRule[] = [
  {
    id: "enrollment.referral_received",
    on: "REFERRAL_RECEIVED",
    when: (d) => d.enrollmentStatus === "none",
    set: () => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true }),
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
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: (d, _e, s) => ({
      consentStatus: "confirmed",
      ...(d.paStatus === "approved"
        ? { paApprovedSmsVerified: true, paApprovedOtpVerified: true, ...assignment(d, s), ...prePicked(d, s) }
        : {}),
    }),
    emit: { portal: "patient", step: 5 },
  },
];
