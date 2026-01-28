-- =====================================================
-- COMPLETE MARKS TABLE DIAGNOSTIC
-- =====================================================
-- Run this to understand what's wrong before dropping
-- =====================================================

-- 1️⃣ CHECK TABLE STRUCTURE
SELECT 
  column_name, 
  data_type,
  udt_name,
  is_nullable,
  column_default,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- 2️⃣ CHECK FOR INTEGER COLUMNS (Should be NUMERIC)
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'marks'
  AND column_name IN ('ca1', 'ca2', 'exam', 'terminal_ca1', 'terminal_ca2', 'terminal_exam')
ORDER BY column_name;

-- 3️⃣ CHECK CONSTRAINTS
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'marks'::regclass;

-- 4️⃣ CHECK INDEXES
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'marks';

-- 5️⃣ CHECK TRIGGERS
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'marks';

-- 6️⃣ SAMPLE DATA CHECK
SELECT 
  id,
  student_id,
  subject_id,
  type,
  ca1,
  ca2,
  exam,
  terminal_ca1,
  terminal_ca2,
  terminal_exam,
  status,
  created_at
FROM marks
ORDER BY created_at DESC
LIMIT 10;

-- 7️⃣ CHECK FOR DECIMAL VALUES (Are they being stored correctly?)
SELECT 
  COUNT(*) as total_marks,
  COUNT(CASE WHEN ca1::text LIKE '%.%' THEN 1 END) as ca1_decimals,
  COUNT(CASE WHEN ca2::text LIKE '%.%' THEN 1 END) as ca2_decimals,
  COUNT(CASE WHEN exam::text LIKE '%.%' THEN 1 END) as exam_decimals,
  COUNT(CASE WHEN terminal_ca1::text LIKE '%.%' THEN 1 END) as terminal_ca1_decimals,
  COUNT(CASE WHEN terminal_ca2::text LIKE '%.%' THEN 1 END) as terminal_ca2_decimals,
  COUNT(CASE WHEN terminal_exam::text LIKE '%.%' THEN 1 END) as terminal_exam_decimals
FROM marks;

-- 8️⃣ CHECK FOR ANY MARKS WITH WRONG TERMINAL CA1 CALCULATION
-- Terminal CA1 should be (midterm ca1 + ca2 + exam) / 2
SELECT 
  m_mid.student_id,
  m_mid.subject_id,
  m_mid.ca1 as mid_ca1,
  m_mid.ca2 as mid_ca2,
  m_mid.exam as mid_exam,
  (m_mid.ca1 + m_mid.ca2 + m_mid.exam) as mid_total,
  ((m_mid.ca1 + m_mid.ca2 + m_mid.exam) / 2.0) as expected_terminal_ca1,
  m_term.terminal_ca1 as actual_terminal_ca1,
  CASE 
    WHEN ABS(m_term.terminal_ca1 - ((m_mid.ca1 + m_mid.ca2 + m_mid.exam) / 2.0)) > 0.1 
    THEN '❌ WRONG'
    ELSE '✅ CORRECT'
  END as status
FROM marks m_mid
LEFT JOIN marks m_term ON 
  m_mid.student_id = m_term.student_id AND 
  m_mid.subject_id = m_term.subject_id AND
  m_mid.exam_id = m_term.exam_id
WHERE m_mid.type = 'midterm'
  AND m_term.type = 'terminal'
  AND m_mid.ca1 IS NOT NULL
  AND m_mid.ca2 IS NOT NULL
  AND m_mid.exam IS NOT NULL
  AND m_term.terminal_ca1 IS NOT NULL
ORDER BY m_mid.created_at DESC
LIMIT 20;

-- 9️⃣ CHECK FOR DUPLICATE MARKS
SELECT 
  student_id,
  exam_id,
  subject_id,
  type,
  COUNT(*) as duplicate_count
FROM marks
GROUP BY student_id, exam_id, subject_id, type
HAVING COUNT(*) > 1;

-- 🔟 CHECK RLS POLICIES
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'marks';
