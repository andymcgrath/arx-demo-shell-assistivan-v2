# Prompting Guide: [CONSISTENCY] Prefix

**TL;DR:** Use `[CONSISTENCY] Feature: [Name]` and builder will guide you through the rest.

---

## Why This Exists

Your core principle: *"Stages and Global data with dynamic variables—users can click any navigation tab without the experience being out of sync."*

Every new feature should maintain this. The `[CONSISTENCY]` prefix tells builder to enforce it automatically.

---

## How It Works

### Step 1: You Write the Prefix
```
[CONSISTENCY] Feature: Add Related Task to Field Portal
```

### Step 2: Builder Asks Questions
Builder detects `[CONSISTENCY]` and prompts you with 4 questions:
1. What changes? (describe what user sees)
2. Which portals? (Field, CRM, Patient, etc.)
3. Workflow progression? (Does stage advance?)
4. Anything else? (special context)

### Step 3: Builder Fills Template
Builder auto-fills CONSISTENCY_ENFORCER.md with your answers.

### Step 4: You Confirm
You review the filled template and confirm: "Looks good" or "Let me change something"

### Step 5: Builder Builds
Builder implements the feature with:
- Global state management (store actions)
- Portal syncing (no local-only state)
- Consistency tests (Section 4 of template)

---

## Examples

### Example 1: Simple Feature (No Workflow Change)

**You:**
```
[CONSISTENCY] Feature: Mark Task Complete in Field Portal
```

**Builder asks:**
```
Q1: What changes?
→ "User clicks Complete button on task → Button grays out → 
   Switches to CRM → Returns to Field → Task still marked complete"

Q2: Which portals?
→ Field, CRM (read-only)

Q3: Workflow progression?
→ No, same stage

Q4: Anything else?
→ No
```

**Builder builds:**
- Store action: `completeTask(taskId)`
- Field portal: Add button, disable after click
- CRM: Show task status
- Tests: All 5 sync tests pass

---

### Example 2: Feature with Workflow Progression

**You:**
```
[CONSISTENCY] Feature: iAssist Initialize Patient & Rx
```

**Builder asks:**
```
Q1: What changes?
→ "User fills form (patient name, drug, payer) → Submits 
   → Form closes → CRM shows patient with stage 'Patient Enrolled' 
   → All portals show same data"

Q2: Which portals?
→ iAssist, CRM, Patient (affects routing)

Q3: Workflow progression?
→ Yes, stage 1 → 2
→ "Because patient completed enrollment and consented"

Q4: Anything else?
→ "Should work with all 4 flow types"
```

**Builder builds:**
- Store action: `initializePatientAndRx(patientData, rxData)`
- iAssist: Add form, call action on submit
- CRM: Display initialized patient
- Patient: Routes update to step 2+
- Tests: All flow types, undo, tab switching

---

### Example 3: Complex Multi-Portal Feature

**You:**
```
[CONSISTENCY] Feature: Add Related Task to Field Portal
```

**Builder asks (and you answer):**
```
Q1: Describe the feature
→ "Field agent opens Keanu's 'Missing Information' task 
   → Clicks 'Add Related Task' button 
   → Form appears (task name, priority, due date)
   → Submits → Related task appears in 'Related Tasks' tab
   → Switches to CRM → Task detail shows related tasks too
   → Back to Field → Data persists"

Q2: Which portals?
→ Field (create/edit), CRM (read-only), potentially Patient

Q3: Workflow?
→ No change, same stage

Q4: Anything else?
→ "Related tasks should link bidirectionally - 
   if you view the related task, it shows the original task"
```

**Builder then asks:**
```
"Do we need to add a 'related_tasks' data model to the store, 
or keep task data in Field portal only?"

Your answer informs whether builder creates:
- Global task data structure, or
- Field-only task relationships
```

**Builder builds with that decision baked in.**

---

## When to Use [CONSISTENCY]

✅ **Use it for:**
- New features in any portal
- Data updates across portals
- Workflow progression
- UI changes that affect global state
- Anything that should persist across tab switches

❌ **Don't use it for:**
- Bug fixes (just describe normally)
- UI-only cosmetic changes (no data model involved)
- Documentation updates
- Configuration changes

---

## What NOT to Include

You don't need to provide:
- ❌ Store action names (builder decides)
- ❌ TypeScript types (builder writes these)
- ❌ Data model design (builder designs this)
- ❌ Implementation details (builder figures this out)
- ❌ Test code (builder writes tests)

**Just describe what the user does and sees.**

---

## Anti-Patterns to Avoid

❌ Don't ask builder to:
```
"Create an updateTaskStatus action that takes taskId and status 
and updates the store with _snapshot() and _deriveStep()"
```
→ That's implementation details. Builder handles this.

✅ Instead say:
```
[CONSISTENCY] Feature: Field Task Status Update
(describe what user does)
```

---

## What You Get Back

After builder confirms, you get:
1. ✅ Completed CONSISTENCY_ENFORCER.md
2. ✅ Implementation plan (what builder will create)
3. ✅ Expected test results
4. ✅ "Ready to build?" confirmation

Then the feature is implemented with:
- Global consistency guaranteed
- No local-only state conflicts
- All 5 sync tests passing
- Works across all portal navigation

---

## Quick Reference: The Questions

| Q | What It Asks | Why It Matters |
|---|--------------|----------------|
| **1** | What changes? | Determines scope and portals involved |
| **2** | Which portals? | Defines sync surface area |
| **3** | Workflow progression? | Affects store state design |
| **4** | Anything else? | Catches edge cases, special requirements |

---

## Real Example Prompts

### Request 1:
```
[CONSISTENCY] Feature: iAssist Initialize Demo

User clicks "Initialize Demo" button → Fills patient and Rx form 
→ Submits → Patient name appears in CRM, stage shows "Patient Enrolled" 
→ Switches portals → Data persists everywhere
```

### Request 2:
```
[CONSISTENCY] Feature: Field Task Completion

Task detail view → Click "Mark Complete" button → Button grays out 
→ CRM shows updated task status → Return to Field → Still marked complete
```

### Request 3:
```
[CONSISTENCY] Feature: Add Related Tasks to Field Cases

Field agent selects task → Clicks "Add Related" → Picks another task 
→ Relationship appears → CRM also shows the relationship → Data persists
```

---

## If You Forget

Just start with:
```
[CONSISTENCY] Feature: [Name]
```

Builder will ask the 4 questions. You answer them. Done.

**No need to memorize the template or remember all sections.**

---

## For Developers Reading This

When you see `[CONSISTENCY] Feature: [Name]`:

1. **Detect the prefix** in the message
2. **Ask the 4 questions** (use AskUserQuestion tool)
3. **Fill CONSISTENCY_ENFORCER.md** with the answers
4. **Show the filled template** to user
5. **Ask for confirmation:** "Proceed with building this?"
6. **Implement** with full consistency enforcement
7. **Run Section 4 tests** before reporting done

The user focuses on WHAT. You handle HOW and ensure consistency.

---

## Summary

**User:** `[CONSISTENCY] Feature: [Name]` → Answer questions
**Builder:** Asks questions → Fills template → Builds with enforcement
**Result:** Feature maintains global consistency automatically

No complexity. No template remembering. Just tell builder what you want.
