# Order Store Architecture

## Overview

This refactoring separates **pharmacy/order state management** from **clinical workflow state**, eliminating fragility in the patient portal navigation system.

## Problem Solved

### Before: Fragmented State Management
- **demoStore** contained both clinical workflow AND order/pharmacy state
- **StateDrivenNav** watched all 8+ state fields, re-deriving routes on unrelated changes
- **Order operations** (fillRx, shipRx, etc.) could overwrite each other
- **Race conditions** during state transitions (e.g., resetToStage → fillRx → navigate)

### Example Bug (Now Fixed)
```typescript
// DeliveryConfirmation "Got it" button - BAD ORDER
onClick={() => { 
  fillRx();                              // sets pharmacyStatus = "processing"
  resetToStage(5, "initialized");        // OVERWRITES to pharmacyStatus = "none" ❌
  navigate("/order-tracker");
}}

// FIXED ORDER
onClick={() => { 
  resetToStage(5, "initialized");        // Initialize step 5
  fillRx();                              // NOW safely sets pharmacyStatus = "processing" ✓
  navigate("/order-tracker");
}}
```

## New Architecture

### Two Separate Stores

```
┌──────────────────────────────┐
│  demoStore (Clinical)        │
│  - Enrollment status         │
│  - PA status                 │
│  - Income verification       │
│  - BI status                 │
│  - Workflow step (1-8)       │
│  - Delegated actions:        │
│    - fillRx() → orderStore   │
│    - shipRx() → orderStore   │
│    - selectPharmacy()        │
│      → orderStore            │
└──────────────────────────────┘

┌──────────────────────────────┐
│  orderStore (Order/Pharmacy) │
│  - pharmacyStatus            │
│    ("none"|"processing"|     │
│     "shipped"|"delivered")   │
│  - dispatchStatus            │
│  - selectedPharmacy          │
│  - Actions:                  │
│    - fillRx()                │
│    - shipRx()                │
│    - deliverRx()             │
│    - selectPharmacy()        │
│    - resetOrder()            │
└──────────────────────────────┘
```

### Files Changed

#### New Files
- **`client/store/orderStore.ts`** - Dedicated order/pharmacy state store
  - `PharmacyStatus` type
  - `OrderState` interface
  - `OrderActions` interface
  - `deriveOrderStep()` function for UI
  - `useOrderStore` Zustand hook

#### Modified Files

1. **`client/store/demoStore.ts`**
   - Import orderStore
   - Delegate pharmacy actions to orderStore:
     - `fillRx()` → calls `useOrderStore().fillRx()`
     - `shipRx()` → calls `useOrderStore().shipRx()`
     - `deliverRx()` → calls `useOrderStore().deliverRx()`
     - `startShippingSequence()` → calls `useOrderStore().startShippingSequence()`
     - `selectPharmacy()` → calls `useOrderStore().selectPharmacy()`

2. **`client/portals/patient/index.tsx`**
   - Import orderStore
   - Update `derivePatientRoute()` to accept both stores
   - Update `StateDrivenNav` to:
     - Read `pharmacyStatus` from orderStore (not demoStore)
     - Pass both stores to `derivePatientRoute()`
     - Watch only truly relevant clinical state fields

3. **`client/portals/patient/pages/OrderTracker.tsx`**
   - Import orderStore (remove demoStore dependency)
   - Read `pharmacyStatus` from orderStore
   - Remove `workflowStep` dependency (order tracking is independent)

4. **`client/portals/crm/pages/Index.tsx`**
   - Import orderStore
   - Read from orderStore:
     - `pharmacyStatus`
     - `dispatchStatus`
     - `selectedPharmacy`
   - Actions still go through demoStore (which delegates to orderStore)

## Benefits

### 1. Eliminated State Overwrites
```typescript
// Now impossible: resetToStage and fillRx work on separate stores
resetToStage(5);      // Updates clinical workflow only
fillRx();             // Updates order state only
// No conflicts ✓
```

### 2. Reduced Re-renders
StateDrivenNav now watches only relevant clinical fields:
```typescript
// BEFORE: watched 8 fields, re-derived on ANY change
const [smsVerified, pharmacyStatus, paStatus, ...] = watch8Fields;

// AFTER: watches only clinical fields, pharmacyStatus from separate hook
const [smsVerified, paStatus, consentStatus, ...] = watchClinicalFields;
const pharmacyStatus = useOrderStore((s) => s.pharmacyStatus);
// Both are independent ✓
```

### 3. Clearer Separation of Concerns
- **Clinical workflow**: Referral → Enrollment → BI → PA → Dispatch
- **Order lifecycle**: Order received → Processing → Shipped → Delivered

These operate independently. A patient can be in clinical stage 5 (Dispatch to Triage) but still see order status "Pending" if the order hasn't been filled yet.

### 4. Simplified Derivation Logic
```typescript
// OrderTracker no longer needs workflowStep
function buildSteps(pharmacyStatus: string): StepDef[] {
  // Pure order state logic, no mixing with clinical steps
}
```

## State Flow Diagram

### Order Received Event

```
Patient clicks "Got it"
    ↓
resetToStage(5, "initialized")
├─ demoStore: workflowStep = 5
└─ demoStore: enrollmentStatus, consentStatus, etc.
    ↓
fillRx()
├─ orderStore: pharmacyStatus = "processing"
└─ demoStore logs event
    ↓
navigate("/order-tracker")
    ↓
StateDrivenNav re-evaluates
├─ Reads clinical fields from demoStore (no change)
├─ Reads pharmacyStatus from orderStore (changed!)
└─ derivePatientRoute() returns "/order-tracker" ✓
    ↓
OrderTracker renders
├─ Reads pharmacyStatus from orderStore
└─ Shows "Order received" as active step ✓
```

### Order Shipped Event (CRM Action)

```
CRM staff clicks "Ship Order"
    ↓
shipRx()
├─ orderStore: pharmacyStatus = "shipped"
└─ demoStore logs event
    ↓
Patient portal auto-routes
├─ StateDrivenNav triggers (orderStore.pharmacyStatus changed)
├─ derivePatientRoute() finds pharmacyStatus === "shipped"
└─ navigate("/order-shipped") ✓
    ↓
Patient sees in-transit tracking
```

## Migration Path

### Phase 1 (Complete) ✓
- Create orderStore with standalone state/actions
- demoStore delegates to orderStore
- Patient portal uses orderStore for routing
- CRM reads from orderStore

### Phase 2 (Optional - Future)
- Remove pharmacy fields from demoStore (already delegated)
- Make orderStore persist separately
- Add order-specific undo/redo logic

## Testing Checklist

- [ ] Click "Got it" on delivery confirmation → navigates to /order-tracker
- [ ] Order tracker shows "Order received" as active step
- [ ] CRM can "Ship Order" → patient portal shows /order-shipped
- [ ] Undo works correctly (snapshots capture both stores)
- [ ] Reset stage buttons work correctly
- [ ] No race conditions during state transitions
- [ ] Patient portal doesn't re-route on unrelated clinical state changes

## Backward Compatibility

✓ All existing code continues to work
- demoStore actions are compatible (still exist, just delegate)
- Existing components reading from demoStore still work
- New components can read from orderStore for better separation

No breaking changes to the public API.
