-- 🔥 RUN THIS TO VERIFY MIDTERM & TERMINAL ARE BOTH SAVED

-- 1. Check all marks grouped by type
SELECT 
  type,
  status,
  COUNT(*) as count
FROM marks
WHERE status IN ('pending_approval', 'approved', 'submitted')
GROUP BY type, status
ORDER BY type, status;

-- Expected result:
-- type     | status            | count
-- ---------|-------------------|------
-- midterm  | pending_approval  | 10
-- terminal | pending_approval  | 10


-- 2. Check marks for a specific exam/subject (replace IDs with your actual IDs)
-- SELECT 
--   student_id,
--   type,
--   ca1,
--   ca2,
--   exam,
--   status,
--   submitted_by,
--   created_at
-- FROM marks
-- WHERE exam_id = 'YOUR-EXAM-ID'
--   AND subject_id = 'YOUR-SUBJECT-ID'
-- ORDER BY student_id, type;

-- Expected result: Each student should have 2 rows (1 midterm, 1 terminal)


-- 3. Find marks with missing class_id or submitted_by (causes "Unknown")
SELECT 
  id,
  student_id,
  exam_id,
  subject_id,
  class_id,
  submitted_by,
  type,
  status,
  CASE 
    WHEN class_id IS NULL THEN 'Missing class_id'
    WHEN submitted_by IS NULL THEN 'Missing submitted_by'
    ELSE 'OK'
  END as issue
FROM marks
WHERE status = 'pending_approval'
  AND (class_id IS NULL OR submitted_by IS NULL);

-- If this returns rows, that's why you see "Unknown Teacher/Class"


-- 4. Verify classes exist for the class_ids in marks
SELECT 
  m.id as mark_id,
  m.class_id,
  c.name as class_name,
  c.section_id,
  sec.name as section_name,
  CASE 
    WHEN c.id IS NULL THEN '❌ Class not found'
    WHEN c.section_id IS NULL THEN '⚠️ Class exists but no section_id'
    WHEN sec.id IS NULL THEN '⚠️ Class exists but section not found'
    ELSE '✅ Class and section exist'
  END as status
FROM marks m
LEFT JOIN classes c ON m.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
WHERE m.status = 'pending_approval'
ORDER BY status DESC;


-- 5. Verify teachers exist for the submitted_by in marks
SELECT 
  m.id as mark_id,
  m.submitted_by,
  CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) as teacher_name,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN '❌ Teacher not found'
    ELSE '✅ Teacher exists'
  END as status
FROM marks m
LEFT JOIN profiles p ON m.submitted_by = p.id
WHERE m.status = 'pending_approval'
ORDER BY status DESC;


-- 6. Complete diagnostic: Show everything for pending approvals
SELECT 
  m.id,
  m.student_id,
  CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name) as student_name,
  m.exam_id,
  e.name as exam_name,
  e.session,
  e.term,
  m.subject_id,
  sub.name as subject_name,
  m.class_id,
  c.name as class_name,
  sec.name as section_name,
  m.type,
  m.ca1,
  m.ca2,
  m.exam,
  m.status,
  m.submitted_by,
  CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) as teacher_name,
  m.created_at
FROM marks m
LEFT JOIN profiles s ON m.student_id = s.id
LEFT JOIN exams e ON m.exam_id = e.id
LEFT JOIN subjects sub ON m.subject_id = sub.id
LEFT JOIN classes c ON m.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
LEFT JOIN profiles p ON m.submitted_by = p.id
WHERE m.status = 'pending_approval'
ORDER BY m.exam_id, m.subject_id, m.class_id, m.type, student_name;

-- This shows EVERYTHING - look for NULL values in:
-- - class_name (means class_id is invalid)
-- - section_name (means section_id is invalid or missing)
-- - teacher_name (means submitted_by is invalid)
-- - student_name (means student_id is invalid)
