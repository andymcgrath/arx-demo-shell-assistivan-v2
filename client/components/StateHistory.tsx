import React from 'react'
import { useWorkflow } from '@/hooks/useWorkflow'
import { cn } from '@/lib/utils'

const PORTAL_COLORS: Record<string, string> = {
  CRM:       'bg-blue-50 text-blue-700',
  Patient:   'bg-emerald-50 text-emerald-700',
  Provider:  'bg-sky-50 text-sky-700',
  Field:     'bg-violet-50 text-violet-700',
  Workforce: 'bg-teal-50 text-teal-700',
  System:    'bg-slate-100 text-slate-600',
}

const EVENT_LABELS: Record<string, string> = {
  PORTAL_LINK_SENT:    'Portal link sent to patient',
  ONBOARDING_COMPLETE: 'Patient onboarding complete',
  BI_COMPLETE:         'Benefits investigation complete',
  PA_SUBMITTED:        'Prior authorization submitted',
  PA_APPROVED:         'Prior authorization approved',
  PATIENT_SCHEDULED:   'Patient scheduled',
  PHARMACY_SELECTED:   'Pharmacy selected',
  DISPATCHED:          'Dispatched to pharmacy',
  DELIVERED:           'Medication delivered',
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const secs   = Math.floor(diffMs / 1000)
  if (secs < 60)  return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins} min ago`
  const hrs  = Math.floor(mins / 60)
  return `${hrs} hr ago`
}

interface Props {
  maxEvents?: number
  filterPortal?: string
}

export default function StateHistory({ maxEvents = 10, filterPortal }: Props) {
  const { events } = useWorkflow()
  const filtered = (filterPortal ? events.filter(e => e.portal === filterPortal) : events)
    .slice(-maxEvents)
    .reverse()

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No events recorded yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Event</th>
            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Portal</th>
            <th className="text-left text-xs font-semibold text-slate-500 py-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((event) => (
            <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-2 pr-4">
                <span className="text-sm font-medium text-slate-800">
                  {EVENT_LABELS[event.eventType] ?? event.eventType}
                </span>
              </td>
              <td className="py-2 pr-4">
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  PORTAL_COLORS[event.portal] ?? 'bg-slate-100 text-slate-600',
                )}>
                  {event.portal}
                </span>
              </td>
              <td className="py-2 text-xs text-slate-400 whitespace-nowrap">
                {relativeTime(event.timestamp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
