import { useWorkflowContext } from '@/providers/WorkflowProvider'
import type { PortalName } from '@/providers/WorkflowProvider'

// WorkflowStateName is a string alias — state names live in each machine file.
// Consumers that want strong types should import directly from the machine.
export type WorkflowStateName = string

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWorkflow() {
  const { state, send, events, reset, flowEntry } = useWorkflowContext()

  const stepLabels    = flowEntry?.stepLabels  ?? []
  const stateToStep   = flowEntry?.stateToStep ?? {}
  const activeLaneMap = flowEntry?.laneMap     ?? {}

  const step      = stateToStep[state] ?? 1
  const stepCount = stepLabels.length

  function isInState(s: WorkflowStateName | WorkflowStateName[]): boolean {
    return Array.isArray(s) ? s.includes(state) : state === s
  }

  function isDoneWith(s: WorkflowStateName): boolean {
    return (stateToStep[state] ?? 0) > (stateToStep[s] ?? 0)
  }

  function getLaneState(portal: PortalName): string {
    return activeLaneMap[state]?.[portal] ?? '—'
  }

  return {
    state,
    step,
    stepCount,
    stepLabels,
    isInState,
    isDoneWith,
    getLaneState,
    send,
    events,
    reset,
    flowEntry,
  }
}
