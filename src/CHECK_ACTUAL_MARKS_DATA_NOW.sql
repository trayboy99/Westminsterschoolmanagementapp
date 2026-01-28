-- ✅ STEP 1: Check what columns exist in the marks table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- ✅ STEP 2: Check a sample mark entry to see which columns have data
SELECT 
  id,
  student_id,
  type,
  -- Old columns (if they exist)
  ca1,
  ca2,
  exam,
  total,
  -- New columns (if they exist)
  midterm_ca1,
  midterm_ca2,
  midterm_exam,
  midterm_total,
  terminal_ca1,
  terminal_ca2,
  terminal_exam,
  terminal_total,
  status,
  created_at
FROM marks
ORDER BY created_at DESC
LIMIT 5;

-- ✅ STEP 3: Count how many marks you have by type
SELECT 
  type,
  COUNT(*) as count
FROM marks
GROUP BY type;
