-- ================================================
-- Find ALL VARCHAR(20) columns in cbt_questions
-- ================================================
-- This will show us which column is causing the error

SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- This will show you ALL columns and their max lengths
-- Look for any VARCHAR(20) columns that might receive longer data
