# Consistency System - Complete Documentation Index

**Your Core Principle:** *Stages and Global data with dynamic variables—users can click any navigation tab without the experience being out of sync.*

---

## Start Here

**New to this system?**

1. **First:** Read [CONSISTENCY_README.md](./CONSISTENCY_README.md) (5 min)
2. **Then:** Pick your role below
3. **Finally:** Bookmark the relevant files

---

## By Role

### 👤 Product Manager / Non-Technical User
**Goal:** Request features that maintain consistency

**Start with:**
- [CONSISTENCY_README.md](./CONSISTENCY_README.md) — Quick start
- [PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md) — How to request features

**Your workflow:**
```
[CONSISTENCY] Feature: [Your feature name]
→ Answer 4 simple questions
→ Builder shows plan
→ You confirm
→ Feature ships with consistency guaranteed ✅
```

**No need to read:** CONSISTENCY_ENFORCER.md, CONSISTENCY_SYSTEM.md

---

### 👨‍💻 Developer / Builder
**Goal:** Implement features while enforcing consistency

**Start with:**
- [CONSISTENCY_ENFORCER.md](./CONSISTENCY_ENFORCER.md) — Template + implementation guide
- [CONSISTENCY_README.md](./CONSISTENCY_README.md) — Quick reference

**Your workflow:**
```
Detect: [CONSISTENCY] Feature: [Name]
→ Ask 4 questions (from PROMPTING_GUIDE.md)
→ Fill template (CONSISTENCY_ENFORCER.md Section 2)
→ Show plan to user
→ Implement with store actions
→ Run 5 sync tests
→ Ship ✅
```

**Reference files:**
- CONSISTENCY_ENFORCER.md (Template)
- CONSISTENCY_SYSTEM.md (System overview)
- PROMPTING_GUIDE.md (What users ask)

---

### 🏗️ Tech Lead / Architect
**Goal:** Maintain architecture, ensure consistency system is used

**Start with:**
- [CONSISTENCY_SYSTEM.md](./CONSISTENCY_SYSTEM.md) — Full system overview
- [CONSISTENCY_ENFORCER.md](./CONSISTENCY_ENFORCER.md) — Anti-patterns section

**Monitor:**
- All features use `[CONSISTENCY]` prefix
- All CONSISTENCY_ENFORCER.md templates are filled
- All 5 sync tests pass before shipping
- No local-only state for workflow data

---

## File Guide

### [ARCHITECTURE.md](./ARCHITECTURE.md)
**For:** Developers building features
**Length:** ~15 min read
**Contains:**
- Four layers (Store, Routing, Local State, Variables)
- Rules for each layer
- Data flow diagram
- When things go wrong (debugging)
- Architecture checklist

**When to use:** Understanding how to structure code, code review, onboarding developers

---

### [CONSISTENCY_README.md](./CONSISTENCY_README.md)
**For:** Everyone (start here)
**Length:** ~5 min read
**Contains:**
- Quick start (5 lines)
- Example request/implementation
- Problem/solution pairs
- Checklist
- TL;DR

**When to use:** First time, quick reference, explaining to team

---

### [PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md)
**For:** Users/PMs requesting features
**Length:** ~10 min read
**Contains:**
- How `[CONSISTENCY] Feature:` works
- The 4 questions builder asks
- Real examples (3 different features)
- Anti-patterns to avoid
- When to use vs when not to use

**When to use:** Before requesting a feature, explaining to team how to request

---

### [CONSISTENCY_ENFORCER.md](./CONSISTENCY_ENFORCER.md)
**For:** Builders/Developers implementing features
**Length:** ~15 min initial read
**Contains:**
- Interactive flow (what builder asks)
- Full template for manual filling
- Real example (iAssist initialization)
- Anti-patterns section
- Rollback/debug checklist
- 5 sync test cases

**When to use:** When building a feature, checking implementation patterns, testing

---

### [CONSISTENCY_SYSTEM.md](./CONSISTENCY_SYSTEM.md)
**For:** Tech leads, architects, team members
**Length:** ~10 min read
**Contains:**
- System overview
- User → Builder workflow
- Implementation checklist
- Before/after examples
- FAQ
- Problem/solution pairs

**When to use:** Understanding the big picture, team documentation, decisions

---

### [CONSISTENCY_INDEX.md](./CONSISTENCY_INDEX.md)
**For:** Everyone
**Length:** ~5 min read
**This file:** Navigation guide

---

## The Process at a Glance

```
USER REQUEST
├─ "[CONSISTENCY] Feature: [Name]"
│
BUILDER RECEIVES
├─ Detects [CONSISTENCY] prefix
├─ Asks 4 questions
│  ├─ What changes?
│  ├─ Which portals?
│  ├─ Workflow progression?
│  └─ Anything else?
│
BUILDER FILLS TEMPLATE
├─ CONSISTENCY_ENFORCER.md Sections 1-2
├─ Auto-generates Section 4 tests
├─ Shows user the plan
│
USER APPROVES
├─ Reviews filled template
├─ Confirms: "Ready to build"
│
BUILDER IMPLEMENTS
├─ Store action (with _deriveStep, _snapshot, _logEvent)
├─ Portal UI changes
├─ No local-only workflow state
├─ Runs all 5 sync tests
│  ├─ TEST 1: Tab switch persistence
│  ├─ TEST 2: Undo works
│  ├─ TEST 3: All flow types
│  ├─ TEST 4: Downstream workflows
│  └─ TEST 5: Rapid navigation
│
FEATURE SHIPPED ✅
└─ Consistency guaranteed
```

---

## Common Workflows

### Scenario 1: "I want to request a feature"
1. Read: CONSISTENCY_README.md (2 min)
2. Read: PROMPTING_GUIDE.md (first example)
3. Write: `[CONSISTENCY] Feature: [Your feature]`
4. Answer builder's 4 questions
5. Done

**Files needed:** CONSISTENCY_README.md, PROMPTING_GUIDE.md

---

### Scenario 2: "I need to implement a [CONSISTENCY] feature"
1. Read: CONSISTENCY_ENFORCER.md (first 5 sections)
2. Ask user the 4 questions
3. Fill template (Section 2)
4. Show user the plan
5. Implement:
   - Create store action
   - Update portal UI
   - Run 5 sync tests
6. Verify all tests pass
7. Ship

**Files needed:** CONSISTENCY_ENFORCER.md, PROMPTING_GUIDE.md

---

### Scenario 3: "Is my feature consistent?"
1. Check: Feature used `[CONSISTENCY]` prefix? ✅
2. Check: CONSISTENCY_ENFORCER.md is filled? ✅
3. Check: All 5 sync tests pass? ✅
4. Check: No anti-patterns (Section 5)? ✅
5. Done

**Files needed:** CONSISTENCY_ENFORCER.md (Section 5)

---

### Scenario 4: "Why is this feature desynchronizing?"
1. Read: CONSISTENCY_ENFORCER.md (Section 6: Rollback Checklist)
2. Verify: _deriveStep() called? ✅
3. Verify: _snapshot() called? ✅
4. Verify: Reading from store, not local state? ✅
5. Debug from checklist

**Files needed:** CONSISTENCY_ENFORCER.md (Section 6)

---

## Quick Links

- **I want to request a feature:** [PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md)
- **I need to build a feature:** [CONSISTENCY_ENFORCER.md](./CONSISTENCY_ENFORCER.md)
- **I need to understand the system:** [CONSISTENCY_SYSTEM.md](./CONSISTENCY_SYSTEM.md)
- **I just want the basics:** [CONSISTENCY_README.md](./CONSISTENCY_README.md)
- **I need to find something:** You're reading it 👈

---

## Key Principles (Remember These)

### 1. Single Source of Truth
Global store is the ONLY source of truth. No local-only state for workflow data.

### 2. Immediate Sync
Store action called immediately. No "Save" button delays. Form disappears after success.

### 3. Consistent Naming
Builder names store actions, not user. Prevents conflicts, optimizes reusability.

### 4. Comprehensive Testing
All features tested: tab switching, undo, flow types, downstream, rapid navigation.

### 5. User Describes WHAT
User says what they want. Builder implements HOW and ensures consistency.

---

## Prefix Convention

**Use this in ANY feature request:**
```
[CONSISTENCY] Feature: [Name]
```

That's it. Builder will:
1. Recognize the prefix
2. Ask you 4 questions
3. Fill the template
4. Build with full consistency
5. Verify all tests pass

---

## Checklist: Am I Using This Right?

For Users:
- [ ] Using `[CONSISTENCY]` prefix for feature requests?
- [ ] Describing WHAT, not HOW?
- [ ] Answering builder's 4 questions?
- [ ] Confirming plans before building?

For Builders:
- [ ] Detecting `[CONSISTENCY]` prefix?
- [ ] Asking the 4 questions?
- [ ] Filling CONSISTENCY_ENFORCER.md?
- [ ] Running all 5 sync tests?
- [ ] No local-only state for workflow data?

---

## Questions?

| I want to... | Go to... |
|-------------|----------|
| Request a feature | [PROMPTING_GUIDE.md](./PROMPTING_GUIDE.md) |
| Build a feature | [CONSISTENCY_ENFORCER.md](./CONSISTENCY_ENFORCER.md) |
| Understand the system | [CONSISTENCY_SYSTEM.md](./CONSISTENCY_SYSTEM.md) |
| Get started quickly | [CONSISTENCY_README.md](./CONSISTENCY_README.md) |
| Find this guide | [CONSISTENCY_INDEX.md](./CONSISTENCY_INDEX.md) ← You are here |

---

## Summary

This system ensures every feature maintains your core principle:
*"Users can click any tab without the experience being out of sync."*

**How?**
1. User requests with `[CONSISTENCY] Feature:`
2. Builder asks 4 questions + fills template
3. Builder implements with store actions (not local state)
4. All 5 sync tests must pass
5. Feature shipped with consistency guaranteed ✅

**That's it.** No complexity. No hidden implementation details. Just consistent features.

---

*Last updated: June 2026*
*Version: 1.0 - Full System Implementation*
