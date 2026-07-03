# ARX Demo Shell Architecture

**Core Principle:** *XState parallel machines drive workflow progression and route decisions; Zustand holds identity data and action bridges.*

This document describes the architecture after migrating from Zustand-only state to a hybrid approach with XState as the authoritative source for workflow.

---

## New Architecture (XState + Zustand Hybrid)

### Workflow Layer: XState Parallel Machines

**Where:** `client/engine/workflowMachine.ts` and `client/workflows/reauth.ts`

**Responsibility:** 
- Workflow progression and validation
- Delayed state transitions (auto-approve, auto-ship)
- Snapshot-based undo/redo
- Multi-workflow support via WorkflowRegistry

**Parallel Regions:**
1. **enrollment** — idle → pending → invited → SMS/OTP verification → consent confirmation
2. **benefitsInquiry** — idle → submitted → complete
3. **priorAuth** — idle → submitted → approved/denied (with 3s auto-approve)
4. **order** — none → processing → shipped → delivered (with 3s auto-ship)

**Context:**
```typescript
interface MachineContext {
  workflowData: WorkflowData;  // Read-only workflow progression fields
  events: DemoEvent[];         // Audit trail
  _snapshots: MachineContext[]; // Undo history
}
```

**Events (fire-and-forget from Zustand):**
- `ENROLL`, `INVITE`, `VERIFY_SMS`, `VERIFY_OTP`, `CONFIRM_CONSENT`
- `RUN_BI`, `COMPLETE_BI`
- `SUBMIT_PA`, `APPROVE_PA`
- `FILL_RX`, `SHIP_RX`, `DELIVER_RX`
- `UNDO`, `RESET`

**Delayed Transitions (no setTimeout in React):**
- PA auto-approval: 3 seconds after `paStatus === "submitted"`
- Order auto-ship: 3 seconds after `pharmacyStatus === "processing"`

---

### Action Bridge Layer: Zustand

**Where:** `client/store/demoStore.ts`

**Responsibility:**
- Identity data (name, DOB, phone, address)
- Action bridges that dispatch to XState actor
- Snapshot management for undo

**Still Holds:**
- `patientName`, `patientDob`, `phone`, `email`, `deliveryAddress`
- `drugName`, `rxNumber`, `payer`
- `flowType`, `workflowStep` (derived, for legacy compatibility)

**Actions (all mirror to XState):**
```typescript
sendEnrollmentInvite(): void {
  get()._snapshot();
  const now = new Date().toISOString();
  set({ enrollmentStatus: "enrolled", enrollmentInviteSent: true, ... });
  try {
    getWorkflowActor().send({ type: 'INVITE', portal: 'crm' });
  } catch (e) { /* fire-and-forget */ }
}
```

**Rules:**
- ✅ All actions call `_snapshot()` for undo
- ✅ All actions fire actor events (with try/catch)
- ❌ No workflow progression validation (done by XState)
- ❌ No auto-completion timers (done by XState `after:`)

---

### State Management Infrastructure

#### WorkflowRegistry (`client/engine/WorkflowRegistry.ts`)
- Runtime workflow registration and switching
- `registerWorkflow(id, machine, metadata)`
- `getWorkflow(id)`
- `listWorkflows()` → metadata for UI selectors

#### Actor Singleton (`client/engine/actorSingleton.ts`)
- Module-level actor instance
- Lazy initialization on first call
- Runtime workflow switching with actor restart
- Active workflow ID persisted to `sessionStorage`

#### WorkflowProvider (`client/engine/WorkflowProvider.tsx`)
- React context for actor and workflow switching
- `useWorkflowActor()` — get current actor
- `useSwitchWorkflow()` — switch workflows at runtime
- `useActiveWorkflowId()` — get current workflow ID
- `usePersonaState(portal)` — read workflow data + availability
- `useWorkflowDispatch()` — send events to actor

#### DemoConfigurator (`client/shell/DemoConfigurator.tsx`)
- Collapsible drawer for runtime demo controls
- Workflow selector (with auto-reset on switch)
- Portal visibility toggles (persisted to sessionStorage)
- Behavior flags: auto-advance, undo support, progress display
- Reset button: `dispatch("RESET")` + clear all sessionStorage

---

### Portal Navigation (Zustand → StateDrivenNav)

**Patient Portal** (`client/portals/patient/index.tsx`):
```typescript
// StateDrivenNav subscribes directly to Zustand stores
useEffect(() => {
  const demoState = useDemoStore.getState();
  const orderState = useOrderStore.getState();
  const target = derivePatientRoute(demoState, orderState);
  navigate(target, { replace: true });
}, []);

// Subscribe to any state change
useDemoStore.subscribe(() => { /* recalculate and navigate */ });
useOrderStore.subscribe(() => { /* recalculate and navigate */ });
```

**Route Derivation** (`derivePatientRoute`):
- Based only on Zustand state (enrollment, SMS, OTP, consent, PA, order status)
- No XState dependency (phase 3.2)
- Computed fresh on every state change
- No delays, no timers

---

## How to Add a New Workflow

### 1. Create Machine (`client/workflows/my-workflow.ts`)
```typescript
export interface MyContext {
  status: string;
  _snapshots: MyContext[];
  _events: any[];
}

export const myWorkflowMachine = setup({
  types: { context: {} as MyContext },
  actions: {
    resetContext: () => initialContext,
  },
}).createMachine({
  id: 'myWorkflow',
  context: initialContext,
  initial: 'idle',
  states: { /* ... */ },
  on: { UNDO: { actions: 'restoreLastSnapshot' }, RESET: { actions: 'resetContext' } },
});
```

### 2. Register in WorkflowRegistry (`client/workflows/index.ts`)
```typescript
workflowRegistry.registerWorkflow("my-workflow", myWorkflowMachine, {
  label: "My Workflow",
  description: "Description of what this workflow does",
});
```

### 3. Expose in DemoConfigurator
- Automatically appears in workflow dropdown
- Switching calls `switchWorkflow("my-workflow")`

### 4. Add Portal Integration (if needed)
- Create bridge hooks in `client/hooks/` if portal needs actions
- Export from `WorkflowProvider.tsx`

---

## Data Flow

```
Zustand Action (e.g., sendEnrollmentInvite)
  ↓
1. Snapshot state (_snapshot())
2. Mutate Zustand state (set(...))
3. Fire actor event (try/catch)
4. Actor updates MachineContext
5. usePersonaState() reads MachineContext
6. Portal re-renders with new state
7. derivePatientRoute() recomputes
8. StateDrivenNav navigates if needed
```

---

## Removed Artifacts

- ❌ `StateDrivenNav` actor subscription (phase 3.2: Zustand only)
- ❌ setTimeout auto-completion in CRM portal (replaced by XState `after:`)
- ❌ `@xstate/inspect` in production (dev-only, tree-shaken)
- ❌ Duplicate navigation logic (now single `derivePatientRoute`)

---

## Bundle Size

- **xstate core**: ~15 KB gzipped
- **@xstate/react**: ~3 KB gzipped
- **Combined**: +18 KB over Zustand-only

Offset by removal of setTimeout boilerplate and duplicate route logic.

---

## Testing Checklist

- ✅ Enrollment workflow: invite → SMS → OTP → consent → BI → PA
- ✅ PA auto-approval: 3 seconds after submit (no CRM timer)
- ✅ Order auto-ship: 3 seconds after dispatch (no CRM timer)
- ✅ Undo: snapshot restore via UNDO event
- ✅ Reset: clears all context, returns to initial state
- ✅ Workflow switching: DemoConfigurator dropdown
- ✅ Portal visibility: DemoConfigurator toggles + sessionStorage

---

## File Index

| File | Purpose |
|------|---------|
| `client/engine/workflowMachine.ts` | Enrollment + PA + BI + order parallel machine |
| `client/workflows/reauth.ts` | Reauthorization workflow machine |
| `client/workflows/index.ts` | Workflow registration barrel |
| `client/engine/WorkflowRegistry.ts` | Runtime workflow registration |
| `client/engine/actorSingleton.ts` | Module-level actor instance + switching |
| `client/engine/WorkflowProvider.tsx` | React context + hooks for workflows |
| `client/engine/WorkflowEngine.ts` | Route derivation + persona logic |
| `client/shell/DemoConfigurator.tsx` | Runtime configuration drawer |
| `client/store/demoStore.ts` | Identity data + action bridges |
| `client/portals/patient/index.tsx` | Patient portal with StateDrivenNav |
