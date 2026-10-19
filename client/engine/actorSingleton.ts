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
import { workflowRegistry } from "./WorkflowRegistry";
import type { FlowType } from "./types";
import { BRAND, DEFAULT_FLOW, findDemo, isFlowEnabled } from "@/brand";
import { snapshotHasChoices } from "./snapshotChoices";
let actorInstance: ReturnType<typeof createActor> | null = null;
let currentFlowType: FlowType = DEFAULT_FLOW;

// demoStore.ts (zustand + persist) is the source of truth for which flow is
// active, but actorSingleton.ts can't import it directly — demoStore.ts
// already imports resetCurrentWorkflowActor from here, and the reverse
// import would be circular. Reading zustand's own persisted blob directly
// avoids that without needing a second source of truth.
//
// This matters because getWorkflowActor() below used to always default to
// "Fax_QS_PA_Approved" on its very first call, no matter what flow was
// actually persisted. That first call happens inside engine/WorkflowProvider
// during React's initial render — before DemoShell's mount effect (the
// useEffect that calls switchWorkflow(storedFlow) to correct it) has had a
// chance to run. Every portal is mounted simultaneously (see DemoShell's
// display:none panel structure), so on that very first render they were ALL
// reading from a freshly-created WF1 actor for one render pass, correcting
// only once the effect fired a moment later. Usually fast enough to be
// invisible, but landing on this exact window — e.g. Provider and Patient
// mounting/re-rendering around the same moment — could visibly show WF1
// data before snapping back, which is what "once in a while, switching
// from WF3 back to WF1" actually was. Reading the persisted flow up front
// removes the window entirely instead of racing to correct it after.
function readPersistedFlowType(): FlowType {
  try {
    const raw = sessionStorage.getItem("arx-demo-shell");
    if (!raw) return DEFAULT_FLOW;
    const flowType = JSON.parse(raw)?.state?.flowType as string | undefined;
    // A flow this brand does not enable (an old session, or another brand) falls back to the start flow.
    return isFlowEnabled(flowType) ? flowType : DEFAULT_FLOW;
  } catch (e) {
    return DEFAULT_FLOW;
  }
}

// Per-flow snapshots keyed by FlowType — each flow has its own save slot.
// Fast in-memory cache; sessionStorage (below) is the durable backing store.
const actorSnapshots = new Map<FlowType, unknown>();

// v2: the CoAssist machines were rebuilt (refactor step 01), so snapshots saved by the old
// state-graph machines cannot restore. Bump this whenever a machine's shape changes.
// v4: workflowData gained `choices` (fork picks), so older snapshots lack it.
// v5: a fresh machine now starts on the selected demo's branches, so older snapshots hold the wrong branch.
const SNAPSHOT_STORAGE_KEY = "arx-workflow-snapshots-v5";

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
  } catch (e) {
    // sessionStorage unavailable (private browsing, quota, etc.) — the
    // in-memory Map above still covers same-session flow switching, this
    // only means a hard reload won't be able to restore progress. Log it so
    // a quota failure (which silently freezes reload-restore at whatever
    // stage last fit) is visible instead of looking like a random regression.
    console.warn(`[actorSingleton] Failed to persist "${flowType}" workflow snapshot — a reload will restore stale progress from before this point`, e);
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
    currentFlowType = readPersistedFlowType();
    actorInstance = createActorForFlow(currentFlowType);
    useActorStore.getState().setActor(actorInstance);
  }
  return actorInstance;
}

/** Every flow is registered under its own FlowType, so the registry id is the FlowType. */
function machineIdForFlow(flowType: FlowType): string {
  return flowType;
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

/**
 * Wipes every flow's saved progress — not just the currently active one.
 * "Reset All" only reset the current flow's slot; any OTHER flow's snapshot
 * (in-memory Map entry and its sessionStorage sub-key) survived untouched.
 * That's how a case's progress from earlier in the session — including one
 * captured before a machine definition change — could silently resurface
 * (restored into a machine whose states/events have since changed) the next
 * time someone switched back to that flow, looking exactly like "the demo
 * reverted." Call this from any "reset everything" action so switching back
 * to any flow afterward always starts genuinely fresh.
 */
export function resetAllWorkflowSnapshots(): void {
  actorSnapshots.clear();
  try {
    sessionStorage.removeItem(SNAPSHOT_STORAGE_KEY);
  } catch {
    // no-op — see persistSnapshot
  }
}

/**
 * The branches a fresh machine starts on: the selected demo's, or the first demo on this flow.
 * Without this, a new session shows the scenario's default branch instead of the demo the client picked.
 * Reads the stored demo id directly for the same circular-import reason as readPersistedFlowType.
 */
function startingChoices(flowType: FlowType): Record<string, string> | undefined {
  let stored: string | undefined;
  try {
    stored = JSON.parse(sessionStorage.getItem("arx-demo-shell") ?? "null")?.state?.demoId;
  } catch {
    stored = undefined;
  }
  const picked = findDemo(stored);
  const demo = picked && picked.flow === flowType ? picked : BRAND.demos.find((d) => d.flow === flowType);
  return demo?.choices;
}

function createActorForFlow(
  flowType: FlowType,
  snapshot?: unknown
): ReturnType<typeof createActor> {
  const machineId = machineIdForFlow(flowType);
  const machine = workflowRegistry.getWorkflow(machineId);
  if (!machine) {
    throw new Error(`[actorSingleton] No machine registered for "${machineId}"`);
  }

  // Restore priority: explicit snapshot arg (in-memory, same-session flow
  // switch) > sessionStorage (survives a reload) > fresh machine defaults.
  // Both are keyed strictly by the flowType argument — see file header on
  // why we never trust a flowType embedded inside the snapshot itself.
  let restoreFrom = snapshot ?? loadPersistedSnapshot(flowType);
  // A saved run on a different branch than the selected demo pins is stale. Start fresh on the demo's branches.
  if (restoreFrom && !snapshotHasChoices(restoreFrom, startingChoices(flowType))) {
    clearPersistedSnapshot(flowType);
    restoreFrom = undefined;
  }

  const freshActor = () => createActor(machine, { input: { flowType, choices: startingChoices(flowType) } } as any);
  let actor: ReturnType<typeof createActor>;
  if (restoreFrom) {
    try {
      actor = createActor(machine, { snapshot: restoreFrom } as any);
    } catch (e) {
      // A snapshot saved by an older machine shape can fail to restore. Start fresh instead of crashing the demo.
      console.warn(`[actorSingleton] Could not restore "${flowType}" snapshot, starting fresh`, e);
      clearPersistedSnapshot(flowType);
      actor = freshActor();
    }
  } else {
    actor = freshActor();
  }
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
