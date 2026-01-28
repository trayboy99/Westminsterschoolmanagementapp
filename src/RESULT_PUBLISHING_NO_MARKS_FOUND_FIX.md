# 🔥 URGENT FIX: "No Midterm Marks Found" Issue

## Problem

Result Publishing Settings shows "No Marks" even though marks have been entered!

```
┌─────────────────────────────────────┐
│ 2025/2026            [Current]      │
│ First Term - Midterm [Active Now]   │
│ 🔒 No Marks                         │  ← WRONG!
└─────────────────────────────────────┘
```

## Root Cause

The backend query for marks completion only looks for exams with `status = 'active'`:

```typescript
// Backend code (line 13614-13619)
const { data: exams } = await supabase
  .from("exams")
  .select("id, name, status")
  .eq("session", session)
  .eq("term", term)
  .eq("status", "active");  // ← ONLY ACTIVE EXAMS!
```

**If your exam has status = 'draft', 'pending', or NULL:**
- Backend finds 0 exams
- Returns: `marks_exist: false`
- Frontend shows: "🔒 No Marks"

## Diagnostic Steps

### Step 1: Check Your Exam Status

Run this SQL query:

```sql
SELECT 
  id,
  name,
  session,
  term,
  status,  -- ← Check this value!
  created_at
FROM exams
WHERE session = '2025/2026'
  AND term = 'First Term'
ORDER BY created_at DESC;
```

**Expected Results:**

| name | session | term | status |
|------|---------|------|---------|
| First term Examination 2025 | 2025/2026 | First Term | **active** ✅ |

**Problem Scenarios:**

| status | Problem |
|--------|---------|
| `draft` | ❌ Not visible to publishing system |
| `pending` | ❌ Not visible to publishing system |
| `NULL` | ❌ Not visible to publishing system |
| `active` | ✅ CORRECT! |

### Step 2: Check if Marks Exist

```sql
SELECT 
  type,
  COUNT(*) as count,
  status,
  COUNT(DISTINCT student_id) as students
FROM marks m
JOIN exams e ON m.exam_id = e.id
WHERE e.session = '2025/2026'
  AND e.term = 'First Term'
GROUP BY type, status;
```

**Expected:**
```
type     | count | status    | students
---------|-------|-----------|----------
midterm  |   50  | approved  |   25
```

If you see marks in the query but Result Publishing says "No Marks" → **Exam status is wrong!**

## Quick Fix

### Option 1: Set Exam to Active (SQL)

```sql
UPDATE exams
SET status = 'active'
WHERE session = '2025/2026'
  AND term = 'First Term'
  AND name = 'First term Examination 2025';
```

### Option 2: Set Exam to Active (UI)

1. Go to **Settings & Configuration** → **Exams**
2. Find "First term Examination 2025"
3. Click **Edit**
4. Set Status to **Active**
5. Click **Save**

### Option 3: Quick Fix All Exams for This Session/Term

```sql
UPDATE exams
SET status = 'active'
WHERE session = '2025/2026'
  AND term = 'First Term'
  AND (status IS NULL OR status != 'active');
```

## Verification

After fixing the exam status:

### Step 1: Hard Refresh
Press `Ctrl + Shift + R` to clear cache

### Step 2: Check Result Publishing
1. Go to **Results Management** → **Publishing Settings**
2. Select **Midterm** from dropdown
3. Should now show:

```
┌─────────────────────────────────────┐
│ 2025/2026            [Current]      │
│ First Term - Midterm [Active Now]   │
│                                      │
│ Midterm Marks Entry Completion Status
│ Track which classes have midterm marks...
│                                      │
│ [Shows table with subjects/classes]  │ ✅ CORRECT!
│                                      │
│ [Publish Results] (if complete)      │
└─────────────────────────────────────┘
```

### Step 3: Check Marks Completion Table

Should show subjects and classes with marks:

| Subject | JSS 2 A | JSS 2 B |
|---------|---------|---------|
| English | ✅ 25/25 | ✅ 30/30 |
| Mathematics | ✅ 25/25 | ⚠️ 28/30 |

## Why This Happens

### Automatic Exam Status System

We implemented automatic exam status management:
- **Draft** → Newly created exams
- **Active** → Marks entry allowed, visible to publishing
- **Completed** → Term ended, marks published

The exam might have been created before this system, or the status wasn't set properly.

## Backend Logic Explanation

```typescript
// Line 13613-13653 in /supabase/functions/server/index.tsx

// 1. Get ACTIVE exams only
const { data: exams } = await supabase
  .from("exams")
  .select("id, name, status")
  .eq("session", session)
  .eq("term", term)
  .eq("status", "active");  // ← Filter by status

// 2. If no active exams found
if (!exams || exams.length === 0) {
  return c.json({
    success: true,
    subjects: [],
    all_complete: true,
    marks_exist: false,  // ← Sets marksExist to false
    message: "No active exams configured for this session/term"
  });
}

// 3. Frontend receives marks_exist: false
setMarksExist(false);

// 4. Display shows "No Marks"
{!marksExist && (
  <div className="flex items-center gap-2 text-slate-500">
    <Lock className="h-4 w-4" />
    No Marks
  </div>
)}
```

## Alternative Solutions

### Solution A: Remove Status Filter (Not Recommended)

Change backend to check ALL exams regardless of status:

```typescript
// Line 13614 - Remove .eq("status", "active")
const { data: exams } = await supabase
  .from("exams")
  .select("id, name, status")
  .eq("session", session)
  .eq("term", term);
  // .eq("status", "active");  ← Remove this line
```

**Why Not Recommended:**
- Draft exams should NOT be included in publishing
- Completed exams should be separate
- Status field exists for a reason

### Solution B: Add Multiple Status Filter

```typescript
const { data: exams } = await supabase
  .from("exams")
  .select("id, name, status")
  .eq("session", session)
  .eq("term", term)
  .in("status", ["active", "completed"]);  // ← Accept both
```

**Better:**
- Includes active and completed exams
- Excludes drafts
- More flexible

### Solution C: Set Exam Status Correctly (RECOMMENDED) ✅

Just set your exam status to "active":

```sql
UPDATE exams SET status = 'active' WHERE id = 'your-exam-id';
```

**Why Recommended:**
- Uses the system as designed
- Clean and simple
- No code changes needed

## Summary

### Problem:
- Result Publishing shows "No Marks"
- Marks exist in database
- Exam status is not "active"

### Fix:
```sql
UPDATE exams SET status = 'active' WHERE session = '2025/2026' AND term = 'First Term';
```

### Verify:
1. Hard refresh (Ctrl+Shift+R)
2. Check Result Publishing Settings
3. Should now show marks completion table

---

**Files to Run:**
1. `/DEBUG_EXAM_STATUS_NOW.sql` - Check exam status
2. SQL fix above - Set exam to active

**Expected Time:** 30 seconds to fix!
