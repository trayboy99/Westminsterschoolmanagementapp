-- 🔍 SHOW ALL COLUMNS IN cbt_questions TABLE
-- Run this to see EVERY column and its data type

SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- This will show us ALL columns with their exact sizes
-- Look for any VARCHAR(20) or VARCHAR(50) that we missed!
