-- 🔍 DIAGNOSTIC: Check Exam Status for Result Publishing

-- Step 1: Check all exams for 2025/2026 - First Term
SELECT 
  id,
  name,
  session,
  term,
  status,  -- ← THIS IS THE KEY!
  created_at
FROM exams
WHERE session = '2025/2026'
  AND term = 'First Term'
ORDER BY created_at DESC;

-- Step 2: Check if marks exist for these exams
SELECT 
  e.name as exam_name,
  e.status as exam_status,
  COUNT(DISTINCT m.id) as total_marks,
  COUNT(DISTINCT CASE WHEN m.type = 'midterm' THEN m.id END) as midterm_marks,
  COUNT(DISTINCT CASE WHEN m.type = 'terminal' THEN m.id END) as terminal_marks
FROM exams e
LEFT JOIN marks m ON m.exam_id = e.id
WHERE e.session = '2025/2026'
  AND e.term = 'First Term'
GROUP BY e.id, e.name, e.status;

-- Step 3: Check if there are ANY marks for this session/term
SELECT 
  type,
  COUNT(*) as count,
  status,
  COUNT(DISTINCT student_id) as students,
  COUNT(DISTINCT subject_id) as subjects,
  COUNT(DISTINCT class_id) as classes
FROM marks m
JOIN exams e ON m.exam_id = e.id
WHERE e.session = '2025/2026'
  AND e.term = 'First Term'
GROUP BY type, status;

-- ✅ EXPECTED RESULT:
-- If exam status = 'draft' or 'pending' or NULL → PROBLEM! Need to set to 'active'
-- If exam status = 'active' → Should work fine

-- 🔧 FIX (if exam is not active):
-- Run this ONLY if the exam status is NOT 'active':
/*
UPDATE exams
SET status = 'active'
WHERE session = '2025/2026'
  AND term = 'First Term'
  AND (status IS NULL OR status != 'active');
*/
