-- ==================================================================================
-- VERIFY MARKS TABLE COLUMN STRUCTURE
-- ==================================================================================
-- This verifies that the marks table has the correct Nigerian school structure
-- ==================================================================================

-- Step 1: Check the actual column names in the marks table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'marks'
  AND column_name LIKE '%ca%' 
   OR column_name LIKE '%exam%'
   OR column_name LIKE '%total%'
ORDER BY column_name;

-- Expected columns:
-- midterm_ca1 (numeric)
-- midterm_ca2 (numeric)
-- midterm_exam (numeric)
-- midterm_total (numeric)
-- terminal_ca1 (numeric)
-- terminal_ca2 (numeric)
-- terminal_exam (numeric)
-- terminal_total (numeric)

-- Step 2: Check if there are ANY marks with data in the correct columns
SELECT 
  'Midterm Marks with Data' as check_type,
  COUNT(*) as count
FROM marks
WHERE midterm_ca1 IS NOT NULL 
   OR midterm_ca2 IS NOT NULL 
   OR midterm_exam IS NOT NULL
   OR midterm_total IS NOT NULL;

SELECT 
  'Terminal Marks with Data' as check_type,
  COUNT(*) as count
FROM marks
WHERE terminal_ca1 IS NOT NULL 
   OR terminal_ca2 IS NOT NULL 
   OR terminal_exam IS NOT NULL
   OR terminal_total IS NOT NULL;

-- Step 3: Sample data to verify
SELECT 
  id,
  type,
  status,
  midterm_ca1,
  midterm_ca2,
  midterm_exam,
  midterm_total,
  terminal_ca1,
  terminal_ca2,
  terminal_exam,
  terminal_total
FROM marks
WHERE midterm_total > 0 OR terminal_total > 0
LIMIT 10;

-- Step 4: Check Tracy's specific marks
SELECT 
  p.first_name,
  p.last_name,
  e.name as exam_name,
  s.name as subject_name,
  m.type,
  m.status,
  m.midterm_ca1,
  m.midterm_ca2,
  m.midterm_exam,
  m.midterm_total,
  m.terminal_ca1,
  m.terminal_ca2,
  m.terminal_exam,
  m.terminal_total
FROM marks m
JOIN profiles p ON m.student_id = p.id
JOIN exams e ON m.exam_id = e.id
JOIN subjects s ON m.subject_id = s.id
WHERE p.first_name ILIKE '%Tracy%'
  AND p.last_name ILIKE '%Papa%'
ORDER BY m.type;

-- ==================================================================================
-- WHAT TO LOOK FOR:
-- ==================================================================================
-- 1. Step 1 should show columns named:
--    - midterm_ca1, midterm_ca2, midterm_exam, midterm_total
--    - terminal_ca1, terminal_ca2, terminal_exam, terminal_total
--    NOT: ca1, ca2, exam, total (these are WRONG)
--
-- 2. Step 2 should show COUNT > 0 for both midterm and terminal
--    If COUNT = 0, no marks have been entered
--
-- 3. Step 3 should show sample data with actual numbers in the columns
--    For midterm rows: midterm_* columns should have data, terminal_* should be NULL
--    For terminal rows: terminal_* columns should have data, midterm_* might be NULL
--
-- 4. Step 4 should show Tracy's marks:
--    - One row with type='midterm' and data in midterm_* columns
--    - One row with type='terminal' and data in terminal_* columns
-- ==================================================================================
