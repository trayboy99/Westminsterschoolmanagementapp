# 🔍 Report Card "No Marks Found" - Comprehensive Diagnostic & Fix

## Problem

Marks exist in the database and show as "Approved" in the marks management interface, but the Report Card shows "No marks found for this exam".

**Evidence:**
- Screenshot 1: Report Card shows "No marks found for this exam"
- Screenshot 2: Marks interface shows Tracy Papa has approved marks for English (both Midterm and Terminal)

## Root Cause Analysis

The report card query (line 14640-14646 in `/supabase/functions/server/index.tsx`) filters by:

```typescript
.eq("student_id", studentId)
.eq("exam_id", examData.id)
.eq("type", resultType)  // ⚠️ POTENTIAL ISSUE
.eq("status", "approved"); // ⚠️ POTENTIAL ISSUE
```

### Possible Causes:

1. **Type Mismatch**: The `type` column might contain different values than expected
   - Expected: `"midterm"` or `"terminal"`
   - Actual might be: `"midterm_exam"`, `"Midterm"`, `"mid-term"`, etc.

2. **Status Mismatch**: The `status` column might contain different values
   - Expected: `"approved"`
   - Actual might be: `"approved_by_principal"`, `"Approved"`, `"pending_approval"`, etc.

3. **Exam ID Mismatch**: The exam lookup might be finding the wrong exam
   - The query looks for exam by `name`, `session`, AND `term`
   - If any of these don't match exactly, it will find the wrong exam or no exam

4. **Missing Type Column**: The marks might have been saved without a `type` value (NULL)

## Diagnostic Steps

### Step 1: Run the Diagnostic SQL

Run `/DIAGNOSE_REPORT_CARD_NO_MARKS_ISSUE.sql` in your Supabase SQL Editor.

**What to look for:**
- **Query 3**: Should show Tracy's marks exist
- **Query 4**: Should match what the report card is looking for
- **Query 5**: Check if `type` values are exactly `"midterm"` and `"terminal"`
- **Query 6**: Check if `status` values are exactly `"approved"`

### Step 2: Check Console Logs

The report card already has extensive logging. Check your browser console for:

```
[Report Card] Looking for exam: {...}
[Report Card] Exam query result: {...}
[Report Card] Marks query: {...}
[Report Card] All marks (any status): {...}
```

This will tell you:
- If the exam was found
- If the marks query returned any results
- What the actual status values are

## Fixes

### Fix #1: If Type Column Has Wrong Values

If the diagnostic shows `type` is NULL or has unexpected values:

```sql
-- Check current type values
SELECT DISTINCT type, count(*) 
FROM marks 
WHERE student_id = 'TRACY_ID_HERE'
GROUP BY type;

-- If type is NULL, update it based on exam type
UPDATE marks m
SET type = CASE
  WHEN e.name LIKE '%Midterm%' OR e.name LIKE '%Mid-term%' THEN 'midterm'
  WHEN e.name LIKE '%Terminal%' OR e.name LIKE '%Final%' THEN 'terminal'
  ELSE 'terminal' -- Default to terminal
END
FROM exams e
WHERE m.exam_id = e.id
  AND m.type IS NULL;

-- Or manually set type for specific marks
UPDATE marks
SET type = 'midterm'
WHERE exam_id IN (SELECT id FROM exams WHERE name LIKE '%Midterm%')
  AND type IS NULL;

UPDATE marks
SET type = 'terminal'
WHERE exam_id IN (SELECT id FROM exams WHERE name LIKE '%Terminal%')
  AND type IS NULL;
```

### Fix #2: If Status Column Has Wrong Values

If the diagnostic shows `status` has unexpected values:

```sql
-- Check current status values
SELECT DISTINCT status, count(*) 
FROM marks 
WHERE student_id = 'TRACY_ID_HERE'
GROUP BY status;

-- Fix common status mismatches
UPDATE marks
SET status = 'approved'
WHERE status IN ('Approved', 'approved_by_principal', 'APPROVED', 'approved_final');

-- Or update specific student's marks
UPDATE marks
SET status = 'approved'
WHERE student_id = 'TRACY_ID_HERE'
  AND status != 'approved';
```

### Fix #3: If Exam Lookup is Failing

If the diagnostic shows no exam found, or wrong exam found:

```sql
-- Check what exams exist
SELECT id, name, session, term FROM exams WHERE term = 'First Term' AND session = '2025/2026';

-- Make sure the exam names match exactly
-- The report card passes: examName, sessionName, termName from the UI
-- These must match EXACTLY (case-sensitive) with what's in the database
```

**Frontend Fix** (if exam names don't match):

The report card might be passing the wrong exam name. Check `/components/results/AdminResultManagement.tsx` or wherever the report card is being called from to ensure it's passing the correct exam name.

### Fix #4: Update Report Card Query to Be More Forgiving

**Option A: Case-Insensitive Status Match**

```typescript
// In /supabase/functions/server/index.tsx around line 14645
// Change from:
.eq("status", "approved");

// To:
.ilike("status", "approved"); // Case-insensitive match
```

**Option B: Multiple Status Values**

```typescript
// Accept multiple status values
.in("status", ["approved", "approved_by_principal", "final"]);
```

**Option C: Remove Status Filter for Debugging**

```typescript
// Temporarily remove status filter to see if marks appear
// Comment out:
// .eq("status", "approved");
```

### Fix #5: Add Fallback Logic

Update the report card endpoint to check for marks with ANY status if approved marks aren't found:

```typescript
// Around line 14656-14675 in /supabase/functions/server/index.tsx
// This code already exists! It checks for marks with any status if approved marks aren't found
// But it only logs - it doesn't actually USE those marks

// MODIFY TO:
if (!marks || marks.length === 0) {
  console.log("[Report Card] No approved marks found, checking for any marks...");
  
  const { data: anyMarks } = await supabase
    .from("marks")
    .select("ca1, ca2, exam, total, status, subject_id")
    .eq("student_id", studentId)
    .eq("exam_id", examData.id)
    .eq("type", resultType);
  
  if (anyMarks && anyMarks.length > 0) {
    console.warn("[Report Card] Using non-approved marks:", anyMarks[0].status);
    // Use these marks instead of returning empty
    marks = anyMarks;
  }
}
```

## Quick Fix (Most Likely Cause)

Based on the symptoms, the most likely issue is that `status` is not exactly `"approved"`. 

**Run this SQL to fix it:**

```sql
-- Fix Tracy's marks specifically
UPDATE marks m
SET status = 'approved'
FROM profiles p
WHERE m.student_id = p.id
  AND p.first_name = 'Tracy'
  AND p.last_name LIKE '%Papa%'
  AND m.status IN ('Approved', 'approved_by_principal', 'pending_approval', 'submitted');

-- Verify the fix
SELECT 
  m.status,
  m.type,
  s.name as subject_name,
  e.name as exam_name
FROM marks m
LEFT JOIN subjects s ON m.subject_id = s.id
LEFT JOIN exams e ON m.exam_id = e.id
LEFT JOIN profiles p ON m.student_id = p.id
WHERE p.first_name = 'Tracy'
  AND p.last_name LIKE '%Papa%';
```

## Testing After Fix

1. **Clear browser cache** (important!)
2. **Refresh the report card page**
3. **Check console logs** for the `[Report Card]` messages
4. **Verify marks appear** in the report card

## Prevention

To prevent this issue in the future:

1. **Standardize Status Values**: Ensure marks are only saved with status = `"approved"` (lowercase)
2. **Add Database Constraint**:
   ```sql
   ALTER TABLE marks
   ADD CONSTRAINT marks_status_check 
   CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected'));
   ```

3. **Add Type Constraint**:
   ```sql
   ALTER TABLE marks
   ADD CONSTRAINT marks_type_check 
   CHECK (type IN ('midterm', 'terminal'));
   ```

4. **Update Frontend Validation**: Ensure the frontend always sends lowercase status and type values

## Related Files

- `/supabase/functions/server/index.tsx` (line 14550-14750) - Report card endpoint
- `/components/results/ReportCard.tsx` - Frontend component
- `/components/marks/MarksModule.tsx` - Marks submission logic
- `/DIAGNOSE_REPORT_CARD_NO_MARKS_ISSUE.sql` - Diagnostic queries

---

**Status:** ⚠️ **AWAITING DIAGNOSTIC RESULTS**

Please run the diagnostic SQL and share the results so we can identify the exact cause.
