/** PA notification: the patient hears the PA is approved (SMS, then OTP). */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const SCOPE = { module: "pa_notification" } as const;

export const PA_NOTIFICATION_SCREENS: Screen[] = [
  { path: "/pa-approved-sms", label: "PA Approved SMS", group: "Prior authorization", scope: SCOPE, sticky: true },
  { path: "/pa-approved-otp", label: "PA Approved OTP", group: "Prior authorization", scope: SCOPE, sticky: true },
];

export const PA_NOTIFICATION_ROUTES: IaRoute[] = [
  { id: "pa_notification.sms", slot: "pa_notice", path: "/pa-approved-sms", scope: SCOPE, when: (d) => d.paStatus === "approved" && !d.paApprovedSmsVerified },
  { id: "pa_notification.otp", slot: "pa_notice", path: "/pa-approved-otp", scope: SCOPE, when: (d) => d.paStatus === "approved" && !d.paApprovedOtpVerified },
];
