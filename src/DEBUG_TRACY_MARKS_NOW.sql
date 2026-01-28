-- ==================================================================================
-- DEBUG TRACY PAPA'S MARKS - Find out why report card isn't showing them
-- ==================================================================================

-- Step 1: Find Tracy Papa's student_id
SELECT 
  id as student_id,
  first_name,
  last_name,
  email,
  class_id,
  status
FROM profiles
WHERE first_name ILIKE '%Tracy%'
  AND last_name ILIKE '%Papa%';

-- Expected: Should return 1 row with Tracy's UUID

-- Step 2: Find all exams in the system
SELECT 
  id as exam_id,
  name,
  session,
  term,
  status,
  created_at
FROM exams
ORDER BY created_at DESC
LIMIT 20;

-- Expected: Shows all available exams

-- Step 3: Find ALL marks for Tracy (using the student_id from Step 1)
-- ⚠️ REPLACE 'TRACY_STUDENT_ID_HERE' with the actual UUID from Step 1
SELECT 
  m.id as mark_id,
  m.exam_id,
  e.name as exam_name,
  e.session as exam_session,
  e.term as exam_term,
  m.type as mark_type,
  m.status as mark_status,
  s.name as subject_name,
  m.ca1,
  m.ca2,
  m.exam as exam_mark,
  m.total,
  m.created_at,
  m.updated_at
FROM marks m
LEFT JOIN exams e ON m.exam_id = e.id
LEFT JOIN subjects s ON m.subject_id = s.id
WHERE m.student_id = 'TRACY_STUDENT_ID_HERE'  -- ⚠️ REPLACE THIS
ORDER BY m.created_at DESC;

-- Expected: Shows all of Tracy's marks with exam names

-- Step 4: Check what the report card is actually looking for
-- This simulates the backend query
-- ⚠️ REPLACE THESE VALUES:
--   - TRACY_STUDENT_ID_HERE: Tracy's UUID from Step 1
--   - EXAM_NAME_HERE: The exact exam name from the UI (e.g., 'First Term Examination 2025')
--   - SESSION_HERE: The session (e.g., '2025/2026')
--   - TERM_HERE: The term (e.g., 'First Term')

-- First, find the exam_id that the report card would find
SELECT 
  id as exam_id,
  name,
  session,
  term
FROM exams
WHERE name = 'EXAM_NAME_HERE'  -- ⚠️ REPLACE THIS
  AND session = 'SESSION_HERE'  -- ⚠️ REPLACE THIS
  AND term = 'TERM_HERE';       -- ⚠️ REPLACE THIS

-- Expected: Should return 1 exam with its ID

-- Then, use that exam_id to find marks
SELECT 
  m.*,
  s.name as subject_name
FROM marks m
LEFT JOIN subjects s ON m.subject_id = s.id
WHERE m.student_id = 'TRACY_STUDENT_ID_HERE'  -- ⚠️ REPLACE THIS
  AND m.exam_id = 'EXAM_ID_FROM_ABOVE';       -- ⚠️ REPLACE THIS with result from previous query

-- Expected: Should return Tracy's marks for that exam

-- Step 5: Quick check - Do ANY marks exist with Tracy's student_id?
SELECT 
  COUNT(*) as total_marks,
  COUNT(DISTINCT exam_id) as different_exams,
  ARRAY_AGG(DISTINCT type) as types_used,
  ARRAY_AGG(DISTINCT status) as statuses_used
FROM marks
WHERE student_id = 'TRACY_STUDENT_ID_HERE';  -- ⚠️ REPLACE THIS

-- Expected: Shows summary of Tracy's marks

-- ==================================================================================
-- DIAGNOSIS GUIDE:
-- ==================================================================================

-- If Step 1 returns NO rows:
--   ❌ Tracy's profile doesn't exist or name is spelled differently
--   ✅ Fix: Check exact spelling in profiles table

-- If Step 3 returns NO rows:
--   ❌ Tracy has NO marks in the database at all
--   ✅ Fix: Enter marks first in Marks Entry

-- If Step 3 returns rows but Step 4 Query 1 returns NO rows:
--   ❌ The exam doesn't exist with that exact name/session/term
--   ✅ Fix: Check exact exam name, session, term values
--   💡 The report card is looking for wrong exam

-- If Step 4 Query 1 returns a row but Query 2 returns NO rows:
--   ❌ Tracy has marks but for a DIFFERENT exam_id
--   ✅ Fix: The exam_id mismatch is the problem
--   💡 Check if marks were entered for a different exam

-- If Step 4 Query 2 returns rows:
--   ✅ Marks exist! The problem is status or type mismatch
--   💡 Check the 'status' and 'type' columns in the results

-- ==================================================================================
-- COMMON ISSUES:
-- ==================================================================================

-- Issue 1: exam_id mismatch
-- Cause: Marks were entered for "First Term Exam" but report card is looking for "First Term Examination"
-- Solution: Either rename the exam or re-enter marks for correct exam

-- Issue 2: Multiple exams with similar names
-- Cause: There are 2 exams both called "First Term Exam" for different sessions
-- Solution: Use EXACT session and term to differentiate

-- Issue 3: Status not "approved"
-- Cause: Marks have status = "Approved" (capital A) or "pending_approval"
-- Solution: Run /FIX_MARKS_STATUS_AND_TYPE_NOW.sql

-- Issue 4: Type not matching
-- Cause: Looking for "midterm" but marks have type = "terminal"
-- Solution: Select the correct type in the UI dropdown

-- ==================================================================================
