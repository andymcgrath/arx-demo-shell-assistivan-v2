import type { FlowType } from "@/engine/types";
import type { ScreenMap } from "@/engine/workflow/screens";
import { IASSIST_FLOWS } from "./scenarios";

/**
 * iAssist patient screens: the order the patient sees them, and the hamburger menu.
 * See workflows/coassist/screens.ts for how the two lists work.
 *
 * iAssist_PA_Approved: onboarding, PA approved SMS and OTP, pricing, delivery, tracking.
 * iAssist_PAP (appeal): onboarding, PA denied, then the appeal result and the infusion date.
 * The appeal flow never reaches the pricing screens.
 */
const APPROVED: FlowType = "iAssist_PA_Approved";
const APPEAL: FlowType = "iAssist_PAP";

/** What the patient has finished before the appeal flow stops asking: the appeal skips onboarding once filed. */
const assumeConsent = (d: { appealStatus: string; consentStatus: string }) => d.appealStatus !== "none" && d.consentStatus === "pending";

export const IASSIST_SCREENS: ScreenMap = {
  flows: IASSIST_FLOWS,
  fallback: "/lock-screen",
  hidden: ["/lock-screen"],

  screens: [
    { path: "/", label: "Home", group: "" },

    { path: "/sms-message", label: "SMS Verification", group: "Enrollment" },
    { path: "/phone-verification", label: "Phone Verification", group: "Enrollment", sticky: true },
    { path: "/otp-verification", label: "OTP Verification", group: "Enrollment" },
    { path: "/confirm-details", label: "Confirm Details & Consent", group: "Enrollment" },
    { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment", sticky: true },

    { path: "/pa-approved-sms", label: "PA Approved SMS", group: "Prior authorization", scenarios: [APPROVED], sticky: true },
    { path: "/pa-approved-otp", label: "PA Approved OTP", group: "Prior authorization", scenarios: [APPROVED], sticky: true },
    { path: "/pa-denied", label: "PA Denied", group: "Prior authorization" },
    { path: "/pa-approved", label: "Appeal Approved: Schedule Infusion", group: "Prior authorization", scenarios: [APPEAL] },
    { path: "/infusion-date", label: "Infusion Date", group: "Prior authorization", scenarios: [APPEAL], sticky: true },
    { path: "/appointment-confirmation", label: "Appointment Confirmation", group: "Prior authorization", scenarios: [APPEAL], sticky: true },

    { path: "/benefit-pricing", label: "Benefit Pricing", group: "Pricing", scenarios: [APPROVED], sticky: true },
    { path: "/copay-enroll", label: "Copay Enrollment", group: "Pricing", scenarios: [APPROVED], sticky: true },

    { path: "/delivery-address", label: "Delivery Address", group: "{program} order", scenarios: [APPROVED], sticky: true },
    { path: "/delivery-date", label: "Delivery Date", group: "{program} order", scenarios: [APPROVED], sticky: true },
    { path: "/delivery-payment", label: "Payment", group: "{program} order", scenarios: [APPROVED], sticky: true },
    { path: "/delivery-confirmation", label: "Order Confirmation", group: "{program} order", scenarios: [APPROVED], sticky: true },
    { path: "/order-tracker", label: "Order Tracker", group: "{program} order", scenarios: [APPROVED], sticky: true },
    { path: "/order-shipped", label: "Order Shipped / In Transit", group: "{program} order", scenarios: [APPROVED], sticky: true },
    { path: "/medication-delivered", label: "Medication Delivered", group: "{program} order", sticky: true },
  ],

  rules: [
    // ── Onboarding ────────────────────────────────────────────────────
    // The appeal flow races ahead of the patient: BI, the PA and the appeal can all finish before the
    // patient opens the portal. Once an appeal is filed there is nothing left to consent to, so the
    // patient skips straight to the result.
    { path: "/sms-message", scenarios: [APPROVED], when: (d) => !d.otpVerified && d.enrollmentInviteSent && !d.smsVerified },
    { path: "/lock-screen", scenarios: [APPROVED], when: (d) => !d.otpVerified && !d.smsVerified },
    { path: "/otp-verification", scenarios: [APPROVED], when: (d) => !d.otpVerified },
    { path: "/sms-message", scenarios: [APPEAL], when: (d) => !d.otpVerified && !assumeConsent(d) && d.enrollmentInviteSent && !d.smsVerified },
    { path: "/lock-screen", scenarios: [APPEAL], when: (d) => !d.otpVerified && !assumeConsent(d) && !d.smsVerified },
    { path: "/otp-verification", scenarios: [APPEAL], when: (d) => !d.otpVerified && !assumeConsent(d) },
    { path: "/confirm-details", scenarios: [APPROVED], when: (d) => d.consentStatus === "pending" },
    { path: "/confirm-details", scenarios: [APPEAL], when: (d) => d.consentStatus === "pending" && !assumeConsent(d) },

    // BI has not started. It starts with the referral, so this is a moment only.
    { path: "/enrollment-complete", when: (d) => d.consentStatus === "confirmed" && d.biStatus === "none" },

    // ── Appeal (iAssist_PAP) ──────────────────────────────────────────
    // The PA stays denied forever. Once the appeal is approved the patient sees the approval and
    // schedules the infusion. /medication-delivered is the terminal screen.
    { path: "/medication-delivered", scenarios: [APPEAL], when: (d) => d.appealStatus === "approved" && d.infusionDate !== null },
    { path: "/pa-approved", scenarios: [APPEAL], when: (d) => d.appealStatus === "approved" },
    { path: "/pa-denied", when: (d) => d.paStatus === "denied" },

    // Waiting on the PA decision. Home, not /enrollment-complete: that screen is a one-time confirmation.
    { path: "/", when: (d) => d.biStatus !== "none" && d.paStatus !== "approved" },

    // ── PA approved (iAssist_PA_Approved): SMS and OTP again, pricing, address, date, payment, tracking ──
    { path: "/pa-approved-sms", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && !d.paApprovedSmsVerified },
    { path: "/pa-approved-otp", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && !d.paApprovedOtpVerified },
    { path: "/benefit-pricing", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && d.pricingOption === null },
    {
      path: "/delivery-address",
      scenarios: [APPROVED],
      when: (d) => d.paStatus === "approved" && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection"),
    },
    { path: "/delivery-date", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && d.patientShipDate === null },
    // Retail and Mail Order cost is handled at the pharmacy counter. Only self-pay pays here.
    { path: "/delivery-payment", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && d.pricingOption === "self_pay" && !d.paymentVerified },
    { path: "/enrollment-complete", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && d.pharmacyStatus === "none" },
    { path: "/order-tracker", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && (d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready") },
    { path: "/order-shipped", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" && d.pharmacyStatus === "shipped" },
    // The tracker already shows a finished "delivered" state.
    { path: "/order-tracker", scenarios: [APPROVED], when: (d) => d.paStatus === "approved" },
  ],
};
