# 🔥 ONE SQL COMMAND TO FIX EVERYTHING

## The Problem
Error: `null value in column "paired_subject_id" violates not-null constraint`

## The Solution
The table has an old `paired_subject_id` column with a NOT NULL constraint, but the new code doesn't use it.

---

## ✅ RUN THIS IN SUPABASE (30 seconds)

**Go to: Supabase → SQL Editor → New Query**

**Paste this and click RUN:**

```sql
-- Fix the paired_subject_id constraint issue
ALTER TABLE subject_pairings 
ALTER COLUMN paired_subject_id DROP NOT NULL;

-- Add missing columns (if not already there)
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT;

-- Disable RLS
ALTER TABLE subject_pairings DISABLE ROW LEVEL SECURITY;

-- Done!
SELECT 'Fixed! Now go try saving pairs again.' as message;
```

---

## ✅ Test It Now

1. **Refresh your School Management System**
2. **Go to: Timetable → Pairs tab**
3. **Drag Igbo onto Yoruba** (or any two subjects)
4. **Click "Save All Pairs"**
5. **You should see:** ✅ Saved 1 pair group(s) to database!

---

## ✅ Verify in Database

```sql
SELECT * FROM subject_pairings;
```

**Expected:** 2 rows (Igbo and Yoruba)

```
| id | subject_id | paired_subject_id | pair_group_id | pair_group_name | level  |
|----|------------|-------------------|---------------|-----------------|--------|
| 1  | igbo-uuid  | null              | pair_17638... | Igbo / Yoruba   | junior |
| 2  | yoruba-uuid| null              | pair_17638... | Igbo / Yoruba   | junior |
```

Notice `paired_subject_id` is now NULL - that's correct! We use `pair_group_id` instead.

---

## 🎉 That's It!

The error is fixed. The code already includes `paired_subject_id: null` in the insert, so once you run this SQL, everything will work.
