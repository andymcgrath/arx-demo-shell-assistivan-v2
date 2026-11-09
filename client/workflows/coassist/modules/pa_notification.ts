/**
 * PA notification: after a PA decision the patient confirms by SMS and a one-time code. Pricing options reach the patient only after enrollment is complete.
 */
import type { CoaRule } from "./shared";
import { assignment, prePicked, prescriberPharmacy } from "./shared";

export const PA_NOTIFICATION_RULES: CoaRule[] = [
  {
    // Pricing options go to the patient only after enrollment is complete. The PA can be approved
    // earlier (BI and PA run off the eRx alone), but the patient hears about it after they consent.
    id: "pa_notification.verify_sms",
    on: "VERIFY_PA_APPROVED_SMS",
    when: (d) => d.paStatus === "approved" && d.consentStatus === "confirmed" && !d.paApprovedSmsVerified,
    set: () => ({ paApprovedSmsVerified: true }),
    emit: { portal: "patient", step: 9 },
  },
  {
    id: "pa_notification.verify_otp",
    on: "VERIFY_PA_APPROVED_OTP",
    when: (d) => d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
    set: (d, _e, s) => ({
      paApprovedOtpVerified: true,
      ...assignment(d, s),
      ...prePicked(d, s),
      // The prescriber's pharmacy clears the case to schedule and to dispatch. There is no pricing pick to do that.
      ...(prescriberPharmacy(s) ? { dispatchStatus: "pending_selection" as const, selectedPharmacy: d.selectedPharmacy ?? s.content.transferPharmacy } : {}),
    }),
    emit: { portal: "patient", step: 9 },
  },
];
