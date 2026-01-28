-- =====================================================
-- COMPREHENSIVE FIX: All marks columns to DECIMAL
-- =====================================================
-- This fixes ALL possible numeric columns in marks table
-- Run this even if you ran the previous fix
-- =====================================================

-- Fix the main marks columns
ALTER TABLE marks 
  ALTER COLUMN ca1 TYPE NUMERIC(5,2),
  ALTER COLUMN ca2 TYPE NUMERIC(5,2),
  ALTER COLUMN exam TYPE NUMERIC(5,2),
  ALTER COLUMN total TYPE NUMERIC(6,2);

-- Also check if there are any other score-related columns
-- that might exist (grade, percentage, etc.)
-- Run this query to see if we need to fix more columns:
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'marks'
  AND data_type IN ('integer', 'smallint', 'bigint')
  AND column_name NOT IN ('id', 'student_id', 'exam_id', 'subject_id');

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marks' 
  AND column_name IN ('ca1', 'ca2', 'exam', 'total')
ORDER BY column_name;
