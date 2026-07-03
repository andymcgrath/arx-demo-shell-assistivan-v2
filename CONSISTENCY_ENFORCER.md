# Consistency Enforcer

**Core Principle:** *Stages and Global data with dynamic variables—users can click any navigation tab without the experience being out of sync.*

---

## Architecture: Separation of Concerns

```
GLOBAL STORE (demoStore)
├─ Patient data: name, dob, phone, email
├─ Rx data: drugName, payer, rxNumber
├─ Status fields: enrollmentStatus, paStatus, pharmacyStatus
├─ Derived: workflowStep (computed from status)
└─ Actions: updatePatient(), submitPA(), fillRx()
   (All mutations go here, trigger _deriveStep, _snapshot, _logEvent)

ROUTING LOGIC (derived from global)
├─ Patient Portal: deriveRoute() based on step + flowType
├─ Provider Portal: deriveStep() based on paStatus + incomeStatus
├─ CRM: show stage based on workflowStep
└─ Never uses local state for routing decisions

LOCAL UI STATE (component useState)
├─ Form inputs, field selections
├─ Step navigation within multi-step forms
├─ Loading/error/success messages
├─ Expanded/collapsed panels
└─ NOT shared across portals, NOT persisted

GLOBAL VARIABLES (config/constants)
├─ Step labels ("Referral Received", "Patient Enrolled", etc)
├─ Stage mappings (step 1 → "Referral Received")
├─ Flow type labels
├─ Shared enums and constants
└─ Keeps displays consistent without code duplication
```

---

## When Data Needs Global Store

Data should be in global store if:
- ✅ It affects multiple portals (CRM, Patient, Provider all read it)
- ✅ It should persist across tab switches
- ✅ It represents workflow progression
- ✅ It's part of the core domain (patient, prescription, status)

Local state is OK for:
- ✅ Form input fields (before submission)
- ✅ Step navigation within a portal's wizard
- ✅ Loading/error/success messages
- ✅ UI chrome (expanded panels, selected tabs)

---

## When Routing Needs to be Derived

Routing should be derived (not stored) if:
- ✅ It can be computed from global state
- ✅ Multiple portals need the same logic
- ✅ Changes to global state should auto-update routing

Example:
```typescript
// ✅ GOOD: Derived from global data
const deriveRoute = (workflowStep, flowType, paStatus) => {
  if (paStatus === "approved") return "/rx-shipped";
  if (workflowStep === 3) return "/pa-pending";
  return "/enrollment";
};

// ❌ BAD: Stored separately
const [currentRoute, setCurrentRoute] = useState("/enrollment");
// (This can desync from actual workflow state)
```

## Quick Start: Interactive Mode

**Just say:**
```
[CONSISTENCY] Feature: [Your feature name]
```

**Builder will:**
1. Ask you 3-4 focused questions
2. Fill in this template automatically
3. Show you the completed template
4. Ask for confirmation
5. Build with full consistency verification

**Don't worry about remembering sections.** Builder guides you through it.

---

## Manual Mode

If you prefer to fill the template yourself, see "Full Template" section below.

---

## Interactive Flow: What Builder Asks

When you use `[CONSISTENCY]`, builder prompts you with these questions:

### Question 1: What Changes?
```
Describe the feature in plain English. What does the user do? What changes?

Example:
"User clicks button → Form appears → Fills patient name, drug, payer
→ Submits → Data shows in CRM with updated stage"

Your description:
[Open text input]
```

### Question 2: Which Portals?
```
Which portals are affected?

[ ] Single portal (just this one portal changes)
[ ] Multiple portals (e.g., Field updates, CRM reads it)
[ ] All portals (widespread change)

Select: [Radio buttons or checkboxes]
Which ones? [If multiple]
```

### Question 3: Workflow Progression?
```
Does this feature progress the workflow to the next stage?

[ ] No - just editing/adding data (same stage)
[ ] Yes - moves patient forward

If Yes, which step? [1-7 dropdown]
Why does it progress? [Text: e.g., "Patient consented"]
```

### Question 4: Anything Else?
```
Any other context builder should know?

[ ] No, that's all
[ ] Yes: [Open text input]
```

---

## Builder Confirms

After you answer, builder shows:

```
✅ Got it! Here's your CONSISTENCY_ENFORCER template:

## Feature: [Your feature name]

### SECTION 1: FEATURE DEFINITION
- Feature Name: [from your Q1]
- Portals Affected: [from your Q2]
- User Story: [from your Q1]
- Target Stage: [from your Q3 or "no change"]

### SECTION 2: WHAT CHANGES
- Portals affected: [from Q2]
- Workflow progression: [from Q3]

### SECTION 4: SYNC TESTS (auto-generated based on your answers)
- TEST 1: [Feature] → Switch tabs → Return → Data persists
- TEST 2: Undo works
- TEST 3: Works with all 4 flow types
- [Additional tests based on scope]

---

Ready to build this feature?
[ ] ✅ Yes, looks good. Proceed.
[ ] ❌ No, let me change something. [Back to questions]
```

Then builder builds it with all tests included.

---

## Full Template (Manual Mode)

---

## Template: Feature Design for Global Consistency

### 1. FEATURE DEFINITION

**Feature Name:** [e.g., "iAssist — Initialize Patient & Rx"]

**Portal(s) Affected:** [e.g., "iAssist", "CRM", "Patient (routes only)"]

**User Story:** 
[e.g., "As an iAssist user, I want to initialize the demo with a custom patient and prescription so that I can test the workflow with realistic data."]

**What Changes in Global State?**
- [ ] Patient identity fields (patientName, patientDob, phone, email)
- [ ] Rx fields (drugName, rxNumber, ndc, payer)
- [ ] Status fields (enrollmentStatus, biStatus, paStatus, etc.)
- [ ] Which status? _______________

**Target Workflow Step:**
- Current: Step 1 (Referral Received)
- After feature: Step _____ 
- Reason: _____________________

---

### 2. WHAT CHANGES (Builder figures out HOW)

**You describe WHAT the user does. Builder handles where it belongs.**

**Describe the feature in plain English:**

(What does the user see/do? What data/routing changes?)

Example:
```
User goes to Field portal → Selects "Missing Information" task
→ Clicks "Add Related Task" → Fills form with task details
→ Related task appears in "Related Tasks" tab
→ Switch to CRM → Return to Field → Related task still there
```

Your description:
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

**Does this affect workflow progression or cross-portal data?**
- [ ] No (local UI only, e.g., form within one portal)
- [ ] Yes, affects workflow (changes stage/step)
- [ ] Yes, affects other portals (CRM reads it, etc.)

If YES, which data? ________________________________

---

**Builder will then:**
1. Identify what data should be in global store (vs local UI state)
2. Design store actions for data mutations
3. Design routing logic (if needed)
4. Implement portal UI
5. Verify sync tests pass

**This ensures:** Separation of concerns—data is global, UI navigation is local, routing is derived

---

### 3. PORTAL IMPLEMENTATION

**NO LOCAL STATE FOR WORKFLOW DATA**

```
✅ OK:
  - useState for form UI (isOpen, selectedTab, etc.)
  - useState for transient UI (loading, error messages)

❌ NOT OK:
  - useState for patient data
  - useState for workflow status
  - Uncommitted form data
```

**Implementation Checklist:**
- [ ] Read data from global store only
- [ ] On submit/change → call store action immediately
- [ ] No "Save" button delay
- [ ] Form disappears/resets after success (data is in store, not form)
- [ ] Error handling shows error message, not local state

**Example Pattern:**
```typescript
// ❌ BAD: Local state for patient data
const [patientName, setPatientName] = useState("");
const handleSubmit = () => {
  // Just local! Never reaches store
  console.log(patientName);
};

// ✅ GOOD: Store action on submit
const store = useDemoStore();
const [patientName, setPatientName] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  setIsSubmitting(true);
  store.initializePatient({ patientName });
  setPatientName(""); // Clear form
  setIsSubmitting(false);
};
```

---

### 4. SYNC VERIFICATION TESTS

**These tests MUST pass. If any fail, sync is broken.**

**TEST 1: Data Persists on Tab Switch**
```
Steps:
1. [Portal A]: Perform action (e.g., iAssist: submit "John Doe")
2. [Portal B]: Switch to different portal (CRM)
3. [Portal B]: Verify updated data visible (patient name = "John Doe")
4. [Portal A]: Return to original portal
5. [Portal A]: Verify data still matches (not reset)

Expected: ✅ All portals show "John Doe"
Failure: ❌ Portal A shows blank after returning
```

**TEST 2: Undo Works**
```
Steps:
1. [Portal]: Perform action
2. [Portal]: Click undo (or use store.undoLast())
3. [Different Portal]: Verify state reverted
4. [Original Portal]: Return and verify reverted

Expected: ✅ Data goes back to previous state
Failure: ❌ Undo affects only local view, not global
```

**TEST 3: All Flow Types Support New Data**
```
For each flow type: ["Fax_QS_PA_Approved", "Fax_PAP_Audit", "CoA_DTP", "iAssist_PA_Approved"]
1. Initialize patient data
2. Change flow type
3. Verify: Patient data persists, stage progression valid
4. Switch portals, return

Expected: ✅ Works with all 4 flow types
Failure: ❌ Data lost when switching flows
```

**TEST 4: Downstream Workflows Still Work**
```
Steps:
1. Initialize patient with new data
2. CRM: Progress through stages (run BI, submit PA, etc.)
3. Patient portal: Routes match current stage
4. Provider portal: Shows correct patient name in forms

Expected: ✅ All downstream features unaffected
Failure: ❌ BI fails because patient data malformed
```

**TEST 5: No Desync on Rapid Navigation**
```
Steps:
1. Initialize patient data
2. Rapidly switch: CRM → Patient → Provider → Field → CRM
3. Each portal should show consistent data
4. Open browser DevTools → Check store state

Expected: ✅ Store shows single patient, all portals match
Failure: ❌ One portal shows different patient name
```

---

### 5. ANTI-PATTERNS (DO NOT DO)

- ❌ **Local state for workflow data**
  - `useState` for patient name, status fields, etc.
  - Problem: Conflicting truth source

- ❌ **Save button with delay**
  - "Click Save to sync" pattern
  - Problem: User might switch tabs before saving

- ❌ **Conditional syncing**
  - "Sync if user is on this portal"
  - Problem: Breaks on tab switch

- ❌ **Separate "initialized" flag**
  - `useIsInitialized()` state outside store
  - Problem: Duplicates global state

- ❌ **Reset on portal switch**
  - "Load data when portal mounts"
  - Problem: Fresh mounts lose state

**✅ DO THIS INSTEAD:**

**For Data:**
- Store action for all data mutations
- Immediate sync (no delay)
- Single source of truth (store)
- Call `_deriveStep()`, `_snapshot()`, `_logEvent()`

**For Routing/Steps:**
- Derive from global data, don't store separately
- `const step = deriveStep(paStatus, incomeStatus)`
- Re-compute on render, no local routing state

**For UI Navigation:**
- Local state is OK for wizard steps, form navigation
- `const [currentStep, setCurrentStep] = useState("login")`
- Only controls local UI, not persisted across portals

**Example - Provider Portal (CORRECT):**
```typescript
// Global: paStatus, incomeStatus (store)
// Local: step for UI navigation (useState)
const [step, setStep] = useState("email");
const paStatus = useDemoStore((s) => s.paStatus);
const incomeStatus = useDemoStore((s) => s.incomeStatus);

const handleSubmit = () => {
  store.submitPA();           // Mutate global data
  setStep("pa-submitted");     // Update local UI
  // paStatus auto-updates in store
  // Next render: derived routing responds to paStatus change
};
```

**Example - Patient Portal (CORRECT):**
```typescript
// Routing is DERIVED, not stored
const workflowStep = useDemoStore((s) => s.workflowStep);
const flowType = useDemoStore((s) => s.flowType);

const deriveRoute = (step, flow) => {
  if (step === 1) return "/enrollment";
  if (step === 2) return "/consent";
  if (step === 3 && flow === "CoA") return "/income-verification";
  return "/rx-delivery";
};

useEffect(() => {
  navigate(deriveRoute(workflowStep, flowType), { replace: true });
}, [workflowStep, flowType]);
```

---

### 6. ROLLBACK / DEBUG CHECKLIST

**If sync breaks, check these in order:**

- [ ] Does store action call `_deriveStep()`?
  - Missing: workflowStep won't update
  
- [ ] Does store action call `_snapshot()`?
  - Missing: undo won't work
  
- [ ] Does component read from store, not local state?
  - Wrong: `useState(patientName)` instead of `useDemoStore((s) => s.patientName)`
  
- [ ] Does submit handler call store action immediately?
  - Wrong: Waiting for button click or setState callback
  
- [ ] Are all portals using same store?
  - Wrong: Different import path or store instance
  
- [ ] Does type match between store and portal?
  - Wrong: Store says `pharmacy_status`, portal reads `pharmacyStatus`
  
- [ ] Is there a race condition?
  - Wrong: Two actions dispatched before render settles
  - Fix: Chain actions or wait for store update

---

### 7. EXAMPLE: FILLED-OUT TEMPLATE

**See below for real example (iAssist initialization)**

---

---

## EXAMPLE: iAssist Initialize Patient & Rx

### 1. FEATURE DEFINITION

**Feature Name:** iAssist — Initialize Patient & Rx

**Portal(s) Affected:** iAssist (reads), CRM (shows updated patient), Patient (routes update)

**User Story:** 
As an iAssist user, I want to initialize the demo with a custom patient and prescription so that I can test the workflow from step 2 onward.

**What Changes in Global State?**
- ✅ Patient identity: patientName, patientDob, phone, email
- ✅ Rx fields: drugName, rxNumber, payer
- ✅ Status: enrollmentStatus = "enrolled", consentStatus = "confirmed"

**Target Workflow Step:**
- Current: Step 1 (Referral Received)
- After: Step 2 (Patient Enrolled)
- Reason: Initialization means patient has consented and enrolled

---

### 2. WHAT CHANGES

**User describes (what they want to see):**

User goes to iAssist portal → Clicks "Initialize Demo" → Fills form with:
- Patient name, DOB, phone, email
- Drug name, NDC, payer
→ Clicks submit
→ Form closes, shows "✅ Patient Initialized"
→ Switches to CRM → Patient name shows "John Doe", stage = "Patient Enrolled"
→ Returns to iAssist → Still shows "✅ Patient Initialized: John Doe"

**Does this affect workflow?**
- Yes → Step changes from 1 → 2 (patient consented and enrolled)

---

**Builder then:**
1. Identifies: Need to store patient + rx data globally
2. Designs action: `initializePatientAndRx()`
3. Implements:
   - Updates patientName, drugName, payer, etc.
   - Sets enrollmentStatus = "enrolled", consentStatus = "confirmed"
   - Calls _deriveStep() → workflowStep = 2
   - Calls _snapshot() for undo
   - Calls _logEvent()
4. Implements iAssist form component
5. Tests all sync cases

**Builder confirms:** "Ready to implement initializePatientAndRx and iAssist form. Proceed?"

---

### 3. PORTAL IMPLEMENTATION

**iAssist changes:**

```typescript
// client/portals/iassist/index.tsx

export default function IAssistPortal() {
  const store = useDemoStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patientName: "",
    patientDob: "",
    phone: "",
    email: "",
    preferredContact: "Phone",
    drugName: "",
    rxNumber: "",
    payer: "",
  });

  const handleSubmit = () => {
    // Immediate store sync
    store.initializePatientAndRx(
      {
        patientName: formData.patientName,
        patientDob: formData.patientDob,
        phone: formData.phone,
        email: formData.email,
        preferredMethodOfContact: formData.preferredContact,
      },
      {
        drugName: formData.drugName,
        rxNumber: formData.rxNumber,
        payer: formData.payer,
      }
    );
    
    // Form disappears, data is in store now
    setShowForm(false);
    setFormData({...}); // Reset form
  };

  // Get current patient from store (read-only after init)
  const patientName = useDemoStore((s) => s.patientName);
  const workflowStep = useDemoStore((s) => s.workflowStep);

  return (
    <div>
      {workflowStep === 1 && !showForm && (
        <button onClick={() => setShowForm(true)}>Initialize Patient</button>
      )}
      
      {showForm && (
        <form onSubmit={handleSubmit}>
          {/* Form fields here */}
        </form>
      )}
      
      {workflowStep > 1 && (
        <div>✅ Patient Initialized: {patientName}</div>
      )}
    </div>
  );
}
```

**No local state for patient data!** Only `showForm` and `formData` (transient UI state).

---

### 4. SYNC VERIFICATION TESTS

**TEST 1: Data Persists on Tab Switch**
```
1. iAssist: Click "Initialize", fill form, submit
   - patientName: "Alice Johnson"
   - drugName: "Jascayd"
   - payer: "Amgen"
2. CRM: Switch to HUB/CRM
   - Patient header shows "Alice Johnson"
   - Stage shows "Patient Enrolled" (step 2)
3. iAssist: Return to iAssist portal
   - Shows "✅ Patient Initialized: Alice Johnson"
   - Form is hidden
✅ PASS
```

**TEST 2: Undo Works**
```
1. iAssist: Initialize "Bob Smith"
2. CRM: Click undo button (if available in shell)
3. iAssist: Return
   - Form reappears
   - Patient name cleared
4. Store state shows workflowStep = 1
✅ PASS
```

**TEST 3: All Flow Types Work**
```
For flow: "Fax_QS_PA_Approved"
1. iAssist: Initialize "Carol Davis", "Jascayd"
2. Dropdown: Change to "Fax_PAP_Audit"
3. iAssist: Patient data still "Carol Davis"
4. CRM: Can run BI, progression still valid
5. Repeat for "CoA_DTP" and "iAssist_PA_Approved"
✅ PASS
```

**TEST 4: Downstream Workflows**
```
1. iAssist: Initialize patient
2. CRM: Run BI → BI result shown
3. Patient portal: Routes to post-consent pages (step 2+)
4. Provider: Can submit PA with patient name visible
5. Field: Task list shows patient name
✅ PASS
```

**TEST 5: No Desync on Rapid Switching**
```
1. iAssist: Initialize "Dave Wilson"
2. Rapid switches: CRM → Patient → Provider → Field → iAssist
3. Open DevTools → Check store.patientName in console
4. Every portal shows "Dave Wilson" consistently
✅ PASS
```

---

### 5. ANTI-PATTERNS

- ❌ Store patient name in iAssist local state only
- ❌ Have a separate "isInitialized" flag outside store
- ❌ Call `setTimeout()` before syncing to store
- ❌ Reset form data on every portal render
- ✅ Store action called immediately on submit
- ✅ Form resets after success
- ✅ Data lives in global store, not component

---

### 6. ROLLBACK CHECKLIST

If initialization doesn't persist across tabs:
- [ ] `initializePatientAndRx()` calls `_deriveStep()`? ← workflowStep = 2
- [ ] `initializePatientAndRx()` calls `_snapshot()`? ← undo works
- [ ] iAssist reads `patientName` from `useDemoStore()`, not local state?
- [ ] CRM reads from same store?
- [ ] Store action set all 8 fields (patient + rx)?

---

### HOW TO USE THIS TEMPLATE

**For a new feature:**

1. Copy this template
2. Fill in sections 1-5 with your feature
3. Run sync tests (section 4)
4. Have reviewer check anti-patterns (section 5)
5. Commit filled-in version to feature branch
6. Implementation follows from the template

**Example usage in a task:**

```
Implement this feature following CONSISTENCY_ENFORCER.md:

Feature: Field Portal — Add Related Task

SECTION 2 (What Changes):

User goes to Field portal → Selects "Missing Information" task
→ Clicks "Add Related Task" button → Fills form with new task details
→ Related task appears in "Related Tasks" tab
→ Switch to CRM → Return to Field → Related task still there

Workflow progression: No (same step)

Builder: Figure out data model, store action, and implementation.
```

---

## Summary: Your Job vs Builder's Job

**YOU provide:**
1. Feature description (plain English user story)
2. Which portal(s) affected
3. Does it affect workflow or cross-portal data?

**BUILDER provides:**
1. Architecture decisions:
   - What goes in global store vs local state
   - Whether routing needs to be derived
   - What global variables are needed
2. Implementation:
   - Store actions with `_deriveStep()`, `_snapshot()`, `_logEvent()`
   - Routing logic (if needed)
   - Portal UI components
3. Consistency verification (Section 4 tests pass)

**Reference:** See ARCHITECTURE.md for the four layers (Store, Routing, Local State, Global Variables)
