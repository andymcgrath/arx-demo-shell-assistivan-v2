import type { ActorRefFrom } from 'xstate';
import { workflowMachine } from './workflowMachine';
import type { WorkflowData } from './types';
import { useWorkflowLogStore } from './workflowLogStore';

let lastObservedState: WorkflowData | null = null;

export function observeWorkflowChanges(actor: ActorRefFrom<typeof workflowMachine>) {
  // Subscribe to ALL state changes from the actor
  const subscription = actor.subscribe((snapshot) => {
    const currentState = snapshot.context.workflowData;

    // Skip if this is the first observation
    if (!lastObservedState) {
      lastObservedState = { ...currentState };
      return;
    }

    // Check if state actually changed
    const changed = hasStateChanged(lastObservedState, currentState);

    if (changed) {
      const changes = findChangedFields(lastObservedState, currentState);

      // Log to store
      try {
        useWorkflowLogStore.getState().addLog({
          eventType: 'STATE_CHANGE',
          flowType: currentState.flowType,
          changes,
          fullState: currentState,
        });
      } catch (err) {
        console.error('[WF] Failed to log state change:', err);
      }

      console.log('[WF] State changed:', changes);
      lastObservedState = { ...currentState };
    }
  });

  // Return an unsubscribe function that handles both function and object returns
  return () => {
    if (typeof subscription === 'function') {
      subscription();
    } else if (subscription && typeof subscription.unsubscribe === 'function') {
      subscription.unsubscribe();
    }
  };
}

function hasStateChanged(before: WorkflowData, after: WorkflowData): boolean {
  for (const key in after) {
    const k = key as keyof WorkflowData;
    if (before[k] !== after[k]) {
      return true;
    }
  }
  return false;
}

function findChangedFields(
  before: WorkflowData,
  after: WorkflowData
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  
  for (const key in after) {
    const k = key as keyof WorkflowData;
    if (before[k] !== after[k]) {
      changes[key] = {
        before: before[k],
        after: after[k],
      };
    }
  }
  
  return changes;
}

export function resetObserver() {
  lastObservedState = null;
}
