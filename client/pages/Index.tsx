import React from 'react'
import { cn } from '@/lib/utils'
import DemoHeader from '@/components/DemoHeader'
import CaseStateBar from '@/components/CaseStateBar'
import LaneView from '@/components/LaneView'
import { useWorkflow, STEP_LABELS, type WorkflowStateName } from '@/hooks/useWorkflow'
import type { PortalName } from '@/providers/WorkflowProvider'
import {
  User, Activity, ClipboardList, ShieldCheck,
  Calendar, Package, Truck, Send, FileText, RotateCcw,
} from 'lucide-react'

// ── Action definitions ────────────────────────────────────────────────────────

interface ActionDef {
  id: string
  label: string
  description: string
  icon: React.ElementType
  portal: PortalName
  activeInState: WorkflowStateName | WorkflowStateName[]
  event: string
}

const ACTIONS: ActionDef[] = [
  {
    id: 'send-portal-link',
    label: 'Send Portal Link',
    description: 'Send SMS invitation to the patient portal',
    icon: Send, portal: 'CRM', activeInState: 'referral_received', event: 'PORTAL_LINK_SENT',
  },
  {
    id: 'onboarding-complete',
    label: 'Onboarding Complete',
    description: 'Patient completes enrollment, basic info, and consent',
    icon: User, portal: 'Patient', activeInState: 'patient_onboarding', event: 'ONBOARDING_COMPLETE',
  },
  {
    id: 'bi-complete',
    label: 'BI Complete — PA Required',
    description: 'Automated BI returns: covered, prior authorization required',
    icon: Activity, portal: 'System', activeInState: 'bi_investigation', event: 'BI_COMPLETE',
  },
  {
    id: 'pa-submitted',
    label: 'Submit PA',
    description: 'Provider logs in, completes questionnaire, and submits PA',
    icon: ClipboardList, portal: 'Provider', activeInState: 'pa_submission', event: 'PA_SUBMITTED',
  },
  {
    id: 'pa-approved',
    label: 'PA Approved',
    description: 'Payer approves prior authorization (automated)',
    icon: ShieldCheck, portal: 'System', activeInState: 'pa_pending', event: 'PA_APPROVED',
  },
  {
    id: 'patient-scheduled',
    label: 'Patient Schedules',
    description: 'Patient visits fulfillment center via SMS link',
    icon: Calendar, portal: 'Patient', activeInState: 'patient_scheduling', event: 'PATIENT_SCHEDULED',
  },
  {
    id: 'pharmacy-selected',
    label: 'Select Pharmacy',
    description: 'Patient selects pharmacy — closes missing info task',
    icon: Package, portal: 'Patient', activeInState: 'pharmacy_dispatch', event: 'PHARMACY_SELECTED',
  },
  {
    id: 'dispatched',
    label: 'Dispatch to Pharmacy',
    description: 'Case manager dispatches — pharmacy receives order',
    icon: Truck, portal: 'CRM', activeInState: 'pharmacy_dispatch', event: 'DISPATCHED',
  },
  {
    id: 'delivered',
    label: 'Mark as Delivered',
    description: 'Medication confirmed delivered to patient',
    icon: FileText, portal: 'CRM', activeInState: 'medication_tracking', event: 'DELIVERED',
  },
]

const PORTAL_BADGE: Record<PortalName, string> = {
  CRM:       'bg-blue-50 text-blue-700 border-blue-200',
  Patient:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  Provider:  'bg-sky-50 text-sky-700 border-sky-200',
  Field:     'bg-violet-50 text-violet-700 border-violet-200',
  Workforce: 'bg-teal-50 text-teal-700 border-teal-200',
  System:    'bg-slate-50 text-slate-600 border-slate-200',
}

const EVENT_LABELS: Record<string, string> = {
  PORTAL_LINK_SENT:    'Portal link sent to patient',
  ONBOARDING_COMPLETE: 'Patient onboarding complete',
  BI_COMPLETE:         'Benefits investigation complete — PA required',
  PA_SUBMITTED:        'Prior authorization submitted',
  PA_APPROVED:         'Prior authorization approved',
  PATIENT_SCHEDULED:   'Patient scheduled via fulfillment center',
  PHARMACY_SELECTED:   'Pharmacy selected — missing info task closed',
  DISPATCHED:          'Dispatched to pharmacy',
  DELIVERED:           'Medication delivered',
}

// ── Action panel ──────────────────────────────────────────────────────────────

function ActionPanel() {
  const { isInState, isDoneWith, send } = useWorkflow()
  const [loading, setLoading] = React.useState<string | null>(null)

  const handleClick = (action: ActionDef) => {
    setLoading(action.id)
    setTimeout(() => {
      send({ type: action.event } as Parameters<typeof send>[0], action.portal)
      setLoading(null)
    }, 600)
  }

  return (
    <div className="space-y-2">
      {ACTIONS.map(action => {
        const Icon      = action.icon
        const isActive  = isInState(action.activeInState)
        const isDone    = Array.isArray(action.activeInState)
          ? action.activeInState.every(s => isDoneWith(s))
          : isDoneWith(action.activeInState)
        const isLoading = loading === action.id

        return (
          <button
            key={action.id}
            onClick={() => isActive && !isDone && handleClick(action)}
            disabled={!isActive || isDone || !!loading}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left',
              isDone
                ? 'border-border bg-muted/50 opacity-60 cursor-not-allowed'
                : !isActive
                  ? 'border-border bg-muted/30 opacity-40 cursor-not-allowed text-muted-foreground'
                  : 'bg-card cursor-pointer border-blue-200 hover:border-blue-400 hover:bg-blue-50',
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              isDone || !isActive ? 'bg-muted text-muted-foreground' : 'bg-blue-100 text-blue-600',
            )}>
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : isDone ? (
                <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <Icon size={15} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-tight">{action.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{action.description}</div>
            </div>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded border shrink-0',
              isActive && !isDone ? PORTAL_BADGE[action.portal] : 'bg-muted text-muted-foreground border-border',
            )}>
              {action.portal}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Event log ─────────────────────────────────────────────────────────────────

function EventLog() {
  const { events } = useWorkflow()

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity size={32} className="text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No events yet. Start the workflow to see activity.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {[...events].reverse().map((event, idx) => (
        <div
          key={event.id}
          className={cn(
            'flex gap-3 py-3',
            idx < events.length - 1 && 'border-b border-border',
          )}
        >
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {EVENT_LABELS[event.eventType] ?? event.eventType}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium shrink-0',
                PORTAL_BADGE[event.portal as PortalName] ?? PORTAL_BADGE.System,
              )}>
                {event.portal}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(event.timestamp).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Index() {
  const { state, step, reset } = useWorkflow()
  const currentLabel = STEP_LABELS[step - 1]?.label ?? state

  return (
    <div className="min-h-screen bg-background">
      <DemoHeader activePortal="HUB" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Flow banner */}
        <div className="rounded-xl border px-4 py-3 flex items-center justify-between bg-violet-50 border-violet-200">
          <div className="flex items-center gap-3">
            <ClipboardList size={16} className="text-violet-700 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-700">Fax QS / PA Approved</p>
              <p className="text-xs text-violet-600/80 mt-0.5">Quick Start bridge with full prior authorization</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>

        {/* Workflow stepper */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">Workflow Progress</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {step} of 8 — {currentLabel}
            </p>
          </div>
          <CaseStateBar />
        </div>

        {/* Portal lane grid — 5 portals */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <LaneView portal="CRM" />
          <LaneView portal="Patient" />
          <LaneView portal="Provider" />
          <LaneView portal="Field" />
          <LaneView portal="Workforce" />
        </div>

        {/* Actions + event log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Workflow Actions</h3>
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                Click to advance
              </span>
            </div>
            <ActionPanel />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Event Log</h3>
              <EventLogCount />
            </div>
            <div className="max-h-[520px] overflow-y-auto pr-1 -mr-1">
              <EventLog />
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}

function EventLogCount() {
  const { events } = useWorkflow()
  return (
    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      {events.length} events
    </span>
  )
}
