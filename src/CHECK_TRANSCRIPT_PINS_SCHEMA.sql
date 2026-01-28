-- ============================================================
-- CHECK TRANSCRIPT_PINS TABLE SCHEMA
-- ============================================================
-- This will show us what columns actually exist

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
ORDER BY ordinal_position;

-- Also check if the table exists at all
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'transcript_pins'
) as table_exists;

-- Check existing data
SELECT * FROM transcript_pins LIMIT 5;
