/**
 * Config + helpers for StageInspector.tsx, split into its own module on
 * purpose: a .tsx file that exports plain constants/functions alongside a
 * component breaks React Fast Refresh (Vite can't verify the non-component
 * exports are safe to hot-swap, so it falls back to a full page reload).
 * A full reload wipes the in-memory XState actor — workflowData is
 * intentionally NOT persisted to sessionStorage (see actorSingleton.ts) — so
 * every edit to StageInspector.tsx was silently resetting whatever demo
 * progress was live in the browser. Keeping this file free of React
 * components keeps StageInspector.tsx itself Fast-Refresh-safe.
 */
import type { WorkflowData } from './types';

// ── Parallel "enrollment" machine (workflowMachine.ts) ───────────────────────

export type ParallelRegion = 'enrollment' | 'benefitsInquiry' | 'priorAuth' | 'order';

export const PARALLEL_REGION_ORDER: ParallelRegion[] = [
  'enrollment',
  'benefitsInquiry',
  'priorAuth',
  'order',
];

export const PARALLEL_REGION_LABELS: Record<ParallelRegion, string> = {
  enrollment: 'Enrollment',
  benefitsInquiry: 'Benefits Investigation',
  priorAuth: 'Prior Authorization',
  order: 'Pharmacy & Delivery',
};

// Node values that mean "this region is done" — the inspector moves on to
// the next region once the active one hits one of these.
export const PARALLEL_REGION_TERMINAL: Record<ParallelRegion, string[]> = {
  enrollment: ['consented'],
  benefitsInquiry: ['complete'],
  priorAuth: ['approved', 'denied'],
  order: ['delivered'],
};

// Only these WorkflowData fields are shown while a given region is active.
export const PARALLEL_REGION_FIELDS: Record<ParallelRegion, (keyof WorkflowData)[]> = {
  enrollment: [
    'enrollmentStatus',
    'enrollmentInviteSent',
    'smsVerified',
    'otpVerified',
    'consentStatus',
    'enrollmentAcknowledged',
  ],
  benefitsInquiry: ['biStatus', 'biResult'],
  priorAuth: ['paStatus', 'paSubmittedAt', 'paApprovedAt', 'providerPACompleted'],
  order: [
    'dispatchStatus',
    'selectedPharmacy',
    'pharmacyStatus',
    'patientShipDate',
    'cashOfferStatus',
    'paymentVerified',
  ],
};

// ── Linear CoA_DTP machine (workflows/coaDtp.ts) ─────────────────────────────

export const COA_STAGES: { state: string; label: string; fields: (keyof WorkflowData)[] }[] = [
  { state: 'idle', label: 'Awaiting enrollment', fields: ['enrollmentStatus'] },
  { state: 'enrolled', label: 'Enrolled — awaiting SMS verification', fields: ['enrollmentStatus', 'enrollmentInviteSent', 'smsVerified'] },
  { state: 'smsVerified', label: 'SMS verified — awaiting OTP', fields: ['smsVerified', 'otpVerified'] },
  { state: 'otpVerified', label: 'OTP verified — awaiting consent', fields: ['otpVerified', 'consentStatus'] },
  { state: 'consentConfirmed', label: 'Consent confirmed — ready for BI', fields: ['consentStatus'] },
  { state: 'biRunning', label: 'Benefits investigation running', fields: ['biStatus'] },
  { state: 'biComplete', label: 'BI complete — ready for PA', fields: ['biStatus', 'biResult'] },
  { state: 'paSubmitted', label: 'PA submitted', fields: ['paStatus', 'paSubmittedAt'] },
  { state: 'paDenied', label: 'PA denied — cash pay offered', fields: ['paStatus', 'cashOfferStatus'] },
  { state: 'cashOfferSent', label: 'Cash offer sent', fields: ['cashOfferStatus'] },
  { state: 'paymentProcessed', label: 'Payment processed — verifying', fields: ['cashOfferStatus', 'paymentVerified'] },
  { state: 'paymentVerified', label: 'Payment verified — needs address', fields: ['paymentVerified', 'dispatchStatus'] },
  { state: 'addressSet', label: 'Address set — needs ship date', fields: ['dispatchStatus', 'patientShipDate'] },
  { state: 'shipDateSelected', label: 'Ship date selected — ready to fill', fields: ['patientShipDate'] },
  { state: 'rxProcessing', label: 'Pharmacy processing', fields: ['pharmacyStatus'] },
  { state: 'rxReady', label: 'Ready to ship', fields: ['pharmacyStatus'] },
  { state: 'rxShipped', label: 'Shipped', fields: ['pharmacyStatus'] },
  { state: 'rxDelivered', label: 'Delivered', fields: ['pharmacyStatus'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '✓ true' : '✗ false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function fieldLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

export const workflowDataEqual = (a: WorkflowData, b: WorkflowData) => {
  for (const key in a) {
    if (a[key as keyof WorkflowData] !== b[key as keyof WorkflowData]) return false;
  }
  return true;
};
