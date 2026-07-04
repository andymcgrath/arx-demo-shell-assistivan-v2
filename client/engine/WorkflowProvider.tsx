'use client';

import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSelector } from '@xstate/react';
import type { ActorRefFrom } from 'xstate';
import { workflowMachine } from './workflowMachine';
import { getWorkflowActor, switchWorkflow, getActiveFlowType, useActorStore } from './actorSingleton';
import type { MachineContext, PersonaId, DemoEvent, WorkflowData, FlowType } from './types';
import {
  getPersonaActions,
  getPersonaBadge,
  derivePatientRoute,
} from './WorkflowEngine';

type ActorRef = ActorRefFrom<typeof workflowMachine>;

interface WorkflowContextType {
  actor: ActorRef;
  switchWorkflow: (flowType: FlowType) => void;
  getActiveFlowType: () => FlowType;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

interface UsePersonaStateReturn {
  workflowData: WorkflowData;
  events: DemoEvent[];
  availableActions: string[];
  badge: string | null;
  patientRoute: string;
}

interface DispatchPayload {
  [key: string]: unknown;
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const actor = getWorkflowActor(); // ensures actor is initialized

  return (
    <WorkflowContext.Provider
      value={{
        actor,
        switchWorkflow,
        getActiveFlowType,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowActor(): ActorRef {
  const actor = useActorStore((s) => s.actor) as ActorRef;
  if (!actor) {
    throw new Error('useWorkflowActor must be used within WorkflowProvider');
  }
  return actor;
}

export function useSwitchWorkflow(): (flowType: FlowType) => void {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useSwitchWorkflow must be used within WorkflowProvider');
  }
  return context.switchWorkflow;
}

export function useActiveWorkflowId(): FlowType {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useActiveWorkflowId must be used within WorkflowProvider');
  }
  return context.getActiveFlowType();
}

export function usePersonaState(persona: PersonaId): UsePersonaStateReturn {
  const actor = useWorkflowActor();

  const workflowData = useSelector(
    actor,
    (snapshot) => snapshot.context.workflowData,
    (a, b) => {
      for (const key in a) {
        if (a[key as keyof WorkflowData] !== b[key as keyof WorkflowData]) {
          return false;
        }
      }
      return true;
    }
  );
  const events = useSelector(
    actor,
    (snapshot) => snapshot.context.events,
    (a, b) => a.length === b.length && a.every((e, i) => e.id === b[i]?.id)
  );

  const machineContext = {
    workflowData,
    events,
    _snapshots: [],
  };

  return {
    workflowData,
    events,
    availableActions: getPersonaActions(machineContext, persona),
    badge: getPersonaBadge(machineContext, persona),
    patientRoute: derivePatientRoute(machineContext),
  };
}

export function useWorkflowDispatch(): (
  eventType: string,
  payload?: DispatchPayload
) => void {
  const actor = useWorkflowActor();

  return useCallback(
    (eventType: string, payload?: DispatchPayload) => {
      actor.send({
        type: eventType,
        ...(payload || {}),
      } as { type: string; [key: string]: unknown });
    },
    [actor]
  );
}

export default WorkflowProvider;
