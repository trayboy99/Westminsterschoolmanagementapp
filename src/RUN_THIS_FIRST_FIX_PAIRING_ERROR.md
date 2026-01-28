# ⚡ FIX PAIRING ERROR - Run This First!

## ❌ The Problem
You're seeing this error:
```
Error loading pairings from database: column subject_pairings.pair_group_name does not exist
```

## ✅ The Solution (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Copy and Run This SQL

**Copy the entire content of this file:**
`/FIX_SUBJECT_PAIRINGS_ADD_COLUMNS_NOW.sql`

**Or paste this directly:**

```sql
-- Add the missing columns to subject_pairings table
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('junior', 'senior'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subject_pairings_group_id 
ON subject_pairings(pair_group_id);

-- Update existing rows to have default values
UPDATE subject_pairings
SET 
  pair_group_id = COALESCE(pair_group_id, 'legacy_' || id::text),
  pair_group_name = COALESCE(pair_group_name, 'Paired Subjects'),
  level = COALESCE(level, 'senior')
WHERE pair_group_id IS NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subject_pairings'
ORDER BY ordinal_position;
```

### Step 3: Click "Run" Button

**Expected Result:**
You should see a table showing all columns including the new ones:
```
column_name         | data_type
--------------------|------------
id                  | uuid
subject_id          | uuid
paired_subject_id   | uuid
pairing_type        | text
created_at          | timestamp
pair_group_id       | text        ← NEW
pair_group_name     | text        ← NEW
level               | text        ← NEW
```

### Step 4: Refresh Your App

Go back to your School Management System and refresh the page. The error should be gone!

## ✅ Verification

After running the SQL, check if it worked:

1. Go to **Timetable Module** → **Pairs** tab
2. You should see no errors
3. The page should load successfully

## 📋 What This Does

This SQL script adds 3 new columns to your `subject_pairings` table:

1. **pair_group_id**: Groups 2, 3, or more subjects together
2. **pair_group_name**: Display name for the group (e.g., "Sciences", "Arts")
3. **level**: Indicates junior or senior level

These columns enable you to pair multiple subjects (not just 2) and have them scheduled at the same time in the timetable.

## 🚀 After Running This

Once the columns are added, you can:
1. Create pairs with 2, 3, or more subjects
2. Generate timetables that schedule paired subjects together
3. All paired subjects will appear at the same time slots

---

**Still seeing errors?** Check the browser console and share the error message.
