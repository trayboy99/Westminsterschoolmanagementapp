# 🔧 Level Constraint Fix - Complete Instructions

## The Problem
You're getting this error:
```
ERROR: 23514: check constraint "classes_level_check" of relation "classes" is violated by some row
```

This means:
1. Your database has a constraint that requires `level` to be specific values
2. Some existing classes in your database have `level` values that don't match
3. You can't add a new constraint until all existing data is fixed

## The Solution (3 Easy Steps)

### Step 1: Diagnose the Problem
Open **Supabase Dashboard → SQL Editor** and run this query to see what level values you currently have:

```sql
SELECT level, COUNT(*) as count 
FROM classes 
GROUP BY level
ORDER BY count DESC;
```

You'll probably see values like:
- `"JSS1"`, `"JSS2"`, `"JSS3"`
- `"SSS1"`, `"SSS2"`, `"SSS3"`
- Or other variations

### Step 2: Run the Fix
Copy and paste this **entire block** into Supabase SQL Editor and click Run:

```sql
-- Drop the old constraint
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;

-- Update all existing rows
UPDATE classes 
SET level = CASE 
  WHEN level ILIKE 'jss%' THEN 'Junior'
  WHEN level ILIKE '%junior%' THEN 'Junior'
  WHEN level IN ('1', '2', '3') THEN 'Junior'
  WHEN level ILIKE 'sss%' THEN 'Senior'
  WHEN level ILIKE '%senior%' THEN 'Senior'
  WHEN level IN ('4', '5', '6') THEN 'Senior'
  ELSE 'Junior'
END;

-- Add the new constraint
ALTER TABLE classes 
ADD CONSTRAINT classes_level_check 
CHECK (level IN ('Junior', 'Senior'));

-- Verify it worked
SELECT level, COUNT(*) as count FROM classes GROUP BY level;
```

### Step 3: Verify Success
After running the script, you should see output showing only:
- `Junior` - X rows
- `Senior` - Y rows

If you see any other values, the fix didn't work properly.

## What This Does

1. **Removes old constraint** - Drops the existing constraint so we can modify data
2. **Updates all classes** - Converts existing level values to "Junior" or "Senior":
   - JSS1, JSS2, JSS3, "junior" → `Junior`
   - SSS1, SSS2, SSS3, "senior" → `Senior`
   - Grades 1-3 → `Junior`
   - Grades 4-6 → `Senior`
3. **Adds new constraint** - Creates a constraint that only allows "Junior" or "Senior"
4. **Shows results** - Displays what levels now exist in your database

## After the Fix

Once successful:
- ✅ You can create new classes with "Junior" or "Senior" grade levels
- ✅ Classes will display as "JSS1 Gold", "SSS2 Silver" (class name + section)
- ✅ All existing classes are updated to the new format
- ✅ The database enforces consistency going forward

## Troubleshooting

### If the update query returns 0 rows updated
This is fine! It means your classes table is empty.

### If you still get constraint violation errors
1. Run the diagnostic query again:
   ```sql
   SELECT id, name, level FROM classes WHERE level NOT IN ('Junior', 'Senior');
   ```
2. Manually update any problematic rows:
   ```sql
   UPDATE classes SET level = 'Junior' WHERE id = 'problem-class-id';
   ```

### If you want to see the exact constraint
```sql
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'classes_level_check';
```

## Alternative: Remove Constraint Entirely

If you want to allow ANY text value for level (not recommended):

```sql
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;
```

This removes the constraint entirely, but you lose data validation.

## Files to Use

- **FIX_LEVEL_ONE_COMMAND.sql** - The complete fix (easiest)
- **FIX_LEVEL_STEP_BY_STEP.sql** - Step-by-step if you want to verify each step
- **DIAGNOSE_LEVEL_ISSUE.sql** - Diagnostic queries to understand the problem
- **This file** - Complete instructions

---

**Ready?** Go to Supabase SQL Editor and run **FIX_LEVEL_ONE_COMMAND.sql** now! 🚀
