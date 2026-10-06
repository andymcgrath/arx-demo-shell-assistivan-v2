# ARX Demo Shell Architecture

**Core principle:** XState is the single source of truth for all workflow state. Zustand's `demoStore` holds only shell infrastructure: which flow is active and a couple of UI/reset flags. It does not hold patient identity, Rx, or order data anymore.

This document reflects the current architecture. An earlier revision described a transitional "XState + Zustand hybrid," where Zustand still held identity fields and action bridges. That stage is gone; everything workflow-related now lives in the XState actor.

---

## Workflow layer: XState machines

**Where:** `client/engine/workflowMachine.ts`, plus one dedicated machine per newer workflow in `client/workflows/`:

- `coaDtp.ts` — CoA_DTP
- `coaCopay.ts` — CoA_Copay
- `iAssist.ts` — iAssist_PA_Approved
- `iAssistPap.ts` — iAssist_PAP
- `presPap.ts` — PrES_PAP

`Fax_QS_PA_Approved` and `Fax_PAP_Audit` share `workflowMachine.ts` directly (registry id `"enrollment"`) rather than getting their own file.

**Responsibility:**
- Workflow progression and validation
- Delayed state transitions (auto-approve, auto-ship)
- Snapshot-based undo/redo
- Multi-workflow support via `WorkflowRegistry`

**Parallel regions (in `workflowMachine.ts`):**
1. **enrollment** — idle → pending → invited → SMS/OTP verification → consent confirmation
2. **benefitsInquiry** — idle → submitted → complete
3. **priorAuth** — idle → submitted → approved/denied (with 3s auto-approve)
4. **order** — none → processing → shipped → delivered (with 3s auto-ship)

**Context:**
```typescript
interface MachineContext {
  workflowData: WorkflowData;   // All workflow progression fields (enrollment, PA, pharmacy, pricing, etc.)
  events: DemoEvent[];          // Audit trail
  _snapshots: MachineContext[]; // Undo history
}
```

**Delayed transitions (no `setTimeout` in React):**
- PA auto-approval: 3 seconds after `paStatus === "submitted"`
- Order auto-ship: 3 seconds after `pharmacyStatus === "processing"`

---

## Shell infrastructure: Zustand (`client/store/demoStore.ts`)

Holds exactly three things:

- `flowType` — which workflow is active; drives which XState machine `actorSingleton.ts` switches to
- `enrollmentFormTabOpen` — CRM UI tab state
- `resetNonce` — bumped on every `resetDemo()` call; portals with their own navigation guards (like the patient portal's `StateDrivenNav`) watch this to force-navigate back to the correct screen on reset

Persisted to `sessionStorage` so a page refresh restores the active flow. On restore, `DemoShell`'s mount effect calls `switchWorkflow()` to match the actor to the persisted `flowType`.

There are no identity fields, no action-bridge functions, and no `_snapshot()` method on this store. Undo/redo, identity, and every other workflow field live in the XState actor's `MachineContext` instead.

---

### State management infrastructure

#### WorkflowRegistry (`client/engine/WorkflowRegistry.ts`)
Registers every machine directly at module load, keyed by a registry id:

```typescript
workflowRegistry.registerWorkflow("enrollment", workflowMachine, { ... });
workflowRegistry.registerWorkflow("CoA_DTP", coaDtpMachine, { ... });
workflowRegistry.registerWorkflow("CoA_Copay", coaCopayMachine, { ... });
workflowRegistry.registerWorkflow("iAssist_PA_Approved", iAssistMachine, { ... });
workflowRegistry.registerWorkflow("iAssist_PAP", iAssistPapMachine, { ... });
workflowRegistry.registerWorkflow("PrES_PAP", presPapMachine, { ... });
```

There's no separate registration barrel file; `WorkflowRegistry.ts` imports every machine and registers it inline. Exposes `registerWorkflow(id, machine, metadata)`, `getWorkflow(id)`, and `listWorkflows()`.

#### Actor singleton (`client/engine/actorSingleton.ts`)
- Module-level actor instance, lazily created on first call
- `machineIdForFlow(flowType)` maps a `FlowType` to a registry id — every `FlowType` maps to itself except `Fax_QS_PA_Approved`/`Fax_PAP_Audit`, which both map to `"enrollment"`
- `switchWorkflow(flowType)` snapshots the outgoing machine, then starts (or restores) the actor for the new flow
- `resetCurrentWorkflowActor()` resets the active flow only; `resetAllWorkflowSnapshots()` wipes every flow's saved progress
- Active workflow id persisted to `sessionStorage`

#### WorkflowProvider (`client/engine/WorkflowProvider.tsx`)
React context and hooks for the actor:
- `useWorkflowActor()` — get the current actor
- `useSwitchWorkflow()` — switch workflows at runtime
- `useActiveWorkflowId()` — get the current workflow id
- `usePersonaState(portal)` — read workflow data and availability for a given portal
- `useWorkflowDispatch()` — send events to the actor

#### DemoConfigurator (`client/shell/DemoConfigurator.tsx`)
- Collapsible drawer for runtime demo controls
- Workflow selector (with auto-reset on switch)
- Portal visibility toggles (persisted to `sessionStorage`)
- Behavior flags: auto-advance, undo support, progress display
- Reset button: `dispatch("RESET")` plus a full `sessionStorage.clear()`

---

## Portal navigation

**Patient portal** (`client/portals/patient/index.tsx`): a `StateDrivenNav` component subscribes directly to the XState actor and navigates on every change, no Zustand involved.

```typescript
const actor = useWorkflowActor();

const targetRoute = useSelector(
  actor,
  (snapshot) => derivePatientRoute(snapshot.context)
);
```

**Route derivation** (`derivePatientRoute`, in `client/engine/WorkflowEngine.ts`):
- Takes the XState `MachineContext` directly: `derivePatientRoute(state: MachineContext): string`
- Branches on `state.workflowData.flowType` and the rest of `workflowData` (enrollment, SMS, OTP, consent, PA, pharmacy status)
- Recomputed fresh on every actor state change via `useSelector`

`demoStore`'s `resetNonce` is the one piece of Zustand state this component still reads, purely to force a re-navigate on "Reset All" even if the guard would otherwise leave the current page alone.

---

## How to add a new workflow

### 1. Create a machine
Add `client/workflows/my-workflow.ts`, following the shape of an existing one (`coaDtp.ts` is a good template):

```typescript
export interface MyContext {
  workflowData: WorkflowData;
  events: DemoEvent[];
  _snapshots: MyContext[];
}

export const myWorkflowMachine = setup({
  types: { context: {} as MyContext },
}).createMachine({
  id: "myWorkflow",
  context: initialContext,
  initial: "idle",
  states: { /* ... */ },
  on: { UNDO: { actions: "restoreLastSnapshot" }, RESET: { actions: "resetContext" } },
});
```

### 2. Add the `FlowType`
Add the new flow name to the `FlowType` union in `client/engine/types.ts`.

### 3. Register the machine
In `client/engine/WorkflowRegistry.ts`, import the machine and call `registerWorkflow(id, machine, metadata)` with it, using the same id as the new `FlowType` (unless it should share an existing machine, the way `Fax_QS_PA_Approved`/`Fax_PAP_Audit` share `"enrollment"` — in that case, add the mapping to `machineIdForFlow()` in `actorSingleton.ts` instead of registering a new machine).

### 4. Add it to the flow picker
Add an entry to `FLOW_OPTIONS` in `client/shell/flowOptions.ts`. This is what actually drives the dropdown in `DemoShell` and `DemoConfigurator` — it's a separate, deliberately UI-facing list from the registry, so a flow isn't visible in the picker just because it's registered.

### 5. Set its starting portal
Add an entry to `FLOW_START_PORTAL` in `client/shell/DemoShell.tsx` so switching to (or resetting) the new flow lands on the right opening screen.

### 6. Add portal integration if needed
Create bridge hooks in `client/hooks/` if a portal needs new actions, and export them from `WorkflowProvider.tsx`.

---

## Data flow

```
UI action (e.g. clicking "Approve PA" in the CRM)
  ↓
1. useWorkflowDispatch() sends an event to the actor
2. XState machine validates the transition and updates MachineContext
   (including snapshotting for undo)
3. usePersonaState() / useSelector() reads the updated context
4. Portal re-renders with the new state
5. derivePatientRoute() recomputes (Patient portal only)
6. StateDrivenNav navigates if the target route changed
```

---

## File index

| File | Purpose |
|------|---------|
| `client/engine/workflowMachine.ts` | Shared machine for `Fax_QS_PA_Approved` / `Fax_PAP_Audit` — enrollment + PA + BI + order |
| `client/workflows/coaDtp.ts`, `coaCopay.ts`, `iAssist.ts`, `iAssistPap.ts`, `presPap.ts` | Dedicated machines, one per remaining workflow |
| `client/engine/types.ts` | `FlowType`, `WorkflowData`, `MachineContext` shapes |
| `client/engine/WorkflowRegistry.ts` | Runtime workflow registration |
| `client/engine/actorSingleton.ts` | Module-level actor instance, flow switching, snapshot persistence |
| `client/engine/WorkflowProvider.tsx` | React context and hooks for the actor |
| `client/engine/WorkflowEngine.ts` | `derivePatientRoute()` and persona logic |
| `client/shell/flowOptions.ts` | `FLOW_OPTIONS` — the flow picker's source of truth |
| `client/shell/DemoShell.tsx` | Layout, portal tabs, `FLOW_START_PORTAL`, reset/stage-jump menu |
| `client/shell/DemoConfigurator.tsx` | Runtime configuration drawer |
| `client/store/demoStore.ts` | Shell infrastructure only: `flowType`, `enrollmentFormTabOpen`, `resetNonce` |
| `client/portals/patient/index.tsx` | Patient portal with `StateDrivenNav` |

For what each of the 7 workflows actually demonstrates, see `README.md`.
