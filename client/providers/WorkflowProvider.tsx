import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { createActor, type AnyActor } from 'xstate'
import { useDemoStore } from '@/store/demoStore'
import type { FlowType } from '@/engine/types'
import { flowRegistry, type FlowRegistryEntry } from '@/machines/flowRegistry'
import { faxQsPaMachine } from '@/machines/faxQsPaMachine'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PortalName = 'CRM' | 'Patient' | 'Provider' | 'Field' | 'Workforce' | 'System'

export interface WorkflowEventRecord {
  id: number
  eventType: string
  portal: PortalName
  timestamp: string
}

interface WorkflowContextValue {
  /** Current state name of the active machine */
  state: string
  send: (event: { type: string } | string, portal?: PortalName) => void
  events: WorkflowEventRecord[]
  reset: () => void
  /** Registry entry for the active flow — undefined if no machine registered */
  flowEntry: FlowRegistryEntry | undefined
}

// ── Context ───────────────────────────────────────────────────────────────────

const WorkflowContext = createContext<WorkflowContextValue | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeActor(flowType: string): AnyActor {
  const entry = flowRegistry[flowType as FlowType]
  const machine = entry?.machine ?? faxQsPaMachine
  return createActor(machine).start() as AnyActor
}

function getInitialFlowType(): string {
  return useDemoStore.getState().flowType
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const flowType    = useDemoStore(s => s.flowType)
  const flowEntry   = flowRegistry[flowType as FlowType]
  const eventIdRef  = useRef(0)

  // Lazy-initialize actor from the current demoStore flowType so it's correct
  // even when the page loads with a non-default flow stored in sessionStorage.
  const actorRef = useRef<AnyActor | null>(null)
  if (actorRef.current === null) {
    actorRef.current = makeActor(getInitialFlowType())
  }

  const [state, setState] = useState<string>(
    () => String(actorRef.current!.getSnapshot().value)
  )
  const [events, setEvents] = useState<WorkflowEventRecord[]>([])

  // Subscribe to the initial actor on mount
  useEffect(() => {
    const sub = actorRef.current!.subscribe(snap => setState(String(snap.value)))
    return () => sub.unsubscribe()
  }, [])

  // Swap actor when flow changes
  useEffect(() => {
    const prev = actorRef.current!
    prev.stop()
    eventIdRef.current = 0

    const next = makeActor(flowType)
    actorRef.current = next
    setState(String(next.getSnapshot().value))
    setEvents([])

    const sub = next.subscribe(snap => setState(String(snap.value)))
    return () => sub.unsubscribe()
  }, [flowType])

  const send = useCallback(
    (event: { type: string } | string, portal: PortalName = 'System') => {
      actorRef.current!.send(event as { type: string })
      eventIdRef.current += 1
      const eventType = typeof event === 'string' ? event : event.type
      setEvents(prev => [
        ...prev,
        {
          id:        eventIdRef.current,
          eventType,
          portal,
          timestamp: new Date().toISOString(),
        },
      ])
    },
    []
  )

  const reset = useCallback(() => {
    const prev = actorRef.current!
    prev.stop()
    eventIdRef.current = 0

    const next = makeActor(flowType)
    actorRef.current = next
    setState(String(next.getSnapshot().value))
    setEvents([])

    next.subscribe(snap => setState(String(snap.value)))
  }, [flowType])

  return (
    <WorkflowContext.Provider value={{ state, send, events, reset, flowEntry }}>
      {children}
    </WorkflowContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWorkflowContext(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext)
  if (!ctx) throw new Error('useWorkflowContext must be used within <WorkflowProvider>')
  return ctx
}
