-- ==================================================================================
-- DIAGNOSE: Report Card "No marks found" issue
-- ==================================================================================
-- This query will help us understand why marks exist but aren't showing on report card
-- ==================================================================================

-- 1. Check what exams exist for Tracy's session/term
SELECT 
  id,
  name,
  session,
  term,
  status,
  created_at
FROM exams
WHERE session = '2025/2026'
  AND term = 'First Term'
ORDER BY created_at DESC;

-- 2. Check Tracy Papa's profile
SELECT 
  id,
  first_name,
  last_name,
  class_id,
  role,
  status
FROM profiles
WHERE first_name = 'Tracy'
  AND last_name LIKE '%Papa%';

-- 3. Check ALL marks for Tracy (regardless of status or type)
SELECT 
  m.id,
  m.student_id,
  m.exam_id,
  m.subject_id,
  s.name as subject_name,
  m.type,
  m.ca1,
  m.ca2,
  m.exam as exam_mark,
  m.total,
  m.status,
  e.name as exam_name,
  e.session,
  e.term,
  m.created_at,
  m.updated_at
FROM marks m
LEFT JOIN subjects s ON m.subject_id = s.id
LEFT JOIN exams e ON m.exam_id = e.id
WHERE m.student_id IN (
  SELECT id FROM profiles 
  WHERE first_name = 'Tracy' 
    AND last_name LIKE '%Papa%'
)
ORDER BY m.created_at DESC;

-- 4. Check what the report card query is actually looking for
-- (This simulates the backend query)
SELECT 
  m.ca1,
  m.ca2,
  m.exam as exam_mark,
  m.total,
  m.status,
  m.type,
  s.name as subject_name,
  e.name as exam_name
FROM marks m
LEFT JOIN subjects s ON m.subject_id = s.id
LEFT JOIN exams e ON m.exam_id = e.id
WHERE m.student_id IN (
  SELECT id FROM profiles 
  WHERE first_name = 'Tracy' 
    AND last_name LIKE '%Papa%'
)
  AND e.name = 'First Term Examination 2025'  -- ⚠️ CHANGE THIS to match your exam name
  AND e.session = '2025/2026'
  AND e.term = 'First Term'
  AND m.type = 'midterm'  -- Change to 'terminal' to test terminal marks
  AND m.status = 'approved';

-- 5. Check for case sensitivity or value mismatches in type column
SELECT DISTINCT
  type,
  length(type) as type_length,
  ascii(substring(type from 1 for 1)) as first_char_ascii
FROM marks
WHERE student_id IN (
  SELECT id FROM profiles 
  WHERE first_name = 'Tracy' 
    AND last_name LIKE '%Papa%'
);

-- 6. Check for case sensitivity or value mismatches in status column
SELECT DISTINCT
  status,
  length(status) as status_length,
  ascii(substring(status from 1 for 1)) as first_char_ascii,
  count(*) as count
FROM marks
WHERE student_id IN (
  SELECT id FROM profiles 
  WHERE first_name = 'Tracy' 
    AND last_name LIKE '%Papa%'
)
GROUP BY status;

-- ==================================================================================
-- EXPECTED RESULTS:
-- ==================================================================================
-- Query 3 should show Tracy's marks (should exist based on your screenshot)
-- Query 4 should return rows IF the report card query is correct
-- If Query 4 returns 0 rows but Query 3 shows marks, then there's a mismatch in:
--   - exam_id/name
--   - type value (midterm vs midterm_exam or something)
--   - status value (approved vs approved_by_principal or something)
-- ==================================================================================
