export type PersonaId = 'crm' | 'patient' | 'provider' | 'analytics' | 'field';

// "PrES_PAP" (WF5) — isolated workflow that follows the same overall shape as
// Fax_PAP_Audit (WF2: enrollment -> SMS/OTP -> consent -> BI -> PAP income
// qualification), but captures identity/consent differently (provider
// e-signature intake instead of WF2's fax referral). The real capture
// mechanism/screens are still being designed — see
// client/workflows/presPap.ts and the provider/Patient placeholder pages
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
// "CoA_Coverage" — Medical-benefit coverage (durable medical equipment, a Dexcom CGM sensor) coverage
// modeled as ONE Benefits Investigation with THREE possible outcomes, driven
// by two granular fields (pharmacyBenefitStatus/medicalBenefitStatus below)
// instead of a single scalar. Shares CoA_DTP's enrollment -> SMS/OTP ->
// consent -> Benefits Investigation shape (see workflows/coassist/):
//   1. Pharmacy covered, medical not — patient picks Retail/Mail Order and
//      ships through AssistRx's own pipeline, same as CoA_DTP, minus PA.
//   2. Both covered (medical always wins) — CoAssist transfers the case to
//      an outside provider (Advanced Diabetes Supply) who owns
//      fulfillment from there; the demo ends at that transfer notification.
//   3. Neither covered — patient is offered a cash-pay option, pays, and
//      ships through the same pipeline as outcome 1.
// None of the three outcomes ever go through Prior Authorization — that
// detour is CoA_DTP-only.
/** A copay claim an HCP filed in iAssist. A new claim is `in_review`. */
export interface CopayClaim {
  id: string;
  dateOfService: string;
  status: 'in_review' | 'paid' | 'rejected';
  submittedAt: string;
}

export type FlowType = "Fax_QS_PA_Approved" | "Fax_PAP_Audit" | "CoA_DTP" | "CoA_Copay" | "iAssist_PA_Approved" | "iAssist_PAP" | "PrES_PAP" | "CoA_Coverage" | "iAssist_Medical_Transfer" | "iAssist_Buy_And_Bill" | "iAssist_Buy_And_Bill_PAP" | "CoA_Medical_Transfer";

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
  /** Set by BI from the `bi` fork's exit. The PA starts only when this is true. */
  paRequired: boolean;
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
  /** CoA_Copay only: true once the patient has enrolled in the Copay Program
   *  (/copay-enroll). Unlike CoA_DTP's self_pay option — which is its own
   *  mutually-exclusive pricing path — CoA_Copay's enrollment is a separate
   *  step that then requires picking Retail or Mail Order as the actual
   *  fulfillment channel (see coaCopay.ts's copayEnrolled state), so this
   *  flag persists alongside pricingOption 'retail'/'mail_order' rather than
   *  pricingOption ever being 'self_pay' for this flow. Stays false for
   *  every other flow, including CoA_DTP. */
  copayEnrolled: boolean;
  /** CoA_DTP only: patient re-verification after PA approval (mirrors the
   *  original enrollment SMS/OTP beats). Unused by other flows. */
  paApprovedSmsVerified: boolean;
  paApprovedOtpVerified: boolean;
  /** iAssist_PAP (WF5) only: tracks the Appeal milestone after a PA denial.
   *  'initiated' is what unlocks dispatch/fulfillment for this flow in place
   *  of paStatus === 'approved' (which this flow's PA never reaches — see
   *  canFillRX in workflows/iassist/rules.ts); fulfillment doesn't wait for
   *  'approved'. 'approved' is a payer-response outcome layered on top,
   *  populated when the CRM agent opens the Appeals stage tab (see
   *  APPROVE_APPEAL/updateApproveAppeal there) — it only changes what the
   *  Appeals stage detail view displays, not what's already unlocked. Stays
   *  'none' for every other flow. */
  appealStatus: 'none' | 'initiated' | 'approved';
  /** iAssist_PAP only: the "Initiate Appeal on PA denial" automation rule was created and activated in the
   *  Rules portal. The CRM reports it with SET_APPEAL_RULE. While true, a denied PA files its appeal on its own. */
  appealRuleActive?: boolean;
  /** iAssist_Buy_And_Bill only: the HCP ran eMedBV on the medical benefit. Absent in every other flow. */
  medbvStatus?: 'complete';
  /** iAssist_Buy_And_Bill only: the copay claims the HCP filed, oldest first. Absent until the first claim. */
  copayClaims?: CopayClaim[];
  /** iAssist_Buy_And_Bill only: when the HCP enrolled the patient in copay. */
  copayEnrolledAt?: string;
  /** iAssist Buy and Bill, patient consent by text: the household the patient confirmed in the patient app. */
  householdSize?: string;
  householdIncome?: string;
  /** iAssist Buy and Bill free drug (PAP): the patient agreed to the credit check with the income application. */
  creditCheckConsented?: boolean;
  /** iAssist Buy and Bill: the recipe asks the patient to confirm household size and income after consenting. Set at the referral. */
  householdRequested?: boolean;
  /** Fax and e-sign workflows: the CRM agent sent the patient their invite text (INVITE). The patient cannot verify before this. */
  patientInvited?: boolean;
  /** iAssist_PAP (WF5) only: the infusion date the patient picks once the
   *  appeal is approved (InfusionDate.tsx). MPX captures it and it's
   *  reflected into iAssist (see Dashboard.tsx's "Infusion Scheduled"
   *  status) — this is WF5's replacement for pharmacyStatus-driven
   *  fulfillment, since this flow dispatches to a site of care instead of
   *  shipping through a pharmacy. Null until the patient picks a date;
   *  stays null for every other flow. */
  infusionDate: string | null;
  /** CoA_Coverage only: has CoAssist notified the outside provider (Advanced
   *  Diabetes Supply) that the case is being transferred to them for
   *  fulfillment? 'notified' is this flow's terminal milestone — reached
   *  specifically when medicalBenefitStatus === 'covered' (regardless of
   *  pharmacyBenefitStatus — medical benefit always takes priority when
   *  covered) and a CRM agent opens the Provider Transfer stage tab (see
   *  workflows/coassist/'s NOTIFY_PROVIDER_TRANSFER and crm/pages/Index.tsx's
   *  PT-14282 stage). Stays 'none' for every other flow. */
  providerTransferStatus: 'none' | 'notified';
  /** CoA_Coverage only: the two Benefits Investigation outcomes driving this
   *  flow's 3 coverage scenarios (see engine/types.ts's FlowType comment and
   *  workflows/coassist/). 'none' until COMPLETE_BI fires; both become
   *  'covered' or 'not_covered' together at that point. Stays 'none' for
   *  every other flow. */
  pharmacyBenefitStatus: 'none' | 'covered' | 'not_covered';
  /** CoA_Coverage only. True when the scenario assigns the pharmacy (a transfer). The patient does not choose one, and
   *  goes from the PA approval SMS to the transfer confirmation. Set by the BI fork's exit. */
  pharmacyAssigned: boolean;
  /** CoA_Coverage only — see pharmacyBenefitStatus above. When this is 'covered',
   *  it always wins over pharmacyBenefitStatus (Scenario 2, Provider
   *  transfer), regardless of pharmacyBenefitStatus's value. Stays 'none'
   *  for every other flow. */
  medicalBenefitStatus: 'none' | 'covered' | 'not_covered';
  /** CoA_Coverage only — Scenario 3's (no coverage) own tap-through SMS, sent
   *  once BI resolves neither-covered (see workflows/coassist/'s SEND_CASH_OFFER_SMS).
   *  Deliberately separate from smsVerified/otpVerified (the initial
   *  enrollment SMS/OTP pair) — represents a real time gap since the
   *  patient last opened the portal, rather than materializing on the
   *  cash-pay info screen (/pa-denied) mid-session. Stays false for every
   *  other flow. */
  cashOfferSmsSent: boolean;
  /** CoA_Coverage only — see cashOfferSmsSent above. True once the patient taps
   *  through the SMS (VERIFY_CASH_OFFER_SMS), which unlocks the cash-pay
   *  info screen (/pa-denied). Stays false for every other flow. */
  cashOfferSmsVerified: boolean;
  /** CoA_Coverage only — Scenario 2's (covered by both) own tap-through SMS,
   *  same shape as cashOfferSmsSent above. Sent as
   *  part of CRM's own NOTIFY_PROVIDER_TRANSFER action (not automatic, see
   *  workflows/coassist/'s biComplete state) — transferring the case to an outside
   *  Provider stays a deliberate CRM hand-off, but the patient still
   *  gets a tap-through SMS before landing on the terminal
   *  /provider-transfer screen. Stays false for every other flow. */
  providerTransferSmsSent: boolean;
  /** CoA_Coverage only — see providerTransferSmsSent above. True once the patient
   *  taps through the SMS (VERIFY_PROVIDER_TRANSFER_SMS), which unlocks
   *  /provider-transfer. Stays false for every other flow. */
  providerTransferSmsVerified: boolean;
  /** CoA_PAP only: has CoAssist referred the case to the manufacturer's patient support program? 'referred' is set when
   *  BI completes on the `no_coverage_pap` exit. Stays 'none' for every other flow. */
  papTransferStatus: 'none' | 'referred';
  /** CoA_PAP only: the transfer text goes out with the referral. Same tap-through shape as providerTransferSmsSent. */
  papTransferSmsSent: boolean;
  /** CoA_PAP only: true once the patient taps the transfer text (VERIFY_PAP_TRANSFER_SMS). */
  papTransferSmsVerified: boolean;
  /**
   * The branch picked at each declared fork, keyed by fork id (for example `{ bi: "no_coverage" }`).
   * The scenario sets the story's default. A demo in the brand file or the presenter can change it.
   * Survives reset, undo, and reload. See `ForkDefinition` in engine/workflow/types.ts.
   */
  choices: Record<string, string>;
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
