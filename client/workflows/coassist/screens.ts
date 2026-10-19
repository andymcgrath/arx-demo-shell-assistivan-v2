import type { FlowType } from "@/engine/types";
import type { ScreenMap } from "@/engine/workflow/screens";
import { COASSIST_FLOWS } from "./scenarios";
import { pricingPinNeedsConfirm } from "./forks";

/**
 * CoAssist patient screens: the order the patient sees them, and the hamburger menu.
 *
 * `screens` is the menu, in journey order. `rules` picks the screen for the
 * current data, first match wins. derivePatientRoute and the menu both read this
 * file, so a screen cannot be in one and missing from the other.
 *
 * `sticky` marks screens the patient can sit on while the data has not caught up.
 * StateDrivenNav reads it instead of the old global DELIVERY_FLOW_PATHS list.
 *
 * Scenarios: DTP and Copay share one chain. DME has its own, because its Benefits
 * Investigation has three outcomes (medical covered, pharmacy covered, no coverage).
 */
const DTP: FlowType = "CoA_DTP";
const COPAY: FlowType = "CoA_Copay";
const DME: FlowType = "CoA_DME";
const PA_FLOWS = [DTP, COPAY];
const ORDER_FLOWS = [DTP, COPAY, DME];

export const COASSIST_SCREENS: ScreenMap = {
  flows: COASSIST_FLOWS,
  fallback: "/lock-screen",
  hidden: ["/lock-screen"],

  screens: [
    { path: "/", label: "Home", group: "" },

    { path: "/sms-message", label: "SMS Verification", group: "Enrollment" },
    { path: "/phone-verification", label: "Phone Verification", group: "Enrollment", sticky: true },
    { path: "/otp-verification", label: "OTP Verification", group: "Enrollment" },
    { path: "/confirm-details", label: "Confirm Details & Consent", group: "Enrollment" },
    { path: "/enrollment-complete", label: "Enrollment Complete", group: "Enrollment", sticky: true },

    { path: "/pa-approved-sms", label: "PA Approved SMS", group: "Prior authorization", sticky: true },
    { path: "/pa-approved-otp", label: "PA Approved OTP", group: "Prior authorization", sticky: true },
    { path: "/pa-denied", label: "PA Denied and Cash Offer", group: "Prior authorization", scenarios: PA_FLOWS },

    { path: "/benefit-pricing", label: "Benefit Pricing", group: "Pricing and pharmacy", scenarios: PA_FLOWS, sticky: true },
    { path: "/copay-enroll", label: "Copay Enrollment", group: "Pricing and pharmacy", scenarios: PA_FLOWS, sticky: true },
    { path: "/pharmacy-selection", label: "Pharmacy Selection", group: "Pricing and pharmacy", scenarios: [COPAY], sticky: true },
    { path: "/network-pharmacy-selection", label: "Network Pharmacy Selection", group: "Pricing and pharmacy", scenarios: [DME], sticky: true },
    { path: "/pharmacy-selection-confirmation", label: "Pharmacy Confirmation", group: "Pricing and pharmacy", scenarios: [DME], sticky: true },

    { path: "/cash-offer-sms", label: "Cash Offer SMS", group: "Cash pay", scenarios: [DME] },
    { path: "/pa-denied", label: "No Coverage and Cash Option", group: "Cash pay", scenarios: [DME] },

    { path: "/dme-transfer-sms", label: "Transfer SMS", group: "Provider transfer", scenarios: [DME] },
    { path: "/dme-provider-transfer", label: "DME Provider Transfer", group: "Provider transfer", scenarios: [DME], sticky: true },
    { path: "/pharmacy-transfer", label: "Pharmacy Transfer", group: "Provider transfer", scenarios: [DME], sticky: true },

    { path: "/delivery-address", label: "Delivery Address", group: "{program} order", scenarios: ORDER_FLOWS, sticky: true },
    { path: "/delivery-date", label: "Delivery Date", group: "{program} order", scenarios: ORDER_FLOWS, sticky: true },
    { path: "/delivery-payment", label: "Payment", group: "{program} order", scenarios: ORDER_FLOWS, sticky: true },
    { path: "/delivery-confirmation", label: "Order Confirmation", group: "{program} order", scenarios: ORDER_FLOWS, sticky: true },
    { path: "/order-tracker", label: "Order Tracker", group: "{program} order", scenarios: ORDER_FLOWS, sticky: true },
    { path: "/order-shipped", label: "Order Shipped / In Transit", group: "{program} order", scenarios: ORDER_FLOWS, sticky: true },
    { path: "/medication-delivered", label: "Medication Delivered", group: "{program} order", scenarios: ORDER_FLOWS, sticky: true },
  ],

  rules: [
    // ── Onboarding: same for every CoAssist scenario ──────────────────
    { id: "enrollment.lock_screen", path: "/lock-screen", when: (d) => d.enrollmentStatus === "none" },
    { id: "enrollment.sms", path: "/sms-message", when: (d) => d.enrollmentInviteSent && !d.smsVerified },
    { id: "enrollment.otp", path: "/otp-verification", when: (d) => d.smsVerified && !d.otpVerified },
    { id: "enrollment.confirm_details", path: "/confirm-details", when: (d) => d.otpVerified && d.consentStatus === "pending" },

    // ── DTP and Copay ─────────────────────────────────────────────────
    // Waiting for BI, then for the PA decision.
    { id: "enrollment.waiting_for_bi", path: "/enrollment-complete", scenarios: PA_FLOWS, when: (d) => d.consentStatus === "confirmed" && d.biStatus !== "complete" },
    {
      id: "enrollment.waiting_for_pa",
      path: "/enrollment-complete",
      scenarios: PA_FLOWS,
      when: (d) => d.consentStatus === "confirmed" && d.biStatus === "complete" && (d.paStatus === "none" || d.paStatus === "submitted"),
    },
    // PA approved: SMS and OTP again, then pricing.
    { id: "pa_notification.sms", path: "/pa-approved-sms", scenarios: PA_FLOWS, when: (d) => d.paStatus === "approved" && !d.paApprovedSmsVerified },
    {
      id: "pa_notification.otp",
      path: "/pa-approved-otp",
      scenarios: PA_FLOWS,
      when: (d) => d.paStatus === "approved" && d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
    },
    // A pin on an exit the patient must confirm (the self-pay offer) skips the menu and lands on that screen.
    {
      id: "payment.self_pay_offer",
      path: "/copay-enroll",
      scenarios: [DTP],
      when: (d) => d.paStatus === "approved" && d.paApprovedOtpVerified && d.pricingOption === null && pricingPinNeedsConfirm(d),
    },
    {
      id: "payment.benefit_pricing",
      path: "/benefit-pricing",
      scenarios: PA_FLOWS,
      when: (d) => d.paStatus === "approved" && d.paApprovedOtpVerified && d.pricingOption === null,
    },
    // Copay Retail is filled at a pharmacy counter. No address or ship date. Before the generic address rule.
    { id: "tracking.copay_retail", path: "/order-tracker", scenarios: [COPAY], when: (d) => d.pricingOption === "retail" },
    { id: "scheduling.address", path: "/delivery-address", scenarios: PA_FLOWS, when: (d) => d.paStatus === "approved" && d.pricingOption !== null && d.dispatchStatus === "none" },
    // PA denied: cash offer, payment, then address.
    { id: "cash_offer.pa_denied", path: "/pa-denied", scenarios: PA_FLOWS, when: (d) => d.paStatus === "denied" && d.cashOfferStatus === "none" },
    { id: "payment.delivery_payment", path: "/delivery-payment", scenarios: PA_FLOWS, when: (d) => d.cashOfferStatus === "sent" && !d.paymentVerified },
    { id: "scheduling.address_after_cash_offer", path: "/delivery-address", scenarios: PA_FLOWS, when: (d) => d.cashOfferStatus === "paid" && d.dispatchStatus === "none" },
    // Copay Mail Order ends once the address is set. The filling pharmacy handles the date.
    { id: "tracking.copay_mail_order", path: "/order-tracker", scenarios: [COPAY], when: (d) => d.pricingOption === "mail_order" && d.dispatchStatus !== "none" },
    { id: "scheduling.date", path: "/delivery-date", scenarios: PA_FLOWS, when: (d) => d.dispatchStatus === "selected" && d.patientShipDate === null },
    { id: "tracking.order_confirmed", path: "/enrollment-complete", scenarios: PA_FLOWS, when: (d) => d.patientShipDate !== null && d.pharmacyStatus === "none" },
    { id: "tracking.processing", path: "/order-tracker", scenarios: PA_FLOWS, when: (d) => d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready" },
    { id: "tracking.shipped", path: "/order-shipped", scenarios: PA_FLOWS, when: (d) => d.pharmacyStatus === "shipped" },
    // The tracker already shows a finished "delivered" state.
    { id: "tracking.delivered", path: "/order-tracker", scenarios: PA_FLOWS, when: (d) => d.pharmacyStatus === "delivered" },

    // ── DME ───────────────────────────────────────────────────────────
    // Waiting for BI. Home, not /enrollment-complete: that screen is a one-time confirmation.
    { id: "enrollment.dme_waiting_for_bi", path: "/", scenarios: [DME], when: (d) => d.biStatus !== "complete" },

    // Medical benefit covered always wins: provider transfer.
    { id: "provider_transfer.dme_waiting", path: "/", scenarios: [DME], when: (d) => d.medicalBenefitStatus === "covered" && d.dmeProviderTransferStatus !== "notified" },
    { id: "provider_transfer.dme_sms", path: "/dme-transfer-sms", scenarios: [DME], when: (d) => d.medicalBenefitStatus === "covered" && !d.dmeTransferSmsVerified },
    { id: "provider_transfer.dme_transfer", path: "/dme-provider-transfer", scenarios: [DME], when: (d) => d.medicalBenefitStatus === "covered" },

    // Pharmacy covered: PA, SMS and OTP again, then a network pharmacy. Ends at the tracker.
    { id: "pa_notification.dme_waiting_for_pa", path: "/", scenarios: [DME], when: (d) => d.pharmacyBenefitStatus === "covered" && (d.paStatus === "none" || d.paStatus === "submitted") },
    {
      id: "pa_notification.dme_sms",
      path: "/pa-approved-sms",
      scenarios: [DME],
      when: (d) => d.pharmacyBenefitStatus === "covered" && d.paStatus === "approved" && !d.paApprovedSmsVerified,
    },
    {
      id: "pa_notification.dme_otp",
      path: "/pa-approved-otp",
      scenarios: [DME],
      when: (d) => d.pharmacyBenefitStatus === "covered" && d.paStatus === "approved" && d.paApprovedSmsVerified && !d.paApprovedOtpVerified,
    },
    // The scenario assigns the pharmacy: the patient goes from the OTP straight to the transfer confirmation.
    { id: "pharmacy_selection.dme_transfer", path: "/pharmacy-transfer", scenarios: [DME], when: (d) => d.pharmacyBenefitStatus === "covered" && d.pharmacyAssigned && d.paApprovedOtpVerified },
    { id: "pharmacy_selection.dme_network", path: "/network-pharmacy-selection", scenarios: [DME], when: (d) => d.pharmacyBenefitStatus === "covered" && d.pricingOption === null },
    { id: "tracking.dme_pharmacy_covered", path: "/order-tracker", scenarios: [DME], when: (d) => d.pharmacyBenefitStatus === "covered" },

    // Neither covered: cash offer SMS, cash option, address, date, payment, tracking.
    // The SMS flips to sent in the same step BI completes. Until then, home.
    { id: "cash_offer.dme_waiting_for_sms", path: "/", scenarios: [DME], when: (d) => isNoCoverage(d) && !d.cashOfferSmsSent },
    { id: "cash_offer.dme_sms", path: "/cash-offer-sms", scenarios: [DME], when: (d) => isNoCoverage(d) && !d.cashOfferSmsVerified },
    { id: "cash_offer.dme_no_coverage", path: "/pa-denied", scenarios: [DME], when: (d) => isNoCoverage(d) && d.pricingOption === null },
    {
      id: "scheduling.dme_address",
      path: "/delivery-address",
      scenarios: [DME],
      when: (d) => isNoCoverage(d) && (d.dispatchStatus === "none" || d.dispatchStatus === "pending_selection"),
    },
    { id: "scheduling.dme_date", path: "/delivery-date", scenarios: [DME], when: (d) => isNoCoverage(d) && d.patientShipDate === null },
    { id: "payment.dme_delivery_payment", path: "/delivery-payment", scenarios: [DME], when: (d) => isNoCoverage(d) && !d.paymentVerified },
    { id: "tracking.dme_order_confirmed", path: "/enrollment-complete", scenarios: [DME], when: (d) => isNoCoverage(d) && d.pharmacyStatus === "none" },
    { id: "tracking.dme_processing", path: "/order-tracker", scenarios: [DME], when: (d) => isNoCoverage(d) && (d.pharmacyStatus === "processing" || d.pharmacyStatus === "ready") },
    { id: "tracking.dme_shipped", path: "/order-shipped", scenarios: [DME], when: (d) => isNoCoverage(d) && d.pharmacyStatus === "shipped" },
    { id: "tracking.dme_delivered", path: "/order-tracker", scenarios: [DME], when: (d) => isNoCoverage(d) },

    // BI complete but neither benefit is set. COMPLETE_BI always sets both, so this should not happen.
    { id: "enrollment.dme_fallback", path: "/enrollment-complete", scenarios: [DME] },
  ],
};

function isNoCoverage(d: { pharmacyBenefitStatus: unknown; medicalBenefitStatus: unknown }): boolean {
  return d.pharmacyBenefitStatus === "not_covered" && d.medicalBenefitStatus === "not_covered";
}
