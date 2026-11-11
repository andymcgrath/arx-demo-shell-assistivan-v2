/** Enrollment screens and route rules. Every CoAssist scenario has them. */
import type { Screen } from "@/engine/workflow/screens";
import { assignedWithoutPa } from "../shared";
import { TRANSFER_JOURNEY, PRICING_JOURNEY, type CoaRoute } from "../slots";

const WEB = { module: "enrollment", props: { variant: "web" } } as const;
/** The web page collected consent and verified the patient, so the SMS, phone, code and consent screens never show. */
const NOT_WEB = { not: WEB } as const;

export const ENROLLMENT_SCREENS: Screen[] = [
  { path: "/", label: "Home", group: "", scope: NOT_WEB },
  // The web variant has no Home, except where the free drug program uses it: the waiting screen and the program offer.
  { path: "/", label: "Home", group: "", scope: [WEB, { module: "income_qualification" }] },
  { path: "/sms-message", label: "SMS Verification", group: "Enrollment", scope: NOT_WEB },
  { path: "/phone-verification", label: "Phone Verification", group: "Enrollment", sticky: true, scope: NOT_WEB },
  { path: "/otp-verification", label: "OTP Verification", group: "Enrollment", scope: NOT_WEB },
  { path: "/confirm-details", label: "Confirm Details & Consent", group: "Enrollment", scope: NOT_WEB },
  { path: "/coverage-summary", label: "Coverage Summary", group: "Enrollment", scope: WEB },
  { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment", sticky: true },
];

export const ENROLLMENT_ROUTES: CoaRoute[] = [
  { id: "enrollment.lock_screen", slot: "gate", path: "/lock-screen", when: (d) => d.enrollmentStatus === "none" },
  // The patient is on the client's web page while BI and the PA run, so the phone stays idle until the PA decides.
  { id: "enrollment.web_waiting_on_page", slot: "gate", path: "/lock-screen", scope: WEB, when: (d) => (d.paStatus === "none" || d.paStatus === "submitted") && !assignedWithoutPa(d) },
  { id: "enrollment.sms", slot: "gate", path: "/sms-message", scope: NOT_WEB, when: (d) => d.enrollmentInviteSent && !d.smsVerified },
  { id: "enrollment.otp", slot: "gate", path: "/otp-verification", scope: NOT_WEB, when: (d) => d.smsVerified && !d.otpVerified },
  { id: "enrollment.confirm_details", slot: "gate", path: "/confirm-details", scope: NOT_WEB, when: (d) => d.otpVerified && d.consentStatus === "pending" },

  // The PA approved while the patient was on the client's page. They see the coverage summary first, and Check Pricing
  // moves them on. The PA-approved text and code are skipped, because the summary already showed the approval.
  {
    id: "enrollment.web_coverage_summary",
    slot: "awaiting",
    path: "/coverage-summary",
    scope: WEB,
    when: (d) => d.paStatus === "approved" && !d.pricingChecked,
  },

  // HCP enrollment ends here. Consent is in, and there is no BI, PA, or order to wait for.
  {
    id: "enrollment.hcp_complete",
    slot: "awaiting",
    path: "/enrollment-complete",
    scope: { module: "enrollment", props: { variant: "hcp" } },
    when: (d) => d.consentStatus === "confirmed",
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
