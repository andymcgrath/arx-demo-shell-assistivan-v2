export type PersonaId = 'crm' | 'patient' | 'provider' | 'analytics' | 'field';

// "PrES_PAP" (WF5) — isolated workflow that follows the same overall shape as
// Fax_PAP_Audit (WF2: enrollment -> SMS/OTP -> consent -> BI -> PAP income
// qualification), but captures identity/consent differently (provider
// e-signature intake instead of WF2's fax referral). The real capture
// mechanism/screens are still being designed — see
// client/workflows/presPap.ts and the Provider/Patient placeholder pages
// referenced there for what's foundation-only today.
// "iAssist_PAP" (WF5) — structural clone of WF4 (iAssist_PA_Approved): same
// auto-BI/auto-PA-submission behavior, same portals (iAssist tab, no
// Provider tab). The one difference is the demo's PA resolves to Denied
// instead of Approved, which is meant to lead into an Appeal — today that
// dead-ends exactly like WF4's own PA-denied path does (see
// crm/pages/Index.tsx's appealStage and iAssist Dashboard's "PA Denied"
// status), since Action Factory has no rule to act on a denial yet. This
// flow exists so that gap can be demoed live, then fixed live. NOTE: "PAP"
// here is shorthand tied to this flow's name, unrelated to the "Patient
// Assistance Program" PAP used by Fax_PAP_Audit/PrES_PAP — don't assume it
// shares any of that logic (papSmsSent/papStatus/incomeStatus etc. don't
// apply here).
export type FlowType = "Fax_QS_PA_Approved" | "Fax_PAP_Audit" | "CoA_DTP" | "iAssist_PA_Approved" | "iAssist_PAP" | "PrES_PAP";

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
  /** Fax_PAP_Audit and PrES_PAP: has the Fulfillment Center staged the
   *  "application update" message to the patient after BI comes back with
   *  no_insurance? Mirrors enrollmentInviteSent — gates /pap-update-sms
   *  (Fax_PAP_Audit) / /pes-pap-update-sms (PrES_PAP). */
  papSmsSent: boolean;
  /** Fax_PAP_Audit and PrES_PAP: patient tapped the "application update"
   *  SMS link. Mirrors smsVerified — gates /pap-update-otp for
   *  Fax_PAP_Audit; for PrES_PAP it instead unlocks income verification
   *  from pes-home directly (no separate code-verification screen). */
  papSmsVerified: boolean;
  /** Fax_PAP_Audit only: patient entered the code sent with the
   *  application-update SMS. Mirrors otpVerified — unlocks
   *  /income-qualification. Unused by PrES_PAP (no OTP beat here). */
  papOtpVerified: boolean;
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
  /** iAssist_PAP (WF5) only: tracks the Appeal milestone after a PA denial.
   *  'initiated' is what unlocks dispatch/fulfillment for this flow in place
   *  of paStatus === 'approved' (which this flow's PA never reaches — see
   *  canFillRX in workflows/iAssistPap.ts); fulfillment doesn't wait for
   *  'approved'. 'approved' is a payer-response outcome layered on top,
   *  populated when the CRM agent opens the Appeals stage tab (see
   *  APPROVE_APPEAL/updateApproveAppeal there) — it only changes what the
   *  Appeals stage detail view displays, not what's already unlocked. Stays
   *  'none' for every other flow. */
  appealStatus: 'none' | 'initiated' | 'approved';
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
