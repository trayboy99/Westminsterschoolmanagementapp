-- =====================================================
-- ONE-COMMAND FIX FOR LEVEL CONSTRAINT
-- Copy and paste this entire block into Supabase SQL Editor
-- =====================================================

-- First, drop the constraint (if it exists)
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;

-- Update all existing rows to use 'Junior' or 'Senior'
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

-- Show the results
SELECT level, COUNT(*) as count FROM classes GROUP BY level;
