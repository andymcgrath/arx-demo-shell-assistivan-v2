import type { FlowType, WorkflowData } from "@/engine/types";

/**
 * The one starting WorkflowData. Every workflow used to carry its own copy
 * of this literal, and the copies drifted (four fields went missing from
 * five of them). Build from here and override only what differs.
 */
export function createInitialWorkflowData(
  flowType: FlowType,
  overrides: Partial<WorkflowData> = {},
): WorkflowData {
  return {
    flowType,
    enrollmentStatus: "none",
    smsVerified: false,
    otpVerified: false,
    enrollmentInviteSent: false,
    enrollmentAcknowledged: false,
    welcomeDismissed: false,
    consentStatus: "pending",
    paStatus: "none",
    biStatus: "none",
    biResult: null,
    pharmacyStatus: "none",
    dispatchStatus: "none",
    qsStatus: "none",
    papStatus: "none",
    papSmsSent: false,
    papSmsVerified: false,
    papOtpVerified: false,
    incomeStatus: "none",
    selectedPharmacy: null,
    providerPACompleted: false,
    paSubmittedAt: null,
    paApprovedAt: null,
    cashOfferStatus: "none",
    paymentVerified: false,
    patientShipDate: null,
    pricingOption: null,
    copayEnrolled: false,
    paApprovedSmsVerified: false,
    paApprovedOtpVerified: false,
    appealStatus: "none",
    infusionDate: null,
    dmeProviderTransferStatus: "none",
    pharmacyBenefitStatus: "none",
    medicalBenefitStatus: "none",
    cashOfferSmsSent: false,
    cashOfferSmsVerified: false,
    dmeTransferSmsSent: false,
    dmeTransferSmsVerified: false,
    ...overrides,
  };
}
