/** Enrollment screens and route rules. Every CoAssist scenario has them. */
import type { Screen } from "@/engine/workflow/screens";
import { TRANSFER_JOURNEY, PRICING_JOURNEY, type CoaRoute } from "../slots";

export const ENROLLMENT_SCREENS: Screen[] = [
  { path: "/", label: "Home", group: "" },
  { path: "/sms-message", label: "SMS Verification", group: "Enrollment" },
  { path: "/phone-verification", label: "Phone Verification", group: "Enrollment", sticky: true },
  { path: "/otp-verification", label: "OTP Verification", group: "Enrollment" },
  { path: "/confirm-details", label: "Confirm Details & Consent", group: "Enrollment" },
  { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment", sticky: true },
];

export const ENROLLMENT_ROUTES: CoaRoute[] = [
  { id: "enrollment.lock_screen", slot: "gate", path: "/lock-screen", when: (d) => d.enrollmentStatus === "none" },
  { id: "enrollment.sms", slot: "gate", path: "/sms-message", when: (d) => d.enrollmentInviteSent && !d.smsVerified },
  { id: "enrollment.otp", slot: "gate", path: "/otp-verification", when: (d) => d.smsVerified && !d.otpVerified },
  { id: "enrollment.confirm_details", slot: "gate", path: "/confirm-details", when: (d) => d.otpVerified && d.consentStatus === "pending" },

  // DTP and Copay wait on /enrollment-complete: first for BI, then for the PA decision.
  {
    id: "enrollment.waiting_for_bi",
    slot: "awaiting",
    path: "/enrollment-complete",
    scope: PRICING_JOURNEY,
    when: (d) => d.consentStatus === "confirmed" && d.biStatus !== "complete",
  },
  {
    id: "enrollment.waiting_for_pa",
    slot: "awaiting",
    path: "/enrollment-complete",
    scope: PRICING_JOURNEY,
    when: (d) => d.consentStatus === "confirmed" && d.biStatus === "complete" && (d.paStatus === "none" || d.paStatus === "submitted"),
  },
  // DME waits on Home, not /enrollment-complete: that screen is a one-time confirmation.
  { id: "enrollment.dme_waiting_for_bi", slot: "awaiting", path: "/", scope: TRANSFER_JOURNEY, when: (d) => d.biStatus !== "complete" },

  // BI complete but neither benefit is set. COMPLETE_BI always sets both, so this should not happen.
  { id: "enrollment.dme_fallback", slot: "fallback", path: "/enrollment-complete", scope: TRANSFER_JOURNEY },
];
