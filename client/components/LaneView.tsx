import React from 'react'
import { useWorkflow } from '@/hooks/useWorkflow'
import type { PortalName } from '@/providers/WorkflowProvider'
import { cn } from '@/lib/utils'

const PORTAL_COLORS: Record<PortalName, { bg: string; border: string; label: string }> = {
  CRM:       { bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'text-blue-700'    },
  Patient:   { bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'text-emerald-700' },
  Provider:  { bg: 'bg-sky-50',     border: 'border-sky-200',     label: 'text-sky-700'     },
  Field:     { bg: 'bg-violet-50',  border: 'border-violet-200',  label: 'text-violet-700'  },
  Workforce: { bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'text-teal-700'    },
  System:    { bg: 'bg-slate-50',   border: 'border-slate-200',   label: 'text-slate-600'   },
}

interface Props {
  portal: PortalName
}

export default function LaneView({ portal }: Props) {
  const { step, stepCount, getLaneState } = useWorkflow()
  const status = getLaneState(portal)
  const colors = PORTAL_COLORS[portal]

  return (
    <div className={cn('rounded-xl border p-4 space-y-1', colors.bg, colors.border)}>
      <p className={cn('text-xs font-semibold uppercase tracking-wider', colors.label)}>
        {portal}
      </p>
      <p className="text-sm font-medium text-slate-800">{status}</p>
      <p className="text-xs text-slate-400">Step {step} of {stepCount}</p>
    </div>
  )
}
