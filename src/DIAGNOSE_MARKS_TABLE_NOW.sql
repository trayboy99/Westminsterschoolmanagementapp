-- ========================================
-- DIAGNOSE MARKS TABLE - CHECK FOR class_id
-- ========================================

-- 1. Check what columns exist in marks table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- 2. Check sample marks data to see what's stored
SELECT 
  id,
  student_id,
  exam_id,
  subject_id,
  ca1,
  ca2,
  exam,
  total,
  status,
  created_at
FROM marks
LIMIT 5;

-- 3. Check exams table to see session/term storage
SELECT 
  id,
  name,
  session,
  term,
  created_at
FROM exams
ORDER BY created_at DESC
LIMIT 5;

-- Expected: class_id column is MISSING from marks table
-- This is why we can't query historical class context!
