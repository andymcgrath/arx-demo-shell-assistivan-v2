# Global Consistency System

**Your Core Principle:** *Stages and Global data with dynamic variables—users can click any navigation tab without the experience being out of sync.*

This system ensures every feature maintains that principle automatically.

---

## For Users: How to Request Features

### The Fast Way

Just type:
```
[CONSISTENCY] Feature: [Your feature name]
```

Builder will ask you 3-4 questions, fill in the rest, and build with full consistency enforcement.

**See:** [PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md)

---

### Example:
```
[CONSISTENCY] Feature: Add Related Task to Field Portal

(Builder asks you about what changes, which portals, workflow progression, etc.)
(You answer 4 simple questions)
(Builder shows you the plan and builds it)
```

---

## For Builders: How to Implement Features

### When You See `[CONSISTENCY] Feature:`

1. **Ask the 4 questions** (see PROMPTING_GUIDE.md)
   - What changes? (user story in plain English)
   - Which portals? (which portals involved)
   - Workflow progression? (does it advance a stage?)
   - Anything else? (special context)

2. **Fill CONSISTENCY_ENFORCER.md** with answers
   - Section 1: Feature Definition
   - Section 2: What Changes
   - Section 4: Sync Tests (auto-generate based on answers)

3. **Show the user the plan:**
   ```
   ✅ Template filled. Here's what I'll build:
   [Show filled template]
   
   Ready to proceed? [ ] Yes [ ] No, change something
   ```

4. **Implement with consistency:**
   - Create store actions (not component state)
   - No local-only state for workflow data
   - Call `_deriveStep()` to recalculate step
   - Call `_snapshot()` for undo support
   - Call `_logEvent()` for tracking
   - Write Section 4 sync tests

5. **Verify all 5 tests pass:**
   - Data persists on tab switch
   - Undo works
   - All flow types work (Fax_QS, Fax_PAP, CoA_DTP, iAssist)
   - Downstream workflows unaffected
   - No desync on rapid navigation

---

## Documentation Files

| File | Purpose |
|------|---------|
| **PROMPTING_GUIDE.md** | How to request features (user-facing) |
| **CONSISTENCY_ENFORCER.md** | Template + examples (builder reference) |
| **CONSISTENCY_SYSTEM.md** | This file - overview |

---

## The System at a Glance

```
User Request: "[CONSISTENCY] Feature: [Name]"
      ↓
Builder: Asks 4 questions
      ↓
Builder: Fills CONSISTENCY_ENFORCER.md
      ↓
User: Confirms or edits
      ↓
Builder: Implements with full consistency enforcement
      ↓
Builder: All 5 sync tests pass
      ↓
Feature: Maintains global consistency ✅
```

---

## What This Solves

### Before (Common Problems)
- ❌ Features break on tab switch
- ❌ Local state conflicts with global state
- ❌ Data desync across portals
- ❌ Inconsistent action naming
- ❌ Duplicate store actions

### After (Guaranteed)
- ✅ Tab switch = no desync
- ✅ Global store = single source of truth
- ✅ Consistent action naming
- ✅ No duplicate actions (builder catches reuse)
- ✅ All tests pass before shipping

---

## Example: Start to Finish

### Request
```
[CONSISTENCY] Feature: iAssist Initialize Patient & Rx
```

### Builder Asks
```
Q1: What changes?
→ User fills form, submits, patient appears in all portals

Q2: Which portals?
→ iAssist (form), CRM (display), Patient (routing)

Q3: Workflow?
→ Yes, 1 → 2 (patient consented)

Q4: Anything else?
→ No
```

### Builder Shows Plan
```
✅ I'll create:

Feature: iAssist Initialize Patient & Rx
Portals: iAssist, CRM, Patient
Workflow: Step 1 → 2

Store Action: initializePatientAndRx()
- Updates: patientName, drugName, payer, enrollmentStatus, consentStatus
- Recalculates: workflowStep = 2
- Logs: demo_initialized event

Tests:
- TEST 1: Initialize → Switch tabs → Return → Data persists ✅
- TEST 2: Undo reverts step ✅
- TEST 3: Works with all 4 flow types ✅
- TEST 4: Downstream workflows (BI, PA) work ✅
- TEST 5: Rapid navigation doesn't desync ✅

Ready? [ ] Yes [ ] No, change
```

### User Confirms
```
Yes, proceed.
```

### Builder Implements
- Creates `initializePatientAndRx()` action
- iAssist form component
- CRM reads patient data
- Patient portal routes update
- All 5 tests pass

### Feature Shipped ✅
```
✅ Feature complete. All consistency tests pass.

Users can now:
- iAssist: Initialize patient & Rx
- CRM: See initialized patient (step 2)
- Patient: Routes to step 2+ pages
- Switch between portals: Data always syncs
- Undo: Returns to step 1
```

---

## Key Principles

1. **Single Source of Truth**
   - Global store is the only truth source
   - No local-only state for workflow data
   - All portals read from same store

2. **Immediate Sync**
   - Store action called immediately (no "Save" button)
   - No uncommitted changes
   - Form disappears after success

3. **Consistent Naming**
   - Builder owns action names (not user)
   - Prevents naming conflicts
   - Optimizes for reusability

4. **Comprehensive Testing**
   - 5 sync tests required (Section 4)
   - Tab switching tested
   - Flow types tested
   - Undo tested

5. **No Implementation Details**
   - User describes WHAT
   - Builder implements HOW
   - Consistency enforced automatically

---

## Checklist: Is Your Feature Consistent?

Before shipping, verify:

- [ ] Feature uses `[CONSISTENCY]` prefix in request
- [ ] CONSISTENCY_ENFORCER.md is filled out
- [ ] Section 2 answers: What changes? Which portals? Workflow?
- [ ] Section 4: All 5 sync tests pass
- [ ] Section 5: No anti-patterns present
- [ ] Store action calls: `_deriveStep()`, `_snapshot()`, `_logEvent()`
- [ ] No local-only state for workflow data
- [ ] Tab switching test passes
- [ ] Undo test passes
- [ ] All flow types work

✅ All checks pass → Feature is consistent

---

## FAQ

**Q: Do I need to remember all the template sections?**
A: No. Use `[CONSISTENCY] Feature:` and builder asks the questions.

**Q: Can I use this for bug fixes?**
A: Only if the bug affects global consistency. For normal bugs, just describe the issue.

**Q: What if I'm not sure about workflow progression?**
A: Builder will ask. If you're not sure, say "I'm not sure" and builder will help determine it.

**Q: Can builder reuse an existing action?**
A: Yes. Builder checks for reuse before implementing. That's why builder names actions, not you.

**Q: What if the feature is complex?**
A: Builder will ask clarifying questions. Answer them and the rest is automated.

**Q: Can I see the plan before builder builds?**
A: Yes. Builder shows the filled template and asks for confirmation.

---

## Next Steps

1. **Users:** Read [PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md)
2. **Builders:** Read [CONSISTENCY_ENFORCER.md](./CONSISTENCY_ENFORCER.md)
3. **Everyone:** Bookmark this system guide

When requesting a feature:
```
[CONSISTENCY] Feature: [Your feature]
```

That's it. Builder handles the rest.

---

## Questions?

Refer to:
- **"How do I request features?"** → PROMPTING_GUIDE.md
- **"What's the template?"** → CONSISTENCY_ENFORCER.md (Section: Full Template)
- **"What are the tests?"** → CONSISTENCY_ENFORCER.md (Section 4)
- **"What are anti-patterns?"** → CONSISTENCY_ENFORCER.md (Section 5)
