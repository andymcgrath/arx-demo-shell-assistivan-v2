# ⚡ Quick Start: Consistency System

Your app has a core principle: **Users can click any tab without the experience being out of sync.**

This guide ensures every feature maintains that.

---

## For You (Product / Non-Technical)

### How to Request a Feature

**Just write:**
```
[CONSISTENCY] Feature: [What you want to build]
```

**Builder will ask you 4 questions.** Answer them. Done.

### Example:
```
[CONSISTENCY] Feature: Add Related Task to Field Portal

Builder asks:
  Q1: What does the user do?
  → "Clicks 'Add Related Task' button, fills form, submits"

  Q2: Which portals?
  → "Field portal (create), CRM (view)"

  Q3: Does workflow progress?
  → "No, same stage"

  Q4: Anything else?
  → "No"

Builder shows you the plan. You confirm. Builder builds it.
```

That's it. **No need to understand the technical details.**

---

## For Developers (Builder / Technical)

### When You See `[CONSISTENCY] Feature:`

1. **Ask the questions** (copy the 4 from PROMPTING_GUIDE.md)
2. **Fill CONSISTENCY_ENFORCER.md** with answers
3. **Show the plan to user** for confirmation
4. **Implement with these guarantees:**
   - Store action (not component state)
   - `_deriveStep()`, `_snapshot()`, `_logEvent()` calls
   - All 5 sync tests pass
5. **Verify before shipping:**
   - Tab switch test ✅
   - Undo test ✅
   - Flow type test ✅
   - Rapid nav test ✅

---

## The Three Files

| File | For | Purpose |
|------|-----|---------|
| **CONSISTENCY_SYSTEM.md** | Everyone | Overview + checklist |
| **PROMPTING_GUIDE.md** | Users/Requesters | How to ask for features |
| **CONSISTENCY_ENFORCER.md** | Builders | Template + implementation guide |

---

## Example: Real Request → Real Implementation

### Your Request:
```
[CONSISTENCY] Feature: iAssist Initialize Patient & Rx

User clicks "Initialize Demo" button → Fills form (patient name, drug, payer) 
→ Submits → Form closes → CRM shows patient with stage "Patient Enrolled" 
→ All portals sync on patient data
```

### What Builder Does:
1. Asks: Which portals? (iAssist, CRM, Patient)
2. Asks: Workflow change? (Yes, 1 → 2)
3. Fills template
4. Shows you the plan:
   ```
   ✅ I'll create:
   - Store action: initializePatientAndRx()
   - iAssist form component
   - CRM patient display updates
   - Patient routing updates
   - 5 sync tests
   ```
5. You confirm
6. Builder implements with:
   - Global consistency ✅
   - No local state ✅
   - All tests passing ✅

### Feature Shipped:
Users can initialize the demo. Data syncs. Works across all flow types. ✅

---

## How It Solves Problems

### Problem 1: Data Desync on Tab Switch
**Before:** Edit in Field portal → Switch to CRM → Return to Field → Data is different
**After:** [CONSISTENCY] enforces global store only → Data always syncs

### Problem 2: Local State Conflicts
**Before:** Component uses `useState` for data that should be global
**After:** Builder enforces: store actions only, no local data state

### Problem 3: Inconsistent Action Names
**Before:** One developer creates `updateTask()`, another creates `changeTaskStatus()`
**After:** Builder names actions, avoiding duplicates and conflicts

### Problem 4: Forgotten Tests
**Before:** Feature shipped without testing tab switches
**After:** [CONSISTENCY] auto-generates 5 tests, all must pass

---

## Workflow Summary

```
YOU: "[CONSISTENCY] Feature: [Name]"
     ↓
BUILDER: "I'll ask you 4 questions"
     ↓
YOU: Answer 4 questions
     ↓
BUILDER: "Here's the plan. Confirm?"
     ↓
YOU: ✅ Confirm
     ↓
BUILDER: Builds with full consistency enforcement
     ↓
Feature: ✅ Works. All tests pass. No desync.
```

---

## What You DON'T Need to Do

You don't need to:
- ❌ Remember template sections
- ❌ Understand the data model
- ❌ Know about store actions
- ❌ Write sync tests
- ❌ Think about technical implementation

**Just describe what the user does.**

Builder handles everything else.

---

## Key Rules

### For Users:
1. Use `[CONSISTENCY] Feature:` prefix
2. Describe what the user sees and does (plain English)
3. Answer builder's 4 questions
4. Confirm the plan before building

### For Builders:
1. Detect `[CONSISTENCY]` prefix
2. Ask the 4 questions
3. Fill CONSISTENCY_ENFORCER.md
4. Show plan, get approval
5. Implement with store actions (not component state)
6. Run all 5 sync tests
7. Ship only when tests pass

---

## Common Requests & How to State Them

### Request: Initialize Demo
```
[CONSISTENCY] Feature: iAssist Initialize Patient & Rx

User fills form → Submits → Data shows in CRM and other portals
```

### Request: Update Task Status
```
[CONSISTENCY] Feature: Mark Field Task Complete

User clicks button → Task grays out → CRM shows updated → Data persists on tab switch
```

### Request: Add Related Data
```
[CONSISTENCY] Feature: Add Related Task to Field

User selects task → Clicks "Add Related" → Picks another task → Both show the relationship
```

### Request: Enable Editing
```
[CONSISTENCY] Feature: Edit Field Task Details

User clicks edit button → Form appears → Changes status, priority, description 
→ Saves → Data updates in Field and CRM → Switch tabs → Data persists
```

---

## Tests You Can Expect

Every [CONSISTENCY] feature is tested for:

1. **Tab Switch Persistence**
   - Edit in Portal A → Switch to B → Back to A → Data unchanged ✅

2. **Undo Works**
   - Make change → Undo → Previous state restored ✅

3. **All Flow Types**
   - Works with Fax_QS_PA_Approved ✅
   - Works with Fax_PAP_Audit ✅
   - Works with CoA_DTP ✅
   - Works with iAssist_PA_Approved ✅

4. **No Downstream Breaks**
   - After feature, other portals still work ✅

5. **No Desync on Rapid Navigation**
   - Switch tabs rapidly → All portals show same data ✅

---

## Quick Checklist

Before requesting a feature, make sure you can answer:

- [ ] What does the user do? (describe in plain English)
- [ ] Which portals are affected? (1 or multiple?)
- [ ] Does this advance the workflow? (yes/no + which step?)
- [ ] Any special context? (optional)

If you can answer these 4 questions, you can request a feature using `[CONSISTENCY] Feature:`.

---

## Questions?

| Question | See |
|----------|-----|
| "How do I request a feature?" | PROMPTING_GUIDE.md |
| "What's the template?" | CONSISTENCY_ENFORCER.md |
| "What are the tests?" | CONSISTENCY_ENFORCER.md (Section 4) |
| "How do I implement?" | CONSISTENCY_ENFORCER.md |
| "What's the overview?" | CONSISTENCY_SYSTEM.md |

---

## TL;DR

**You:** `[CONSISTENCY] Feature: [Name]` + answer 4 questions
**Builder:** Asks → Fills → Builds → Tests → Ships
**Result:** Feature maintains global consistency ✅

Done.
