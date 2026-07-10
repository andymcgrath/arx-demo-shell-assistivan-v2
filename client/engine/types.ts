export type PersonaId = 'crm' | 'patient' | 'provider' | 'analytics' | 'field';

export type FlowType = "Fax_QS_PA_Approved" | "Fax_PAP_Audit" | "CoA_DTP" | "iAssist_PA_Approved";

export interface Pharmacy {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
}

export interface WorkflowData {
  flowType: FlowType;
  enrollmentStatus: 'none' | 'pending' | 'invited' | 'enrolled' | 'completed';
  smsVerified: boolean;
  otpVerified: boolean;
  enrollmentInviteSent: boolean;
  enrollmentAcknowledged: boolean;
  welcomeDismissed: boolean;
  consentStatus: 'pending' | 'confirmed';
  paStatus: 'none' | 'submitted' | 'approved' | 'denied';
  cashOfferStatus: 'none' | 'sent' | 'paid';
  paymentVerified: boolean;
  patientShipDate: string | null;
  biStatus: 'none' | 'running' | 'submitted' | 'complete';
  biResult: string | null;
  pharmacyStatus: 'none' | 'processing' | 'ready' | 'shipped' | 'delivered';
  dispatchStatus: 'none' | 'pending_selection' | 'selected' | 'dispatched';
  qsStatus: 'none' | 'active' | 'complete';
  papStatus: 'none' | 'active' | 'complete' | 'audit_pending';
  /** Fax_PAP_Audit only: has CRM texted the patient the "no coverage found,
   *  here's your income check link" message after BI comes back with
   *  no_insurance? Gates access to /income-qualification. */
  papSmsSent: boolean;
  /** Fax_PAP_Audit only: patient's FA eIncome check (IncomeQualification.tsx)
   *  result. 'verified' is what flips papStatus to 'active' and opens up
   *  dispatch/Triage. Unused by other flows. */
  incomeStatus: 'none' | 'pending' | 'verified';
  selectedPharmacy: Pharmacy | null;
  providerPACompleted: boolean;
  paSubmittedAt: string | null;
  paApprovedAt: string | null;
  /** CoA_DTP only: which delivery/pricing path the patient picked on the
   *  Benefit Pricing screen after PA approval. Unused by other flows. */
  pricingOption: 'retail' | 'mail_order' | 'self_pay' | null;
  /** CoA_DTP only: patient re-verification after PA approval (mirrors the
   *  original enrollment SMS/OTP beats). Unused by other flows. */
  paApprovedSmsVerified: boolean;
  paApprovedOtpVerified: boolean;
}

export interface DemoEvent {
  id: string;
  eventType: string;
  portal: PersonaId;
  flowType: FlowType;
  workflowStep: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MachineContext {
  workflowData: WorkflowData;
  events: DemoEvent[];
  _snapshots: MachineContext[];
}
