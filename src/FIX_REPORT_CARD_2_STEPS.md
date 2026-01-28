# 🔧 Fix Report Card "No Marks Found" - 2 STEPS ONLY

## What's Wrong

Tracy has marks in the database (you can see them in the marks table), but the report card can't find them.

**Root Cause:** The marks table has an `exam_id` that doesn't match what the report card is looking for.

---

## STEP 1: Refresh Report Card & Check Console

1. **Clear browser cache** (Ctrl+Shift+R)
2. **Open Console** (F12)
3. **Load Tracy's report card**

### Look for these logs:

```
[Report Card] ✅ Found exam ID: "xxx-yyy-zzz"
[Report Card] 🔍 DEBUG - All marks for this student: {...}
[Report Card] ❌ MISMATCH FOUND: No marks with exam_id="xxx-yyy-zzz"
[Report Card] 💡 Student's marks use these exam_ids: ["aaa-bbb-ccc"]
[Report Card] 💡 Student has marks for these exams: [{name: "...", session: "...", term: "..."}]
```

This will tell you:
- **What exam_id the report card wants:** `xxx-yyy-zzz`
- **What exam_id Tracy's marks have:** `aaa-bbb-ccc`
- **What exam Tracy's marks belong to**

---

## STEP 2: Fix the Mismatch in SQL

Open Supabase SQL Editor and run ONE of these fixes:

### Fix A: Update Tracy's Marks to Correct Exam ⭐ (Most Common)

If Tracy's marks are pointing to the wrong exam, update them:

```sql
-- Find Tracy's ID
SELECT id FROM profiles 
WHERE first_name ILIKE '%Tracy%' AND last_name ILIKE '%Papa%';

-- See what exam Tracy's marks use now
SELECT 
  m.exam_id,
  e.name,
  e.session,
  e.term,
  m.type,
  COUNT(*) as marks_count
FROM marks m
JOIN exams e ON m.exam_id = e.id
WHERE m.student_id = 'PASTE_TRACY_ID'
GROUP BY m.exam_id, e.name, e.session, e.term, m.type;

-- Update to correct exam (replace the exam name/session/term)
UPDATE marks
SET exam_id = (
  SELECT id FROM exams 
  WHERE name = 'First Term Examination'  -- ⚠️ Use exact exam name from report card UI
    AND session = '2025/2026'            -- ⚠️ Use exact session
    AND term = 'First Term'              -- ⚠️ Use exact term
  LIMIT 1
)
WHERE student_id = (
  SELECT id FROM profiles 
  WHERE first_name ILIKE '%Tracy%' AND last_name ILIKE '%Papa%'
)
AND exam_id != (
  SELECT id FROM exams 
  WHERE name = 'First Term Examination'
    AND session = '2025/2026'
    AND term = 'First Term'
  LIMIT 1
);
```

### Fix B: If Exam Doesn't Exist

If the console shows the exam doesn't exist:

```sql
-- Create the exam
INSERT INTO exams (name, session, term, status)
VALUES ('First Term Examination', '2025/2026', 'First Term', 'active')
RETURNING id;

-- Then run Fix A above
```

---

## Verify the Fix

After running the SQL, check:

```sql
-- Should show both midterm and terminal for Tracy
SELECT 
  p.first_name,
  p.last_name,
  e.name as exam_name,
  e.session,
  e.term,
  m.type,
  m.status,
  s.name as subject,
  m.total
FROM marks m
JOIN profiles p ON m.student_id = p.id
JOIN exams e ON m.exam_id = e.id
JOIN subjects s ON m.subject_id = s.id
WHERE p.first_name ILIKE '%Tracy%'
ORDER BY m.type;
```

**Expected:**
```
Tracy Papa | First Term Examination | 2025/2026 | First Term | midterm | approved | English | 35
Tracy Papa | First Term Examination | 2025/2026 | First Term | terminal | approved | English | 78
```

Both rows should have the **SAME exam name/session/term**.

---

## Test Report Card

1. Clear cache again
2. Refresh report card
3. Should now show marks!

---

## Why This Happens

**Common Scenarios:**

1. **Multiple exams with similar names**
   - "First Term Exam" vs "First Term Examination"
   - Marks entered for one, report card looking for the other

2. **Exam renamed after marks entered**
   - Marks entered when exam was called "Exam 1"
   - Exam later renamed to "First Term Examination"
   - Marks still point to old exam_id

3. **Wrong exam selected in UI**
   - Multiple exams for same session/term
   - Selected wrong one in dropdown

---

## Prevention

1. **Use consistent exam names** - Don't change exam names after marks are entered
2. **One exam per term** - Don't create multiple exams with same term
3. **Verify before entry** - Check exam name matches exactly before entering marks

---

## Still Not Working?

Share these from console:
```
[Report Card] ✅ Found exam ID: ...
[Report Card] 🔍 DEBUG - All marks for this student: ...
[Report Card] ❌ MISMATCH FOUND: ...
```

This will show exactly what's wrong.
