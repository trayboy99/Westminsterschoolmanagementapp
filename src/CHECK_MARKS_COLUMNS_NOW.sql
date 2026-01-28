-- Check marks table columns
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- Check sample mark data
SELECT 
  student_id,
  exam_id,
  type,
  ca1,
  ca2,
  exam,
  terminal_ca1,
  terminal_ca2,
  terminal_exam,
  created_at,
  updated_at
FROM marks
ORDER BY updated_at DESC
LIMIT 5;
