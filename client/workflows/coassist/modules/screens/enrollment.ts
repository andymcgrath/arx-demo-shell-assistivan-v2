/** Enrollment screens and route rules. Every CoAssist scenario has them. */
import type { Screen } from "@/engine/workflow/screens";
import { TRANSFER_JOURNEY, PRICING_JOURNEY, type CoaRoute } from "../slots";

const WEB = { module: "enrollment", props: { variant: "web" } } as const;
/** The web page collected consent and verified the patient, so the SMS, phone, code and consent screens never show. */
const NOT_WEB = { not: WEB } as const;

export const ENROLLMENT_SCREENS: Screen[] = [
  { path: "/", label: "Home", group: "", scope: NOT_WEB },
  { path: "/sms-message", label: "SMS Verification", group: "Enrollment", scope: NOT_WEB },
  { path: "/phone-verification", label: "Phone Verification", group: "Enrollment", sticky: true, scope: NOT_WEB },
  { path: "/otp-verification", label: "OTP Verification", group: "Enrollment", scope: NOT_WEB },
  { path: "/confirm-details", label: "Confirm Details & Consent", group: "Enrollment", scope: NOT_WEB },
  { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment", sticky: true },
];

export const ENROLLMENT_ROUTES: CoaRoute[] = [
  { id: "enrollment.lock_screen", slot: "gate", path: "/lock-screen", when: (d) => d.enrollmentStatus === "none" },
  // The patient is still on the client's web page until they tap Enroll there, so the phone stays idle.
  { id: "enrollment.web_waiting_on_page", slot: "gate", path: "/lock-screen", scope: WEB, when: (d) => !d.webHandoff },
  { id: "enrollment.sms", slot: "gate", path: "/sms-message", scope: NOT_WEB, when: (d) => d.enrollmentInviteSent && !d.smsVerified },
  { id: "enrollment.otp", slot: "gate", path: "/otp-verification", scope: NOT_WEB, when: (d) => d.smsVerified && !d.otpVerified },
  { id: "enrollment.confirm_details", slot: "gate", path: "/confirm-details", scope: NOT_WEB, when: (d) => d.otpVerified && d.consentStatus === "pending" },

  // A patient who taps Enroll on the client's web page lands on the copay screen, even while the PA still runs or has
  // already decided. Once they enroll, the waiting screen or the PA-approved text takes over.
  {
    id: "enrollment.web_handoff",
    slot: "awaiting",
    path: "/copay-enroll",
    scope: { module: "enrollment", props: { variant: "web" } },
    when: (d) => d.webHandoff && !d.copayEnrolled && d.pricingOption === null,
  },

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
  // Coverage waits on Home, not /enrollment-complete: that screen is a one-time confirmation.
  { id: "enrollment.coverage_waiting_for_bi", slot: "awaiting", path: "/", scope: TRANSFER_JOURNEY, when: (d) => d.biStatus !== "complete" },

  // BI complete but neither benefit is set. COMPLETE_BI always sets both, so this should not happen.
  { id: "enrollment.coverage_fallback", slot: "fallback", path: "/enrollment-complete", scope: TRANSFER_JOURNEY },
];
