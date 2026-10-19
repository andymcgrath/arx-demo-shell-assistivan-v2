/**
 * Enrollment screens and route rules. The appeal scenario races ahead of the patient: BI, the PA and the appeal can
 * all finish before the patient opens the portal. Once an appeal is filed there is nothing left to consent to, so the
 * patient skips straight to the result.
 */
import type { Screen } from "@/engine/workflow/screens";
import type { IaRoute } from "../slots";

const APPROVED = { module: "pa_notification" } as const;
const APPEAL = { module: "appeal" } as const;

/** What the patient has finished before the appeal flow stops asking: the appeal skips onboarding once filed. */
const assumeConsent = (d: { appealStatus: string; consentStatus: string }) => d.appealStatus !== "none" && d.consentStatus === "pending";

export const ENROLLMENT_SCREENS: Screen[] = [
  { path: "/", label: "Home", group: "" },
  { path: "/sms-message", label: "SMS Verification", group: "Enrollment" },
  { path: "/phone-verification", label: "Phone Verification", group: "Enrollment", sticky: true },
  { path: "/otp-verification", label: "OTP Verification", group: "Enrollment" },
  { path: "/confirm-details", label: "Confirm Details & Consent", group: "Enrollment" },
  { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment", sticky: true },
];

export const ENROLLMENT_ROUTES: IaRoute[] = [
  { id: "enrollment.sms.approved", slot: "gate", path: "/sms-message", scope: APPROVED, when: (d) => !d.otpVerified && d.enrollmentInviteSent && !d.smsVerified },
  { id: "enrollment.lock_screen.approved", slot: "gate", path: "/lock-screen", scope: APPROVED, when: (d) => !d.otpVerified && !d.smsVerified },
  { id: "enrollment.otp.approved", slot: "gate", path: "/otp-verification", scope: APPROVED, when: (d) => !d.otpVerified },
  { id: "enrollment.sms.appeal", slot: "gate", path: "/sms-message", scope: APPEAL, when: (d) => !d.otpVerified && !assumeConsent(d) && d.enrollmentInviteSent && !d.smsVerified },
  { id: "enrollment.lock_screen.appeal", slot: "gate", path: "/lock-screen", scope: APPEAL, when: (d) => !d.otpVerified && !assumeConsent(d) && !d.smsVerified },
  { id: "enrollment.otp.appeal", slot: "gate", path: "/otp-verification", scope: APPEAL, when: (d) => !d.otpVerified && !assumeConsent(d) },
  { id: "enrollment.confirm_details.approved", slot: "gate", path: "/confirm-details", scope: APPROVED, when: (d) => d.consentStatus === "pending" },
  { id: "enrollment.confirm_details.appeal", slot: "gate", path: "/confirm-details", scope: APPEAL, when: (d) => d.consentStatus === "pending" && !assumeConsent(d) },
  // BI has not started. It starts with the referral, so this is a moment only.
  { id: "enrollment.waiting_for_bi", slot: "started", path: "/enrollment-complete", when: (d) => d.consentStatus === "confirmed" && d.biStatus === "none" },
];
