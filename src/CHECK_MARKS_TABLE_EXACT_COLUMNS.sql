-- ============================================================
-- CHECK EXACT MARKS TABLE STRUCTURE
-- Run this FIRST to see what columns actually exist
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'marks'
ORDER BY ordinal_position;
