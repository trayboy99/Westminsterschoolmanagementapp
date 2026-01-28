# Database Fix for Salary Management System

## Problem
The `teacher_salaries` table has a unique constraint on `(teacher_id, session)` which prevents storing salary data for multiple months. This causes salaries to overwrite each other when entering data for different months.

## Solution
The unique constraint needs to be changed to include `month` and `year` fields so that each teacher can have separate salary records for each month.

## SQL Migration to Run in Supabase

**⚠️ IMPORTANT:** Run this SQL in your Supabase SQL Editor to fix the constraint issue.

```sql
-- Step 1: Drop the old constraint that only checks (teacher_id, session)
ALTER TABLE teacher_salaries 
DROP CONSTRAINT IF EXISTS teacher_salaries_teacher_id_session_key;

-- Step 2: Add new constraint that includes month and year
-- This allows multiple salary records per teacher for different months
ALTER TABLE teacher_salaries 
ADD CONSTRAINT teacher_salaries_teacher_session_month_year_key 
UNIQUE (teacher_id, session, month, year);

-- Step 3: Also add constraint for non-teaching staff
-- This prevents duplicate non-teaching staff for the same month
CREATE UNIQUE INDEX IF NOT EXISTS teacher_salaries_nonteaching_unique
ON teacher_salaries (staff_name, staff_duty, session, month, year)
WHERE staff_type = 'non-teaching';
```

## How to Apply This Fix

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the SQL above
5. Click **Run** to execute the migration
6. Verify the changes by checking the table structure

## After Running the Migration

Once you've run this SQL migration:
- ✅ Teachers can have separate salary records for each month
- ✅ January salary data won't be overwritten when entering February data
- ✅ You can view and manage salaries for any month independently
- ✅ The copy function will work correctly without duplicate key errors

## Verification

To verify the fix worked, you can run:

```sql
-- Check the constraints on teacher_salaries table
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'teacher_salaries';
```

You should see `teacher_salaries_teacher_session_month_year_key` in the results.
