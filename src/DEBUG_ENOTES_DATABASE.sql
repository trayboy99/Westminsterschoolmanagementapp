-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DEBUG: Check E-Notes in Database
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Check ALL E-Notes in the database
SELECT 
  id,
  title,
  type,
  session,
  term,
  week,
  class_id,
  created_at
FROM uploads
WHERE type = 'e-note'
ORDER BY created_at DESC;

-- 2. Check if the student's profile has the correct class_id
SELECT 
  id,
  first_name,
  last_name,
  role,
  class_id,
  email
FROM profiles
WHERE role = 'student'
ORDER BY class_id;

-- 3. Check what sessions are in academic_calendar
SELECT DISTINCT session, term
FROM academic_calendar
ORDER BY session DESC, 
  CASE term 
    WHEN 'First Term' THEN 1
    WHEN 'Second Term' THEN 2
    WHEN 'Third Term' THEN 3
  END;

-- 4. Check exact match for a specific student
-- Replace 'STUDENT_EMAIL_HERE' with the actual student email
SELECT 
  p.first_name,
  p.last_name,
  p.class_id as student_class,
  u.id as upload_id,
  u.title as upload_title,
  u.class_id as upload_class,
  u.session,
  u.term,
  u.week,
  u.type
FROM profiles p
LEFT JOIN uploads u ON u.class_id = p.class_id AND u.type = 'e-note'
WHERE p.email = 'STUDENT_EMAIL_HERE'
ORDER BY u.created_at DESC;

-- 5. Check for exact match with specific filters
-- This simulates what the backend query does
SELECT *
FROM uploads
WHERE session = '2025/2026'
  AND term = 'First Term'
  AND type = 'e-note'
  AND week = 1
  AND class_id = 'JSS3-DIAMOND';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- WHAT TO CHECK:
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- From Query 1 (All E-Notes):
-- ✓ Confirm type is 'e-note' (not 'e-notes' or 'E-Notes')
-- ✓ Confirm week is a NUMBER (1, 2, 3, not "Week 1")
-- ✓ Note the exact session value (including spaces, slashes)
-- ✓ Note the exact term value (including capitalization)
-- ✓ Note the exact class_id value (including hyphens, capitalization)

-- From Query 2 (Student Profiles):
-- ✓ Confirm the student's class_id EXACTLY matches the upload's class_id
-- ✓ Check for any extra spaces or different formatting

-- From Query 3 (Academic Calendar):
-- ✓ Confirm the sessions available
-- ✓ Confirm the term names match exactly

-- From Query 4 (Student-Specific Match):
-- ✓ Replace 'STUDENT_EMAIL_HERE' with actual student email
-- ✓ See if any uploads match the student's class
-- ✓ If LEFT JOIN shows NULL for upload_id, no files exist for that class

-- From Query 5 (Exact Match Simulation):
-- ✓ Update the session, term, week, and class_id to match your test case
-- ✓ If this returns 0 rows, then those EXACT values don't exist together
-- ✓ Check each filter one by one to find the mismatch
