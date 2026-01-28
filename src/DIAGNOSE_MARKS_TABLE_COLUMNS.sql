-- =====================================================
-- DIAGNOSE: Check ALL columns in marks table
-- =====================================================
-- This will show us EXACTLY which columns are INTEGER
-- and which ones are NUMERIC
-- =====================================================

-- Show ALL columns in marks table with their data types
SELECT 
  column_name, 
  data_type,
  udt_name,
  character_maximum_length,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- Also check if there are any CHECK constraints or triggers
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'marks';
