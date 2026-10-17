import type { FlowType } from "@/engine/types";
import type { ScreenMap } from "@/engine/workflow/screens";
import { PAP_FLOWS } from "./scenarios";

/**
 * PAP patient screens. See workflows/coassist/screens.ts for how the two lists work.
 *
 * Fax_PAP_Audit uses the web screens (SMS, code, income form). PrES_PAP is the legacy
 * e-signature intake: it has its own "pes" screens and never shows the lock screen,
 * SMS or code screens, even though its attestation step fires those events in one go.
 */
const FAX: FlowType = "Fax_PAP_Audit";
const PRES: FlowType = "PrES_PAP";

export const PAP_SCREENS: ScreenMap = {
  flows: PAP_FLOWS,
  fallback: "/medication-delivered",
  hidden: ["/lock-screen"],

  screens: [
    { path: "/", label: "Home", group: "", scenarios: [FAX] },
    { path: "/pes-home", label: "Home", group: "", scenarios: [PRES] },

    // Fax PAP
    { path: "/sms-message", label: "SMS Verification", group: "Enrollment Flow", scenarios: [FAX] },
    { path: "/phone-verification", label: "Phone Verification", group: "Enrollment Flow", scenarios: [FAX], sticky: true },
    { path: "/otp-verification", label: "OTP Verification", group: "Enrollment Flow", scenarios: [FAX] },
    { path: "/confirm-details", label: "Confirm Details", group: "Enrollment Flow", scenarios: [FAX] },
    { path: "/consent", label: "Consent", group: "Enrollment Flow", scenarios: [FAX] },
    { path: "/signature", label: "Signature", group: "Enrollment Flow", scenarios: [FAX] },
    { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment Flow", sticky: true },
    { path: "/pap-update-sms", label: "Application Update SMS", group: "Income Verification", scenarios: [FAX] },
    { path: "/pap-update-otp", label: "Application Update Code", group: "Income Verification", scenarios: [FAX] },
    { path: "/income-qualification", label: "Income Verification", group: "Income Verification", scenarios: [FAX] },

    // PrES PAP
    { path: "/pes-attestation", label: "Attestation", group: "Enrollment Flow", scenarios: [PRES], sticky: true },
    { path: "/pes-patient-info", label: "Patient Info", group: "Enrollment Flow", scenarios: [PRES] },
    { path: "/pes-consent", label: "Consent", group: "Enrollment Flow", scenarios: [PRES] },
    { path: "/pes-pap-update-sms", label: "Application Update SMS", group: "Enrollment Flow", scenarios: [PRES] },
    { path: "/pes-income-consent", label: "Income Consent", group: "Income Verification", scenarios: [PRES], sticky: true },
    { path: "/pes-income-submission", label: "Income Submission", group: "Income Verification", scenarios: [PRES] },
    { path: "/pes-pap-terms", label: "PAP Terms", group: "Income Verification", scenarios: [PRES] },

    // Both
    { path: "/delivery-address", label: "Delivery Address", group: "{program} PAP Program Order", sticky: true },
    { path: "/delivery-date", label: "Delivery Date", group: "{program} PAP Program Order", sticky: true },
    { path: "/pap-enrollment-complete", label: "Confirmation", group: "{program} PAP Program Order", scenarios: [FAX] },
    { path: "/pes-confirmation", label: "Confirmation", group: "{program} PAP Program Order", scenarios: [PRES] },
    { path: "/order-tracker", label: "Order Tracker", group: "{program} PAP Program Order", sticky: true },
    { path: "/order-shipped", label: "Order Shipped / In Transit", group: "{program} PAP Program Order", sticky: true },
    { path: "/medication-delivered", label: "Medication Delivered", group: "{program} PAP Program Order", sticky: true },
  ],

  rules: [
    // ── Fax PAP onboarding (the same gates as the other web workflows) ──
    { path: "/sms-message", scenarios: [FAX], when: (d) => !d.otpVerified && d.enrollmentInviteSent && !d.smsVerified },
    { path: "/lock-screen", scenarios: [FAX], when: (d) => !d.otpVerified && !d.smsVerified },
    { path: "/otp-verification", scenarios: [FAX], when: (d) => !d.otpVerified },
    { path: "/confirm-details", scenarios: [FAX], when: (d) => d.consentStatus === "pending" },
    { path: "/enrollment-complete", scenarios: [FAX], when: (d) => d.consentStatus === "confirmed" && d.biStatus === "none" },
    // BI is running, then the Fulfillment Center stages the update and the patient taps through it.
    { path: "/enrollment-complete", scenarios: [FAX], when: (d) => d.incomeStatus !== "verified" && (d.biStatus !== "complete" || !d.papSmsSent) },
    { path: "/pap-update-sms", scenarios: [FAX], when: (d) => d.incomeStatus !== "verified" && !d.papSmsVerified },
    { path: "/pap-update-otp", scenarios: [FAX], when: (d) => d.incomeStatus !== "verified" && !d.papOtpVerified },
    // Code verified. Home explains no coverage was found and offers the program. "Enroll" opens the income form.
    { path: "/", scenarios: [FAX], when: (d) => d.incomeStatus === "none" },
    { path: "/income-qualification", scenarios: [FAX], when: (d) => d.incomeStatus !== "verified" },

    // ── PrES: role selection and attestation, then consent, with no SMS or code screens ──
    { path: "/pes-home", scenarios: [PRES], when: (d) => d.enrollmentStatus === "none" },
    { path: "/pes-patient-info", scenarios: [PRES], when: (d) => d.consentStatus === "pending" },
    // Consent is in. BI runs on its own. The portal parks on home until the Fulfillment Center's update goes out.
    { path: "/pes-home", scenarios: [PRES], when: (d) => d.consentStatus === "confirmed" && !d.papSmsSent },
    { path: "/pes-pap-update-sms", scenarios: [PRES], when: (d) => !d.papSmsVerified },
    { path: "/pes-home", scenarios: [PRES], when: (d) => d.incomeStatus === "none" },
    { path: "/pes-income-submission", scenarios: [PRES], when: (d) => d.incomeStatus !== "verified" },

    // ── Both: income verified, address, date, then the pharmacy ───────
    { path: "/delivery-address", when: (d) => d.pharmacyStatus === "none" && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection") },
    { path: "/delivery-date", when: (d) => d.pharmacyStatus === "none" && d.patientShipDate === null },
    // Nothing more for the patient. The CRM picks the pharmacy and dispatches.
    { path: "/pap-enrollment-complete", scenarios: [FAX], when: (d) => d.pharmacyStatus === "none" },
    { path: "/pes-confirmation", scenarios: [PRES], when: (d) => d.pharmacyStatus === "none" },
    { path: "/order-tracker", when: (d) => d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready" },
    { path: "/order-shipped", when: (d) => d.pharmacyStatus === "shipped" },
    { path: "/medication-delivered" },
  ],
};
