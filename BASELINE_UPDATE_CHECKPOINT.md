# Baseline Update Checkpoint System

> **CRITICAL**: Every agent MUST trigger this checkpoint before finishing a session!

---

## 🎯 PURPOSE

This system ensures:
1. All new features are captured in baseline documentation
2. User approves changes before they're committed to baseline
3. No work is lost between forked sessions
4. Clear handoff for next agent

---

## ⏰ WHEN TO TRIGGER

**MANDATORY Triggers:**
- Before using `finish` tool in any session
- When user says "fork" or "new session"
- After completing 3+ major features
- When approaching token limit (150k+ tokens used)

---

## 📋 BASELINE UPDATE CHECKLIST

Use this checklist with `ask_human` tool to get user approval:

```
## 🔄 Baseline Update Required

Hi! Before we conclude this session, I need to update the baseline documentation to preserve all our work.

### ✅ NEW FEATURES IMPLEMENTED THIS SESSION:
[List all new features with checkboxes]
- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

### 📁 NEW FILES CREATED:
[List all new files]
- /path/to/file1.tsx
- /path/to/file2.ts

### 🔧 MODIFIED FILES:
[List all modified files]
- /path/to/existing1.tsx (added X, removed Y)
- /path/to/existing2.py (updated Z)

### 🎨 UI/UX CHANGES:
[List visual/UX changes]
- Changed X to Y
- Removed Z
- Added new component A

### 💰 MONETIZATION CHANGES:
[List any tier/limit/pricing changes]
- Updated tier limits
- Added/removed restrictions

### 🐛 BUG FIXES:
[List critical fixes]
- Fixed X issue
- Resolved Y bug

### 📊 TESTING STATUS:
- [ ] Backend tested
- [ ] Frontend tested
- [ ] Manual testing done

---

**Should I proceed with updating the baseline documentation with these changes?**

Options:
1. ✅ Yes, update baseline (recommended)
2. 📝 Yes, but let me review first
3. ❌ No, skip for now
4. 🔧 Modify the list before updating
```

---

## 🔄 UPDATE WORKFLOW

### Step 1: Trigger Checkpoint
```
Agent uses ask_human tool with the checklist above
```

### Step 2: Get User Approval
```
User reviews and responds with option 1-4
```

### Step 3: Update Documentation
```
If approved:
1. Create new SESSION_X_UPDATES.md
2. Update WANDERLIST_BASELINE_MODEL.md version
3. Update test_result.md with new status
4. Update BASELINE_UPDATE_LOG.md
```

### Step 4: Confirm Completion
```
Agent confirms all docs updated and provides summary
```

---

## 📝 AGENT INSTRUCTIONS

**Before calling `finish` tool, ALWAYS:**

1. Check token usage (if >150k, trigger checkpoint)
2. Review work done this session
3. Use `ask_human` with baseline checklist
4. Wait for user approval
5. Update documentation files
6. Confirm updates complete
7. Then call `finish`

**Template for ask_human:**
```typescript
ask_human({
  question: `
🔄 **Baseline Update Checkpoint**

Before finishing this session, I need to update baseline documentation.

**New Features This Session:**
- Feature A (fully complete)
- Feature B (tested and working)

**Files Changed:**
- Created: /app/frontend/app/new-feature.tsx
- Modified: /app/backend/server.py (added endpoint X)

**Should I update the baseline with these changes?**
1. ✅ Yes, proceed
2. 📝 Let me review details first
  `
});
```

---

## 📂 FILES TO UPDATE

When approved, update these in order:

1. **`/app/SESSION_X_UPDATES.md`** (Create new)
   - X = session number (2, 3, 4, etc.)
   - Full details of all changes
   - Similar format to SESSION_2_UPDATES.md

2. **`/app/WANDERLIST_BASELINE_MODEL.md`**
   - Update version number
   - Update "Last Updated" date
   - Add summary of new features

3. **`/app/test_result.md`**
   - Update current status
   - Add reference to new session file
   - Update testing results

4. **`/app/BASELINE_UPDATE_LOG.md`** (Log of all updates)
   - Add entry with date, session, changes

---

## 🚨 CRITICAL RULES

**NEVER:**
- ❌ Finish session without triggering checkpoint
- ❌ Update baseline without user approval
- ❌ Skip documentation for "small changes"
- ❌ Assume previous documentation is current

**ALWAYS:**
- ✅ Ask user before updating
- ✅ List all changes clearly
- ✅ Update all 3 core files
- ✅ Confirm completion
- ✅ Provide clear summary

---

## 📊 EXAMPLE CHECKPOINT

**Good Checkpoint:**
```
🔄 Baseline Update Required

New Features:
✅ Payment integration (Stripe)
✅ Subscription management screen
✅ Webhook handling

Files:
- Created: /app/frontend/app/subscription.tsx
- Created: /app/backend/webhooks.py
- Modified: server.py (added payment endpoints)

Testing: Backend ✅ | Frontend ✅

Proceed with baseline update?
```

**Bad Checkpoint:**
```
Should I update docs?
```
^ No details, not helpful!

---

## 🎯 SUCCESS CRITERIA

Checkpoint is successful when:
1. ✅ User has reviewed all changes
2. ✅ User has approved update
3. ✅ All documentation files updated
4. ✅ Version numbers incremented
5. ✅ Clear summary provided
6. ✅ Next agent will have complete context

---

## 📈 TRACKING

Keep track in `/app/BASELINE_UPDATE_LOG.md`:

```
## Update Log

### Session 2 - January 7, 2026
**Version:** 2.0.0
**Features:** Messaging, Skeletons, Visit limits removed
**Files:** 3 created, 8 modified
**Status:** ✅ Complete

### Session 3 - [Date]
**Version:** 3.0.0
**Features:** [TBD]
**Files:** [TBD]
**Status:** [TBD]
```

---

**Last Updated:** January 7, 2026
**System Version:** 1.0
**Status:** Active
