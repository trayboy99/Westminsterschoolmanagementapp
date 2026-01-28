# 🔴 DECIMAL MARKS ERROR STILL OCCURRING - TROUBLESHOOTING

## The Error
```
[Supabase] Error saving marks entry: {
  code: "22P02",
  details: null,
  hint: null,
  message: 'invalid input syntax for type integer: "17.5"'
}
```

Error code **22P02** = "Invalid text representation" - means PostgreSQL is trying to convert "17.5" to INTEGER and failing.

---

## ✅ STEP-BY-STEP FIX

### Step 1: Verify the SQL Actually Ran

Run this in Supabase SQL Editor to check if columns were changed:

```sql
SELECT 
  column_name, 
  data_type,
  udt_name,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marks'
  AND column_name IN ('ca1', 'ca2', 'exam', 'total')
ORDER BY column_name;
```

**Expected Result:**
```
column_name | data_type | udt_name | numeric_precision | numeric_scale
------------+-----------+----------+-------------------+--------------
ca1         | numeric   | numeric  | 5                 | 2
ca2         | numeric   | numeric  | 5                 | 2
exam        | numeric   | numeric  | 5                 | 2
total       | numeric   | numeric  | 6                 | 2
```

**If you see `integer` or `int4` instead, the ALTER TABLE didn't work!**

---

### Step 2: Find ALL Integer Columns

There might be OTHER columns causing the issue. Run this:

```sql
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'marks'
  AND (data_type = 'integer' OR udt_name = 'int4')
ORDER BY column_name;
```

**Expected Result:** Only ID columns should be integer:
- `id` (primary key)
- `student_id` (if UUID, might not show)
- `exam_id` (if UUID, might not show)
- `subject_id` (if UUID, might not show)

**If you see `ca1`, `ca2`, `exam`, or `total` in this list, they didn't change!**

---

### Step 3: Force the Column Type Change

Sometimes ALTER TABLE fails silently. Try this more explicit version:

```sql
-- Drop any constraints first
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_ca1_check;
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_ca2_check;
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_exam_check;
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_total_check;

-- Force the type change with USING clause
ALTER TABLE marks 
  ALTER COLUMN ca1 TYPE NUMERIC(5,2) USING ca1::NUMERIC(5,2);
  
ALTER TABLE marks 
  ALTER COLUMN ca2 TYPE NUMERIC(5,2) USING ca2::NUMERIC(5,2);
  
ALTER TABLE marks 
  ALTER COLUMN exam TYPE NUMERIC(5,2) USING exam::NUMERIC(5,2);
  
ALTER TABLE marks 
  ALTER COLUMN total TYPE NUMERIC(6,2) USING total::NUMERIC(6,2);
```

---

### Step 4: Check for Triggers or Views

Run this to see if there's a trigger interfering:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'marks';
```

**If you see any triggers**, they might be converting decimals to integers. You'd need to DROP the trigger:

```sql
DROP TRIGGER trigger_name ON marks;
```

---

### Step 5: Clear Supabase Cache

After changing column types, Supabase might cache the old schema:

1. **In Supabase Dashboard:**
   - Go to **Database** → **Tables**
   - Find the `marks` table
   - Click to view its structure
   - Verify columns show `numeric` type

2. **Restart Edge Functions** (if needed):
   - In your browser, clear cache (Ctrl+Shift+R / Cmd+Shift+R)
   - The server function should pick up the new schema

---

### Step 6: Test with a Simple Insert

After fixing, test directly in SQL Editor:

```sql
-- This should work without errors
INSERT INTO marks (
  student_id,
  exam_id, 
  subject_id,
  type,
  ca1,
  ca2,
  exam,
  total,
  status,
  submitted_by
) VALUES (
  (SELECT id FROM profiles WHERE role = 'student' LIMIT 1),
  (SELECT id FROM exams LIMIT 1),
  (SELECT id FROM subjects LIMIT 1),
  'terminal',
  17.5,   -- Decimal CA1
  18.75,  -- Decimal CA2
  45.25,  -- Decimal exam
  81.5,   -- Decimal total
  'draft',
  (SELECT id FROM profiles WHERE role = 'teacher' LIMIT 1)
);

-- Check if it was inserted
SELECT ca1, ca2, exam, total FROM marks ORDER BY created_at DESC LIMIT 1;

-- Clean up the test
DELETE FROM marks WHERE ca1 = 17.5 AND ca2 = 18.75;
```

---

## 🔍 COMMON CAUSES

### Cause 1: SQL Didn't Actually Run
- **Check:** Look at Supabase SQL Editor - did you see "Success" message?
- **Fix:** Re-run the ALTER TABLE commands

### Cause 2: Wrong Table Name
- **Check:** Is the table definitely called `marks` (lowercase)?
- **Fix:** Run `SELECT tablename FROM pg_tables WHERE tablename LIKE '%mark%';`

### Cause 3: RLS Policy Blocking ALTER TABLE
- **Check:** RLS policies shouldn't block DDL, but check with `SELECT * FROM pg_policies WHERE tablename = 'marks';`
- **Fix:** Temporarily disable RLS: `ALTER TABLE marks DISABLE ROW LEVEL SECURITY;` (re-enable after fix)

### Cause 4: Multiple Marks Tables
- **Check:** Run `SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'marks';`
- **Fix:** Make sure you're altering the correct schema (usually `public`)

### Cause 5: Column Doesn't Exist Yet
- **Check:** Run `SELECT column_name FROM information_schema.columns WHERE table_name = 'marks';`
- **Fix:** If columns don't exist, you need to ADD them first, not ALTER them

---

## 🚨 NUCLEAR OPTION (Last Resort)

If nothing works, recreate the columns:

```sql
-- DANGER: This will DELETE all marks data!
-- Export your data first if you have important marks saved

-- 1. Export existing data (REQUIRED - don't skip this!)
CREATE TEMP TABLE marks_backup AS SELECT * FROM marks;

-- 2. Drop the problematic columns
ALTER TABLE marks DROP COLUMN ca1;
ALTER TABLE marks DROP COLUMN ca2;
ALTER TABLE marks DROP COLUMN exam;
ALTER TABLE marks DROP COLUMN total;

-- 3. Add them back as NUMERIC
ALTER TABLE marks ADD COLUMN ca1 NUMERIC(5,2);
ALTER TABLE marks ADD COLUMN ca2 NUMERIC(5,2);
ALTER TABLE marks ADD COLUMN exam NUMERIC(5,2);
ALTER TABLE marks ADD COLUMN total NUMERIC(6,2);

-- 4. Restore data (convert integers to decimals)
UPDATE marks m
SET 
  ca1 = b.ca1::NUMERIC(5,2),
  ca2 = b.ca2::NUMERIC(5,2),
  exam = b.exam::NUMERIC(5,2),
  total = b.total::NUMERIC(6,2)
FROM marks_backup b
WHERE m.id = b.id;

-- 5. Verify
SELECT ca1, ca2, exam, total FROM marks LIMIT 5;

-- 6. Drop backup
DROP TABLE marks_backup;
```

---

## 📞 NEXT STEPS

**Run these diagnostics and report back:**

1. What does Step 1 (Verify SQL) show?
2. What does Step 2 (Find Integer Columns) show?
3. Did Step 3 (Force Type Change) give any errors?

**Copy the exact output of this query:**

```sql
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'marks'
ORDER BY column_name;
```

This will tell us exactly what's wrong!
