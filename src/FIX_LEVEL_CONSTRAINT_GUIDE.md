# Fix Classes Level Constraint Error

## Problem
You're getting this error when creating a class:
```
Error: Failed to create class: new row for relation "classes" violates check constraint "classes_level_check"
```

This happens because the `classes` table has a database constraint that expects specific values for the `level` column, but you're now trying to insert "Junior" or "Senior" which aren't allowed by the current constraint.

## Solution

Run **ONE** of these SQL migrations in your Supabase SQL Editor:

### Option 1: Simple Fix (Recommended)
Use this file: `FIX_CLASSES_LEVEL_CONSTRAINT.sql`

```sql
-- Drop existing constraint
ALTER TABLE classes 
DROP CONSTRAINT IF EXISTS classes_level_check;

-- Add new constraint for Junior/Senior
ALTER TABLE classes 
ADD CONSTRAINT classes_level_check 
CHECK (level IN ('Junior', 'Senior'));

-- Update existing records
UPDATE classes 
SET level = CASE 
  WHEN level ILIKE '%junior%' OR level ILIKE 'jss%' THEN 'Junior'
  WHEN level ILIKE '%senior%' OR level ILIKE 'sss%' THEN 'Senior'
  ELSE 'Junior'
END
WHERE level NOT IN ('Junior', 'Senior');
```

### Option 2: Alternative Fix (If Option 1 doesn't work)
Use this file: `FIX_CLASSES_LEVEL_ALTERNATIVE.sql`

This script automatically finds and removes any check constraints on the level column, then adds the new one.

## Steps to Apply the Fix

1. **Open Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to SQL Editor (left sidebar)

2. **Create New Query**
   - Click "New query"
   - Copy and paste the SQL from `FIX_CLASSES_LEVEL_CONSTRAINT.sql`

3. **Run the Migration**
   - Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)
   - Check for any error messages

4. **Verify the Fix**
   - Run this verification query:
   ```sql
   SELECT DISTINCT level FROM classes;
   ```
   - You should only see "Junior" and "Senior" (or no records if table is empty)

5. **Test Creating a Class**
   - Go back to your app
   - Try creating a new class with "Junior" or "Senior" level
   - It should work now!

## What This Fix Does

1. **Removes old constraint** - Drops the existing check constraint that was restricting level values
2. **Adds new constraint** - Creates a new constraint that only allows "Junior" and "Senior"
3. **Updates existing data** - Automatically converts any existing class levels to match the new format:
   - JSS1, JSS2, JSS3 → Junior
   - SSS1, SSS2, SSS3 → Senior
   - Anything with "junior" → Junior
   - Anything with "senior" → Senior

## Troubleshooting

### If you get "constraint does not exist" error
This is actually fine! It means there was no constraint to drop. The migration will still add the new constraint.

### If existing data conversion fails
You may have some classes with unexpected level values. You can manually check and update them:

```sql
-- See all existing levels
SELECT id, name, level FROM classes;

-- Manually update specific classes
UPDATE classes SET level = 'Junior' WHERE id = 'class-id-here';
UPDATE classes SET level = 'Senior' WHERE id = 'class-id-here';
```

### If you want to remove the constraint entirely
If you want to allow any text value for level (not recommended):

```sql
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;
```

## After Fixing

Once the migration is applied:
- You can create classes with "Junior" or "Senior" levels
- All existing classes will be updated to use the new format
- The display name will show as "JSS1 Gold", "SSS2 Silver", etc. (class name + section)
- The constraint ensures data consistency across the system
