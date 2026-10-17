import type { ScreenMap } from "@/engine/workflow/screens";
import { STANDARD_FLOWS } from "./scenarios";

/**
 * Standard (fax) patient screens. See workflows/coassist/screens.ts for how the two lists work.
 * Journey: onboarding, then home while BI and the PA run, then the approved screen until the CRM
 * picks a pharmacy, then tracking.
 */
export const STANDARD_SCREENS: ScreenMap = {
  flows: STANDARD_FLOWS,
  fallback: "/lock-screen",
  hidden: ["/lock-screen"],

  screens: [
    { path: "/", label: "Home", group: "" },

    { path: "/sms-message", label: "SMS Verification", group: "Enrollment" },
    { path: "/phone-verification", label: "Phone Verification", group: "Enrollment", sticky: true },
    { path: "/otp-verification", label: "OTP Verification", group: "Enrollment" },
    { path: "/confirm-details", label: "Confirm Details", group: "Enrollment" },
    { path: "/consent", label: "Consent", group: "Enrollment" },
    { path: "/signature", label: "Signature", group: "Enrollment" },
    { path: "/upload-insurance", label: "Upload Insurance", group: "Enrollment" },
    { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment", sticky: true },

    { path: "/pa-status", label: "PA Submitted", group: "Prior authorization" },
    { path: "/pa-denied", label: "PA Denied / Appeal", group: "Prior authorization" },
    { path: "/pa-approved", label: "PA Approved", group: "Prior authorization" },

    { path: "/delivery-address", label: "Delivery Address", group: "{program} order", sticky: true },
    { path: "/delivery-date", label: "Delivery Date", group: "{program} order", sticky: true },
    { path: "/delivery-confirmation", label: "Order Confirmation", group: "{program} order", sticky: true },
    { path: "/order-tracker", label: "Order Tracker", group: "{program} order", sticky: true },
    { path: "/order-shipped", label: "Order Shipped", group: "{program} order", sticky: true },
    { path: "/medication-delivered", label: "Medication Delivered", group: "{program} order", sticky: true },
  ],

  rules: [
    // ── Onboarding ────────────────────────────────────────────────────
    { path: "/sms-message", when: (d) => !d.otpVerified && d.enrollmentInviteSent && !d.smsVerified },
    { path: "/lock-screen", when: (d) => !d.otpVerified && !d.smsVerified },
    { path: "/otp-verification", when: (d) => !d.otpVerified },
    { path: "/confirm-details", when: (d) => d.consentStatus === "pending" },
    // BI starts on consent, so this is a moment only.
    { path: "/enrollment-complete", when: (d) => d.consentStatus === "confirmed" && d.biStatus === "none" },

    // ── PA ────────────────────────────────────────────────────────────
    { path: "/pa-denied", when: (d) => d.paStatus === "denied" },
    // BI and the PA are in progress. Home shows the waiting view.
    { path: "/", when: (d) => d.biStatus !== "none" && d.paStatus !== "approved" },
    // Approved, and the CRM has not picked a pharmacy yet.
    { path: "/pa-approved", when: (d) => d.paStatus === "approved" && d.pharmacyStatus === "none" && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection") },

    // ── Tracking ──────────────────────────────────────────────────────
    { path: "/medication-delivered", when: (d) => d.pharmacyStatus === "delivered" },
    { path: "/order-shipped", when: (d) => d.pharmacyStatus === "shipped" },
    {
      path: "/order-tracker",
      when: (d) => d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready" || d.dispatchStatus === "selected" || d.dispatchStatus === "dispatched",
    },
  ],
};
