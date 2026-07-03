/**
 * Actor Singleton — manages XState actor instance
 *
 * Accepts a FlowType (e.g. "Fax_QS_PA_Approved") for all public APIs.
 * Snapshots are keyed by FlowType so WF1/WF2/WF4 each get their own
 * save slot even though they share the "enrollment" machine.
 * The machine registry ID ("enrollment" | "CoA_DTP") is derived internally.
 *
 * Active workflow is NOT persisted to sessionStorage — persisting it caused
 * actor/demoStore mismatches on refresh. Actor always starts as "enrollment"
 * on page load; per-flow snapshots are in-memory only.
 */

import { createActor } from "xstate";
import { create } from "zustand";
import { workflowMachine } from "./workflowMachine";
import { workflowRegistry } from "./WorkflowRegistry";
import type { FlowType } from "./types";

let actorInstance: ReturnType<typeof createActor> | null = null;
let currentFlowType: FlowType = "Fax_QS_PA_Approved";

// Per-flow snapshots keyed by FlowType — each flow has its own save slot
const actorSnapshots = new Map<FlowType, unknown>();

interface ActorStore {
  actor: ReturnType<typeof createActor>;
  setActor: (actor: ReturnType<typeof createActor>) => void;
}

export const useActorStore = create<ActorStore>((set) => ({
  actor: null as any,
  setActor: (actor) => set({ actor }),
}));

export function getWorkflowActor() {
  if (!actorInstance) {
    actorInstance = createActorForFlow("Fax_QS_PA_Approved");
    useActorStore.getState().setActor(actorInstance);
  }
  return actorInstance;
}

/** Maps a FlowType to the machine registry ID. CoA uses its own machine; all others share "enrollment". */
function machineIdForFlow(flowType: FlowType): string {
  return flowType === "CoA_DTP" ? "CoA_DTP" : "enrollment";
}

export function switchWorkflow(flowType: FlowType): void {
  const machineId = machineIdForFlow(flowType);
  const machine = workflowRegistry.getWorkflow(machineId);
  if (!machine) {
    console.error(`[actorSingleton] Machine "${machineId}" not found in registry`);
    return;
  }

  // Save snapshot keyed by the current FlowType before switching
  if (actorInstance) {
    actorSnapshots.set(currentFlowType, actorInstance.getPersistedSnapshot());
    actorInstance.stop();
    actorInstance = null;
  }

  currentFlowType = flowType;

  // Restore this flow's saved snapshot, or start fresh
  actorInstance = createActorForFlow(flowType, actorSnapshots.get(flowType));
  useActorStore.getState().setActor(actorInstance);
}

export function resetCurrentWorkflowActor(): void {
  if (actorInstance) {
    actorInstance.send({ type: "RESET" } as any);
  }
  actorSnapshots.delete(currentFlowType);
}

function createActorForFlow(
  flowType: FlowType,
  snapshot?: unknown
): ReturnType<typeof createActor> {
  const machineId = machineIdForFlow(flowType);
  const machine = workflowRegistry.getWorkflow(machineId);
  if (!machine) {
    console.error(`[actorSingleton] Machine "${machineId}" not found, falling back to workflowMachine`);
    const actor = createActor(workflowMachine);
    actor.start();
    return actor;
  }

  const actor = snapshot
    ? createActor(machine, { snapshot } as any)
    : createActor(machine);
  actor.start();
  return actor;
}

export function getActiveFlowType(): FlowType {
  return currentFlowType;
}
