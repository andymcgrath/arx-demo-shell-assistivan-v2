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

// ── Regions (derived from WorkflowData, see regionsFromData) ─────────────────

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

/**
 * The four regions, read off WorkflowData. The workflow machines have one state, so the
 * inspector cannot read regions from the machine. Every region is a function of the data.
 */
export function regionsFromData(d: WorkflowData): Record<ParallelRegion, string> {
  const enrollment =
    d.enrollmentStatus === 'none' ? 'idle'
    : d.consentStatus === 'confirmed' ? 'consented'
    : d.otpVerified ? 'otp_verified'
    : d.smsVerified ? 'sms_verified'
    : 'invited';
  const benefitsInquiry = d.biStatus === 'none' ? 'idle' : d.biStatus === 'running' ? 'submitted' : 'complete';
  const priorAuth = d.paStatus === 'none' ? 'idle' : d.paStatus;
  const order =
    d.pharmacyStatus === 'none' ? 'idle'
    : d.pharmacyStatus === 'ready' ? 'processing'
    : d.pharmacyStatus;
  return { enrollment, benefitsInquiry, priorAuth, order };
}

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
