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
    paRequired: false,
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
    providerTransferStatus: "none",
    pharmacyBenefitStatus: "none",
    pharmacyAssigned: false,
    medicalBenefitStatus: "none",
    cashOfferSmsSent: false,
    cashOfferSmsVerified: false,
    providerTransferSmsSent: false,
    providerTransferSmsVerified: false,
    papTransferStatus: "none",
    papTransferSmsSent: false,
    papTransferSmsVerified: false,
    choices: {},
    ...overrides,
  };
}
