/**
 * Actor Singleton — manages XState actor instance
 *
 * Accepts a FlowType (e.g. "Fax_QS_PA_Approved") for all public APIs.
 * Snapshots are keyed by FlowType so WF1/WF2/WF4 each get their own
 * save slot even though they share the "enrollment" machine.
 * The machine registry ID ("enrollment" | "CoA_DTP") is derived internally.
 *
 * Per-flow snapshots are kept in an in-memory Map (actorSnapshots) for
 * same-session flow switching, AND mirrored to sessionStorage on every
 * transition (see persistSnapshot/loadPersistedSnapshot) so progress
 * survives a page reload — not just a flow switch. Reloads happen more
 * often than you'd expect mid-demo (dev-server HMR full-reloads, a builder
 * preview refreshing, an actual browser refresh), and losing workflowData
 * on any of those looks identical to "switching portals resets the demo."
 *
 * A previous attempt at this (sessionStorage key "arxWorkflow_v2", now
 * removed) reportedly caused "actor/demoStore mismatches on refresh." The
 * likely failure mode: trusting the actor's own persisted flowType instead
 * of demoStore's. To avoid that, restoration here is ALWAYS keyed by the
 * flowType argument the caller passes in (which ultimately comes from
 * demoStore, e.g. DemoShell's mount effect calling switchWorkflow(storedFlow))
 * — exactly the same source of truth same-session flow switching already
 * uses. Never key a restore off data embedded in the snapshot itself.
 */

import { createActor } from "xstate";
import { create } from "zustand";
import { workflowMachine } from "./workflowMachine";
import { workflowRegistry } from "./WorkflowRegistry";
import type { FlowType } from "./types";

let actorInstance: ReturnType<typeof createActor> | null = null;
let currentFlowType: FlowType = "Fax_QS_PA_Approved";

// Per-flow snapshots keyed by FlowType — each flow has its own save slot.
// Fast in-memory cache; sessionStorage (below) is the durable backing store.
const actorSnapshots = new Map<FlowType, unknown>();

const SNAPSHOT_STORAGE_KEY = "arx-workflow-snapshots";

function readSnapshotStore(): Partial<Record<FlowType, unknown>> {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadPersistedSnapshot(flowType: FlowType): unknown {
  return readSnapshotStore()[flowType];
}

function persistSnapshot(flowType: FlowType, snapshot: unknown): void {
  try {
    const all = readSnapshotStore();
    all[flowType] = snapshot;
    sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // sessionStorage unavailable (private browsing, quota, etc.) — the
    // in-memory Map above still covers same-session flow switching, this
    // only means a hard reload won't be able to restore progress.
  }
}

function clearPersistedSnapshot(flowType: FlowType): void {
  try {
    const all = readSnapshotStore();
    delete all[flowType];
    sessionStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // no-op — see persistSnapshot
  }
}

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

/** Maps a FlowType to the machine registry ID. CoA and iAssist each have their own dedicated machine; the two Fax flows share "enrollment". */
function machineIdForFlow(flowType: FlowType): string {
  if (flowType === "CoA_DTP") return "CoA_DTP";
  if (flowType === "iAssist_PA_Approved") return "iAssist_PA_Approved";
  return "enrollment";
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
    const snapshot = actorInstance.getPersistedSnapshot();
    actorSnapshots.set(currentFlowType, snapshot);
    persistSnapshot(currentFlowType, snapshot);
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
  clearPersistedSnapshot(currentFlowType);
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

  // Restore priority: explicit snapshot arg (in-memory, same-session flow
  // switch) > sessionStorage (survives a reload) > fresh machine defaults.
  // Both are keyed strictly by the flowType argument — see file header on
  // why we never trust a flowType embedded inside the snapshot itself.
  const restoreFrom = snapshot ?? loadPersistedSnapshot(flowType);

  const actor = restoreFrom
    ? createActor(machine, { snapshot: restoreFrom } as any)
    : createActor(machine);
  actor.start();

  // Keep sessionStorage in sync with every future transition on this actor,
  // not just at flow-switch time — a reload mid-flow (e.g. mid-enrollment,
  // before ever switching flows) must restore too.
  actor.subscribe(() => {
    persistSnapshot(flowType, actor.getPersistedSnapshot());
  });

  return actor;
}

export function getActiveFlowType(): FlowType {
  return currentFlowType;
}
