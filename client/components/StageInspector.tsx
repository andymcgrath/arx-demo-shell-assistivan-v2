/**
 * StageInspector — live, stage-scoped view of the active workflow actor.
 *
 * Replaces the old WorkflowLogViewer (removed — it wired a manual
 * actor.subscribe() through a module-level singleton in workflowObserver.ts,
 * which only ever captured the initial snapshot and never picked up later
 * transitions). This reads state the same way the rest of the app does —
 * useSelector(actor, ...) — so it re-renders on every real transition with
 * no side-channel subscription to get out of sync.
 *
 * Rather than logging a history of past events, this shows the CURRENT
 * state, scoped to whichever stage is active, because that's what's useful
 * when driving a demo: "what does the data look like right now."
 *
 * Two machines are live in this app (see actorSingleton.ts), so this file
 * knows about both:
 *   - workflowMachine.ts — parallel machine (Fax_QS_PA_Approved, Fax_PAP_Audit,
 *     iAssist_PA_Approved). "Stage" = whichever of its 4 regions
 *     (enrollment / benefitsInquiry / priorAuth / order) hasn't reached its
 *     terminal state yet.
 *   - coaDtp.ts — a single linear chain (CoA_DTP). "Stage" = the current
 *     state node directly.
 * If either machine's states or fields change, update the maps below to match.
 */
import { useState } from 'react';
import { useSelector } from '@xstate/react';
import { ChevronDown, Copy } from 'lucide-react';
import { useWorkflowActor, useActiveWorkflowId } from '@/engine/WorkflowProvider';
import type { WorkflowData } from '@/engine/types';

// ── Parallel "enrollment" machine ────────────────────────────────────────────

type ParallelRegion = 'enrollment' | 'benefitsInquiry' | 'priorAuth' | 'order';

const PARALLEL_REGION_ORDER: ParallelRegion[] = [
  'enrollment',
  'benefitsInquiry',
  'priorAuth',
  'order',
];

const PARALLEL_REGION_LABELS: Record<ParallelRegion, string> = {
  enrollment: 'Enrollment',
  benefitsInquiry: 'Benefits Investigation',
  priorAuth: 'Prior Authorization',
  order: 'Pharmacy & Delivery',
};

// Node values that mean "this region is done" — the inspector moves on to
// the next region once the active one hits one of these.
const PARALLEL_REGION_TERMINAL: Record<ParallelRegion, string[]> = {
  enrollment: ['consented'],
  benefitsInquiry: ['complete'],
  priorAuth: ['approved', 'denied'],
  order: ['delivered'],
};

// Only these WorkflowData fields are shown while a given region is active.
const PARALLEL_REGION_FIELDS: Record<ParallelRegion, (keyof WorkflowData)[]> = {
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

// ── Linear CoA_DTP machine ────────────────────────────────────────────────────

const COA_STAGES: { state: string; label: string; fields: (keyof WorkflowData)[] }[] = [
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

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? '✓ true' : '✗ false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function fieldLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

const workflowDataEqual = (a: WorkflowData, b: WorkflowData) => {
  for (const key in a) {
    if (a[key as keyof WorkflowData] !== b[key as keyof WorkflowData]) return false;
  }
  return true;
};

export function StageInspector() {
  const actor = useWorkflowActor();
  const flowType = useActiveWorkflowId();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // useSelector re-renders this component on every real transition — no
  // manual subscribe, no module-level state to fall out of sync.
  const stateValue = useSelector(actor, (s) => s.value);
  const workflowData = useSelector(actor, (s) => s.context.workflowData, workflowDataEqual);

  const isCoA = flowType === 'CoA_DTP';

  let stageLabel: string;
  let relevantFields: (keyof WorkflowData)[];
  let regionSummary: { label: string; node: string; active: boolean }[];

  if (isCoA) {
    const current = typeof stateValue === 'string' ? stateValue : 'idle';
    const stage = COA_STAGES.find((s) => s.state === current) ?? COA_STAGES[0];
    stageLabel = stage.label;
    relevantFields = stage.fields;
    regionSummary = [{ label: 'CoA Direct-to-Patient', node: current, active: true }];
  } else {
    const value = (stateValue as Record<ParallelRegion, string>) ?? ({} as Record<ParallelRegion, string>);
    const activeRegion =
      PARALLEL_REGION_ORDER.find((r) => !PARALLEL_REGION_TERMINAL[r].includes(value[r])) ?? 'order';
    stageLabel = `${PARALLEL_REGION_LABELS[activeRegion]} — ${value[activeRegion]}`;
    relevantFields = PARALLEL_REGION_FIELDS[activeRegion];
    regionSummary = PARALLEL_REGION_ORDER.map((r) => ({
      label: PARALLEL_REGION_LABELS[r],
      node: value[r],
      active: r === activeRegion,
    }));
  }

  const fieldsToShow = showAll ? (Object.keys(workflowData) as (keyof WorkflowData)[]) : relevantFields;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(workflowData, null, 2));
  };

  return (
    <div className="fixed bottom-0 right-0 z-40 max-w-sm">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium rounded-tl transition-colors flex items-center gap-2"
      >
        <span className="truncate max-w-[220px]">Stage: {stageLabel}</span>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="bg-slate-900 border-t border-slate-700 max-h-96 w-96 overflow-y-auto text-xs text-slate-200 font-mono">
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between gap-2">
            <span className="text-slate-300 font-semibold truncate">{stageLabel}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showAll ? 'This stage only' : 'Show all fields'}
              </button>
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy full workflow data as JSON"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {!isCoA && (
            <div className="px-4 py-2 border-b border-slate-700 flex flex-wrap gap-x-3 gap-y-1">
              {regionSummary.map((r) => (
                <span key={r.label} className={r.active ? 'text-cyan-400' : 'text-slate-500'}>
                  {r.label}: {r.node}
                </span>
              ))}
            </div>
          )}

          <div className="divide-y divide-slate-800">
            {fieldsToShow.map((key) => (
              <div key={key} className="px-4 py-1.5 flex items-center justify-between gap-3">
                <span className="text-slate-400">{fieldLabel(key)}</span>
                <span className="text-slate-100 text-right truncate max-w-[60%]">
                  {formatValue(workflowData[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default StageInspector;
