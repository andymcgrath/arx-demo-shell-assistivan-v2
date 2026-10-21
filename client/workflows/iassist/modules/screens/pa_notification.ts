/** PA notification: the patient hears the PA is approved (SMS, then OTP). */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const SCOPE = { module: "pa_notification" } as const;
/** Buy and Bill: the HCP administers the drug, so the patient hears to contact the prescriber and nothing ships. */
const HCP_ADMINISTERED = { module: "pa_notification", props: { variant: "hcp_administered" } } as const;

export const PA_NOTIFICATION_SCREENS: Screen[] = [
  { path: "/pa-approved-sms", label: "PA Approved SMS", group: "Prior authorization", scope: SCOPE, sticky: true },
  { path: "/pa-approved-otp", label: "PA Approved OTP", group: "Prior authorization", scope: SCOPE, sticky: true },
  { path: "/approved-contact-physician", label: "Approved, Contact Your Physician", group: "Prior authorization", scope: HCP_ADMINISTERED, sticky: true },
];

export const PA_NOTIFICATION_ROUTES: IaRoute[] = [
  { id: "pa_notification.sms", slot: "pa_notice", path: "/pa-approved-sms", scope: SCOPE, when: (d) => d.paStatus === "approved" && !d.paApprovedSmsVerified },
  // The OTP verified. The order ends here: no pharmacy, pricing, scheduling, or payment.
  { id: "pa_notification.contact_physician", slot: "hcp_approved", path: "/approved-contact-physician", scope: HCP_ADMINISTERED, when: (d) => d.paStatus === "approved" && d.paApprovedOtpVerified },
  { id: "pa_notification.otp", slot: "pa_notice", path: "/pa-approved-otp", scope: SCOPE, when: (d) => d.paStatus === "approved" && !d.paApprovedOtpVerified },
];
