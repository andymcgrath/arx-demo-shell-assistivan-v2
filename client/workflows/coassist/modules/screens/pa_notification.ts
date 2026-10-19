/** PA notification: the patient hears the PA is approved (SMS, then OTP). */
import type { Screen } from "@/engine/workflow/screens";
import { DME_BI, STANDARD_BI, type CoaRoute } from "../slots";

export const PA_NOTIFICATION_SCREENS: Screen[] = [
  { path: "/pa-approved-sms", label: "PA Approved SMS", group: "Prior authorization", scope: { module: "pa_notification" }, sticky: true },
  { path: "/pa-approved-otp", label: "PA Approved OTP", group: "Prior authorization", scope: { module: "pa_notification" }, sticky: true },
];

export const PA_NOTIFICATION_ROUTES: CoaRoute[] = [
  { id: "pa_notification.sms", slot: "pa_notice", path: "/pa-approved-sms", scope: STANDARD_BI, when: (d) => d.paStatus === "approved" && !d.paApprovedSmsVerified },
  {
    id: "pa_notification.otp",
    slot: "pa_notice",
    path: "/pa-approved-otp",
    scope: STANDARD_BI,
    when: (d) => d.paStatus === "approved" && d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
  },
  // DME, pharmacy covered: wait for the PA, then SMS and OTP again.
  {
    id: "pa_notification.dme_waiting_for_pa",
    slot: "pa_notice",
    path: "/",
    scope: DME_BI,
    when: (d) => d.pharmacyBenefitStatus === "covered" && (d.paStatus === "none" || d.paStatus === "submitted"),
  },
  {
    id: "pa_notification.dme_sms",
    slot: "pa_notice",
    path: "/pa-approved-sms",
    scope: DME_BI,
    when: (d) => d.pharmacyBenefitStatus === "covered" && d.paStatus === "approved" && !d.paApprovedSmsVerified,
  },
  {
    id: "pa_notification.dme_otp",
    slot: "pa_notice",
    path: "/pa-approved-otp",
    scope: DME_BI,
    when: (d) => d.pharmacyBenefitStatus === "covered" && d.paStatus === "approved" && d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
  },
];
