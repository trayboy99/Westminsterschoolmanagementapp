-- ==================================================================================
-- FIX TRACY PAPA'S EXAM_ID MISMATCH - Copy/Paste Solution
-- ==================================================================================
-- This finds the mismatch and fixes it
-- ==================================================================================

-- STEP 1: Find Tracy Papa's student_id
SELECT 
  '=== STEP 1: Tracy Papa Profile ===' as step,
  id as tracy_student_id,
  first_name,
  last_name,
  email,
  class_id
FROM profiles
WHERE first_name ILIKE '%Tracy%'
  AND last_name ILIKE '%Papa%';

-- Copy Tracy's ID from above: ____________________


-- STEP 2: See ALL Tracy's marks with exam details
SELECT 
  '=== STEP 2: Tracy''s Marks ===' as step,
  m.id as mark_id,
  m.exam_id,
  e.name as exam_name,
  e.session as exam_session,
  e.term as exam_term,
  e.status as exam_status,
  m.type as mark_type,
  m.status as mark_status,
  s.name as subject_name,
  m.ca1,
  m.ca2,
  m.exam as exam_mark,
  m.total,
  m.created_at
FROM marks m
LEFT JOIN exams e ON m.exam_id = e.id
LEFT JOIN subjects s ON m.subject_id = s.id
WHERE m.student_id = 'PASTE_TRACY_ID_HERE'  -- ⚠️ REPLACE with Tracy's ID from Step 1
ORDER BY m.created_at DESC;

-- Look at the exam_id column and exam_name column
-- Are there TWO different exam_ids? Or same exam_id?


-- STEP 3: See ALL exams in the system
SELECT 
  '=== STEP 3: All Exams ===' as step,
  id as exam_id,
  name as exam_name,
  session,
  term,
  status,
  created_at
FROM exams
ORDER BY created_at DESC
LIMIT 20;

-- Find the CORRECT exam that should be used for the report card
-- Note its exam_id: ____________________


-- STEP 4: Check what exam the report card is trying to use
-- ⚠️ REPLACE these with exact values from your report card UI:
--   - EXAM_NAME: e.g., 'First Term Examination'
--   - SESSION: e.g., '2025/2026'
--   - TERM: e.g., 'First Term'

SELECT 
  '=== STEP 4: Report Card Lookup ===' as step,
  id as exam_id_report_card_will_use,
  name,
  session,
  term
FROM exams
WHERE name = 'EXAM_NAME_HERE'     -- ⚠️ REPLACE
  AND session = 'SESSION_HERE'     -- ⚠️ REPLACE
  AND term = 'TERM_HERE';          -- ⚠️ REPLACE

-- This shows which exam_id the report card is looking for


-- ==================================================================================
-- DIAGNOSIS:
-- ==================================================================================

-- Compare the exam_id from Step 2 (Tracy's marks) with Step 4 (what report card wants)
-- 
-- If they're DIFFERENT, you have an exam_id mismatch!
--
-- Example:
--   Step 2 shows: Tracy's marks have exam_id = "aaa-111-bbb"
--   Step 4 shows: Report card looking for exam_id = "ccc-222-ddd"
--   ❌ MISMATCH!

-- ==================================================================================
-- FIX OPTIONS:
-- ==================================================================================

-- OPTION A: Update Tracy's marks to use the correct exam_id
-- Use this if Tracy's marks are pointing to the wrong exam

UPDATE marks
SET exam_id = 'CORRECT_EXAM_ID_FROM_STEP_4'  -- ⚠️ REPLACE with exam_id from Step 4
WHERE student_id = 'TRACY_ID_FROM_STEP_1'    -- ⚠️ REPLACE with Tracy's ID
  AND exam_id = 'OLD_EXAM_ID_FROM_STEP_2';   -- ⚠️ REPLACE with old exam_id

-- After running this, verify:
SELECT 
  m.exam_id,
  e.name as exam_name,
  m.type,
  s.name as subject_name,
  m.total
FROM marks m
LEFT JOIN exams e ON m.exam_id = e.id
LEFT JOIN subjects s ON m.subject_id = s.id
WHERE m.student_id = 'TRACY_ID_HERE'
ORDER BY m.type;


-- OPTION B: Update the exam to match what Tracy has
-- Use this if the exam name/session/term changed after marks were entered

-- First, find what exam_id Tracy's marks use:
SELECT DISTINCT m.exam_id, e.name, e.session, e.term
FROM marks m
LEFT JOIN exams e ON m.exam_id = e.id
WHERE m.student_id = 'TRACY_ID_HERE';

-- Then update that exam's details:
UPDATE exams
SET 
  name = 'NEW_NAME',      -- ⚠️ REPLACE with correct name
  session = '2025/2026',  -- ⚠️ REPLACE with correct session
  term = 'First Term'     -- ⚠️ REPLACE with correct term
WHERE id = 'EXAM_ID_FROM_TRACY_MARKS';  -- ⚠️ REPLACE


-- ==================================================================================
-- QUICK FIX (If you know the correct exam):
-- ==================================================================================

-- If you know Tracy's marks should be for "First Term Examination 2025/2026 First Term"
-- and you know that exam's ID, just run:

UPDATE marks
SET exam_id = (
  SELECT id FROM exams 
  WHERE name = 'First Term Examination'  -- ⚠️ REPLACE with exact exam name
    AND session = '2025/2026'            -- ⚠️ REPLACE
    AND term = 'First Term'              -- ⚠️ REPLACE
  LIMIT 1
)
WHERE student_id = (
  SELECT id FROM profiles 
  WHERE first_name ILIKE '%Tracy%' 
    AND last_name ILIKE '%Papa%'
  LIMIT 1
)
AND exam_id != (
  SELECT id FROM exams 
  WHERE name = 'First Term Examination'
    AND session = '2025/2026'
    AND term = 'First Term'
  LIMIT 1
);

-- Verify it worked:
SELECT 
  p.first_name,
  p.last_name,
  e.name as exam_name,
  e.session,
  e.term,
  m.type,
  m.status,
  s.name as subject_name,
  m.total
FROM marks m
JOIN profiles p ON m.student_id = p.id
JOIN exams e ON m.exam_id = e.id
JOIN subjects s ON m.subject_id = s.id
WHERE p.first_name ILIKE '%Tracy%'
  AND p.last_name ILIKE '%Papa%'
ORDER BY m.type;

-- ==================================================================================
-- EXPECTED RESULT:
-- ==================================================================================
-- After the fix, you should see:
--
-- Tracy Papa | First Term Examination | 2025/2026 | First Term | midterm | approved | English | 35
-- Tracy Papa | First Term Examination | 2025/2026 | First Term | terminal | approved | English | 78
--
-- Both marks should point to the SAME exam_id
-- ==================================================================================
