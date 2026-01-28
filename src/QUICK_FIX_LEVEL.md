# ⚡ Quick Fix for Level Constraint Error

## The Error
```
Error saving class: Error: Failed to create class: new row for relation "classes" violates check constraint "classes_level_check"
```
OR
```
ERROR: 23514: check constraint "classes_level_check" of relation "classes" is violated by some row
```

## The Fix (Copy & Paste This)

**Go to Supabase Dashboard → SQL Editor → Paste and Run this ENTIRE block:**

```sql
-- Drop old constraint first
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;

-- Update existing data BEFORE adding new constraint
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

-- Add new constraint after data is clean
ALTER TABLE classes 
ADD CONSTRAINT classes_level_check 
CHECK (level IN ('Junior', 'Senior'));

-- Verify it worked
SELECT level, COUNT(*) as count FROM classes GROUP BY level;
```

## Done! ✅

Now you can:
- Create classes with "Junior" or "Senior" grade levels
- Class names like "JSS1" or "SSS2" will display with sections as "JSS1 Gold", "SSS2 Silver"
- All existing classes are automatically updated

---

**Need more details?** See `FIX_LEVEL_CONSTRAINT_GUIDE.md`
