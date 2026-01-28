# 🔍 Diagnose Tracy's "No Marks Found" - 3 Steps

## Current Situation

**Error:** `❌ [Report Card] ❌ No marks exist for this student/exam combination`

**Evidence:** You can see marks in the database table (screenshot shows they exist)

**Problem:** The report card query isn't finding them - there's a mismatch somewhere

---

## Step 1: Check Console Logs (Do This First)

The backend now has **enhanced debugging**. Open your browser console (F12) and look for these messages:

### What to Look For:

```
[Report Card] Looking for exam: {...}
[Report Card] Exam query result: {...}
[Report Card] Found exam ID: xxx-xxx-xxx

[Report Card] 🔍 DEBUG - All marks for this student: {...}
[Report Card] 🔍 DEBUG - Query parameters: {...}
[Report Card] All marks (any type/status): 0
```

### Key Questions:

1. **Did it find the exam?**
   - Look for: `[Report Card] Found exam ID: xxx`
   - If you see `Exam not found`, the exam lookup failed

2. **What exam_id is it using?**
   - Look for: `[Report Card] Found exam ID: xxx-xxx-xxx`
   - Copy this UUID - you'll need it

3. **How many marks does Tracy have in total?**
   - Look for: `[Report Card] 🔍 DEBUG - All marks for this student: { count: X }`
   - If count is 0, Tracy has NO marks at all
   - If count > 0, there's a mismatch

4. **What exam_ids does Tracy actually have marks for?**
   - Look for: `[Report Card] 🔍 Student has marks in OTHER exams: X`
   - Look for: `[Report Card] 🔍 Sample mark exam_ids: [...]`
   - This shows the actual exam_ids in Tracy's marks

### Diagnosis:

**If console shows:**
```
[Report Card] 🔍 DEBUG - All marks for this student: { count: 5 }
[Report Card] 🔍 Sample mark exam_ids: [
  { exam_id: "aaa-bbb-ccc", type: "terminal", status: "approved" }
]
[Report Card] 💡 MISMATCH: We're looking for exam_id="xxx-yyy-zzz" but student has marks for different exam_ids
```

**This means:** The report card is looking for the wrong exam! Tracy has marks, but for exam `aaa-bbb-ccc`, not `xxx-yyy-zzz`.

---

## Step 2: Run SQL Diagnostic

Open Supabase SQL Editor and run `/DEBUG_TRACY_MARKS_NOW.sql`

### Step 2.1: Get Tracy's student_id

```sql
SELECT id, first_name, last_name
FROM profiles
WHERE first_name ILIKE '%Tracy%' AND last_name ILIKE '%Papa%';
```

Copy Tracy's `id` (it's a UUID like `123e4567-e89b-12d3-a456-426614174000`)

### Step 2.2: See ALL Tracy's marks

```sql
SELECT 
  m.exam_id,
  e.name as exam_name,
  m.type,
  m.status,
  s.name as subject_name
FROM marks m
LEFT JOIN exams e ON m.exam_id = e.id
LEFT JOIN subjects s ON m.subject_id = s.id
WHERE m.student_id = 'PASTE_TRACY_ID_HERE';
```

**What you'll see:**
- All of Tracy's marks
- Which exam each mark belongs to (exam_name)
- The type (midterm/terminal)
- The status (approved/pending/etc)

### Step 2.3: Check what exam the report card is looking for

From the report card UI, note exactly:
- Exam name: `________________`
- Session: `________________`
- Term: `________________`

Then run:
```sql
SELECT id, name, session, term
FROM exams
WHERE name = 'First Term Examination'  -- Put exact name here
  AND session = '2025/2026'            -- Put exact session here
  AND term = 'First Term';             -- Put exact term here
```

**Compare the exam_id from this query with the exam_ids from Step 2.2**

---

## Step 3: Fix Based on Diagnosis

### Scenario A: exam_id Mismatch (Most Likely)

**Symptom:** Tracy has marks for exam `aaa-bbb-ccc` but report card is looking for exam `xxx-yyy-zzz`

**Cause:** One of these:
1. Marks were entered for a different exam
2. Multiple exams exist with similar names
3. The exam name/session/term changed after marks were entered

**Fix Option 1 - Use the Correct Exam:**
- In the report card UI, select the exam that Tracy actually has marks for
- Use the exam name from Step 2.2

**Fix Option 2 - Update the Marks:**
```sql
-- Update Tracy's marks to use the correct exam_id
UPDATE marks
SET exam_id = 'CORRECT_EXAM_ID_HERE'
WHERE student_id = 'TRACY_ID_HERE'
  AND exam_id = 'OLD_EXAM_ID_HERE';
```

### Scenario B: Status Mismatch

**Symptom:** Marks found but status is not "approved"

**Fix:**
```sql
UPDATE marks
SET status = 'approved'
WHERE student_id = 'TRACY_ID_HERE';
```

### Scenario C: Type Mismatch

**Symptom:** Looking for "midterm" but marks have type "terminal"

**Fix:** Select the correct type in the UI dropdown

### Scenario D: No Marks Exist

**Symptom:** Step 2.2 returns 0 rows

**Fix:** Enter marks first in the Marks Entry module

---

## Quick Reference

### Console Log Meanings:

| Log Message | Meaning |
|------------|---------|
| `Found exam ID: xxx` | ✅ Exam found successfully |
| `Exam not found` | ❌ Exam lookup failed |
| `All marks for this student: { count: 0 }` | ❌ Tracy has NO marks at all |
| `All marks for this student: { count: 5 }` | ✅ Tracy has marks, but mismatch |
| `MISMATCH: looking for exam_id="xxx"` | ❌ Wrong exam_id |

### Common Fixes:

| Issue | SQL Fix |
|-------|---------|
| Wrong exam_id | `UPDATE marks SET exam_id = 'NEW' WHERE student_id = 'TRACY'` |
| Wrong status | `UPDATE marks SET status = 'approved' WHERE student_id = 'TRACY'` |
| Wrong type | Change dropdown in UI OR `UPDATE marks SET type = 'midterm'` |

---

## What to Share

If you still can't fix it, share:

1. **Console logs** (copy/paste the entire [Report Card] section)
2. **SQL results** from Step 2.2 (Tracy's marks)
3. **SQL results** from Step 2.3 (Exam lookup)
4. **Screenshot** of the report card UI showing what you selected

This will show exactly where the mismatch is.

---

**Status:** ✅ Enhanced debugging deployed - check console now!
