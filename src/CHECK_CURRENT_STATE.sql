-- 🔍 CHECK CURRENT STATE OF cbt_questions TABLE
-- Run this FIRST to see what the current column sizes are

SELECT 
  column_name, 
  data_type, 
  character_maximum_length as max_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND table_schema = 'public'
  AND data_type = 'character varying'
ORDER BY character_maximum_length, column_name;

-- This will show you which columns still have small sizes
-- Look for any columns with 20, 50, or 100 character limits
