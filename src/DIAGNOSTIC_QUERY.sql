-- 🔍 DIAGNOSTIC: Find the problematic column
-- Run this FIRST to see which column has VARCHAR(20)

SELECT 
  column_name, 
  data_type, 
  character_maximum_length as max_length,
  CASE 
    WHEN character_maximum_length = 20 THEN '⚠️ POTENTIAL ISSUE'
    ELSE '✅ OK'
  END as status
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND table_schema = 'public'
  AND data_type = 'character varying'
ORDER BY character_maximum_length, column_name;

-- This will show you EXACTLY which column(s) have VARCHAR(20) limit
