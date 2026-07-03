import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkflow, type WorkflowStateName } from '@/hooks/useWorkflow'
import type { PortalName } from '@/providers/WorkflowProvider'

interface Props {
  label: string
  event: string
  activeInState: WorkflowStateName | WorkflowStateName[]
  portal?: PortalName
  delayMs?: number
}

export default function TransitionButton({
  label,
  event,
  activeInState,
  portal = 'System',
  delayMs = 600,
}: Props) {
  const { isInState, isDoneWith, send } = useWorkflow()
  const [isLoading, setIsLoading] = useState(false)

  const activeStates = Array.isArray(activeInState) ? activeInState : [activeInState]
  const isActive = isInState(activeInState)
  const isDone   = activeStates.every(s => isDoneWith(s))

  if (isDone) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
      >
        <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5 shrink-0">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Done
      </button>
    )
  }

  if (!isActive) return null

  const handleClick = () => {
    setIsLoading(true)
    setTimeout(() => {
      send({ type: event } as Parameters<typeof send>[0], portal)
      setIsLoading(false)
    }, delayMs)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border',
        isLoading
          ? 'bg-blue-400 text-white border-blue-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm shadow-blue-200',
      )}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Processing…
        </>
      ) : (
        <>
          {label}
          {portal && (
            <span className="text-[10px] font-normal opacity-70 ml-1 hidden sm:inline">
              ({portal})
            </span>
          )}
        </>
      )}
    </button>
  )
}
