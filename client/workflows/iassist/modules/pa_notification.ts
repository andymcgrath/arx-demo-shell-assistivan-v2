/**
 * PA notification: the patient hears the PA is approved (SMS, then OTP). Only the approved scenario has it.
 */
import type { IaRule } from "./shared";

export const PA_NOTIFICATION_RULES: IaRule[] = [
  {
    // Pricing options go to the patient only after enrollment is complete.
    id: "pa_notification.verify_sms",
    on: "VERIFY_PA_APPROVED_SMS",
    scope: { module: "pa_notification" },
    when: (d) => d.paStatus === "approved" && d.consentStatus === "confirmed" && !d.paApprovedSmsVerified,
    set: () => ({ paApprovedSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "pa_notification.verify_otp",
    on: "VERIFY_PA_APPROVED_OTP",
    scope: { module: "pa_notification" },
    when: (d) => d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
    set: () => ({ paApprovedOtpVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
];
