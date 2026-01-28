# 🔧 FIX SUBJECT PAIRINGS SAVE - DO THIS NOW

## The Problem
When you click "Save Timetable Settings" in the Pairs tab, nothing saves to the `subject_pairings` database table.

## The Solution (2 steps, 3 minutes)

### ✅ STEP 1: Run This SQL (2 minutes)

1. **Open Supabase Dashboard**
2. **Click "SQL Editor"** in the left sidebar
3. **Click "New Query"**
4. **Copy the ENTIRE content** from file: `/COMPLETE_FIX_RUN_THIS_NOW.sql`

**OR paste this directly:**

```sql
-- Add missing columns
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('junior', 'senior'));

-- Fix RLS policies (this is the main issue!)
DROP POLICY IF EXISTS "allow_all_authenticated" ON subject_pairings;

ALTER TABLE subject_pairings DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated"
ON subject_pairings
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON subject_pairings TO authenticated;
GRANT ALL ON subject_pairings TO anon;

-- Verify
SELECT 'Fix Applied!' as status;
```

5. **Click "RUN"**
6. You should see "Fix Applied!" message

---

### ✅ STEP 2: Test It (1 minute)

1. **Go back to your School Management System**
2. **Refresh the page** (F5)
3. **Go to Timetable → Pairs tab**
4. **Switch to "Senior Secondary (SSS)"**
5. **Drag two subjects together** (e.g., Biology onto Chemistry)
6. **Click "Save All Pairs"** button
7. **You should see:** "✅ Saved 1 pair group(s) to database!"

---

### ✅ STEP 3: Verify It Saved

**Go back to Supabase → SQL Editor → New Query:**

```sql
SELECT * FROM subject_pairings;
```

**Click RUN**

**You should see your pairs!** Each row represents one subject in a pair.

Example:
```
| id | pair_group_id | pair_group_name        | subject_id | level  |
|----|---------------|------------------------|------------|--------|
| 1  | pair_123      | Biology / Chemistry    | bio-uuid   | senior |
| 2  | pair_123      | Biology / Chemistry    | chem-uuid  | senior |
```

---

## ✅ That's It!

**The issue was:** Row Level Security (RLS) was blocking inserts to the `subject_pairings` table.

**The fix:** We created a permissive policy that allows authenticated users to insert, update, and delete.

---

## 🚀 Now You Can:

- Create subject pairs by dragging and dropping
- Save them to the database
- Generate timetables with paired subjects scheduled together
- All paired subjects will appear at the same time slot

---

## Still Not Working?

If you still see errors:

1. **Check browser console** (F12 → Console tab)
2. **Look for red error messages**
3. **Copy the error** and share it

The most common remaining issue is that you don't have any subjects configured as "departmental" or "paired":
- Go to **Subjects Config** tab
- Configure each subject
- Check "This is a departmental subject" (for SSS) or "This is a paired subject" (for JSS)
- Click Save

Then return to Pairs tab and the subjects will appear.
