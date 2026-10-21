/**
 * Enrollment: the referral, the patient's SMS, OTP, and consent. BI starts with the referral and does not wait for them.
 */
import { consentByHcp, consentByPatient, hcpEnrollsCopay, hcpPreparesFirst, type IaRule } from "./shared";

export const ENROLLMENT_RULES: IaRule[] = [
  // ── Referral and patient onboarding ────────────────────────────────
  {
    // The referral lands and the welcome text goes out in the same moment. BI starts on its own.
    id: "enrollment.referral_received",
    on: "REFERRAL_RECEIVED",
    // Buy and Bill: the HCP runs eMedBV and enrolls the patient in copay first, then submits.
    when: (d, _e, s) => d.enrollmentStatus === "none" && (!hcpPreparesFirst(s) || (d.medbvStatus === "complete" && (d.copayEnrolled || !hcpEnrollsCopay(s)))),
    // `hcp_signs`: the HCP captured consent and income on the form, so the patient has nothing to consent to.
    set: (d) => ({ enrollmentStatus: "enrolled", enrollmentInviteSent: true, ...(consentByHcp(d) ? { consentStatus: "confirmed" as const, incomeStatus: "verified" as const } : {}) }),
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
    // Free drug (PAP): the patient consents to the enrollment, then waits for the application update.
    id: "enrollment.confirm_consent.pap",
    on: "CONFIRM_CONSENT",
    scope: { module: "financial_assistance" },
    when: (d) => d.otpVerified && d.consentStatus === "pending",
    set: () => ({ consentStatus: "confirmed", enrollmentAcknowledged: true }),
    emit: { portal: "patient", step: 5 },
  },
  {
    // `patient_text`: after consent, the patient confirms household size and income in the patient app.
    id: "enrollment.confirm_income",
    on: "CONFIRM_INCOME",
    scope: { fork: "consent", exit: "patient_text" },
    when: (d) => consentByPatient(d) && d.consentStatus === "confirmed" && d.incomeStatus === "none",
    set: (_d, e) => ({ incomeStatus: "verified", householdSize: String(e.householdSize ?? ""), householdIncome: String(e.householdIncome ?? "") }),
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
