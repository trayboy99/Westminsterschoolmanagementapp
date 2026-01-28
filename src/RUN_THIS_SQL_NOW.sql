-- =====================================================
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- Then click RUN (or press Ctrl+Enter)
-- =====================================================

ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;

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

ALTER TABLE classes 
ADD CONSTRAINT classes_level_check 
CHECK (level IN ('Junior', 'Senior'));
