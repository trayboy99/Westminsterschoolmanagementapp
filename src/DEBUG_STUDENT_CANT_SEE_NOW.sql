-- ═══════════════════════════════════════════════════════════════════════
-- DEBUG: WHY STUDENTS CAN'T SEE E-NOTES IN WEEK 1
-- ═══════════════════════════════════════════════════════════════════════

-- STEP 1: Check what's in the uploads table
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ STEP 1: UPLOADS TABLE ━━━' AS step;

SELECT 
  id,
  title,
  type,  -- CRITICAL: Is this "enote" or "e-note"?
  session,
  term,
  week,
  class_id,
  subject_id,
  created_at
FROM uploads
WHERE type LIKE '%note%'  -- Find anything with "note" in it
ORDER BY created_at DESC
LIMIT 10;

-- Check EXACT type values
SELECT 
  '━━━ WHAT TYPE VALUES EXIST? ━━━' AS info;

SELECT 
  type,
  COUNT(*) AS count,
  CASE 
    WHEN type = 'enote' THEN '✅ Correct (enote)'
    WHEN type = 'e-note' THEN '⚠️ Wrong format (e-note)'
    WHEN type = 'e-notes' THEN '⚠️ Wrong format (e-notes)'
    WHEN type = 'E-Notes' THEN '⚠️ Wrong format (E-Notes)'
    ELSE '❓ Unknown: ' || type
  END AS status
FROM uploads
GROUP BY type
ORDER BY count DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Check a specific student's profile
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ STEP 2: STUDENT PROFILE ━━━' AS step;

-- Replace 'student-email@school.com' with an actual student email
SELECT 
  id,
  first_name,
  last_name,
  role,
  class_id,
  email
FROM profiles
WHERE role = 'student'
  AND email LIKE '%@%'  -- Get any student
LIMIT 1;

-- Show their class_id clearly
SELECT 
  '🎓 Student Class ID:' AS info,
  class_id
FROM profiles
WHERE role = 'student'
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Check if uploads exist for that class
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ STEP 3: UPLOADS FOR STUDENT CLASS ━━━' AS step;

-- Get uploads that SHOULD match student
WITH student AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
)
SELECT 
  u.id,
  u.title,
  u.type,
  u.session,
  u.term,
  u.week,
  u.class_id AS upload_class,
  s.class_id AS student_class,
  CASE 
    WHEN u.class_id = s.class_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH: "' || u.class_id || '" ≠ "' || s.class_id || '"'
  END AS class_match
FROM uploads u
CROSS JOIN student s
WHERE u.type LIKE '%note%'
ORDER BY u.created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Check exact query that backend is running
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ STEP 4: SIMULATE BACKEND QUERY ━━━' AS step;

-- This simulates exactly what the backend does
-- Adjust the values to match what student would request
WITH student AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
)
SELECT 
  u.id,
  u.title,
  u.type,
  u.session,
  u.term,
  u.week,
  u.class_id,
  '✅ This file SHOULD appear' AS result
FROM uploads u
CROSS JOIN student s
WHERE u.session = '2025/2026'  -- ← From session dropdown
  AND u.term = 'First Term'    -- ← From term selection
  AND u.type = 'e-note'        -- ← Backend maps "E-Notes" to this
  AND u.week = 1               -- ← Week 1 selected
  AND u.class_id = s.class_id  -- ← Student filter
ORDER BY u.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: Find the ACTUAL mismatch
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ STEP 5: FIND THE MISMATCH ━━━' AS step;

-- Check each filter individually
WITH student AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
),
filters AS (
  SELECT 
    u.id,
    u.title,
    u.type,
    u.session,
    u.term,
    u.week,
    u.class_id,
    s.class_id AS student_class,
    -- Check each condition
    CASE WHEN u.session = '2025/2026' THEN '✅' ELSE '❌ "' || u.session || '"' END AS session_check,
    CASE WHEN u.term = 'First Term' THEN '✅' ELSE '❌ "' || u.term || '"' END AS term_check,
    CASE WHEN u.type = 'e-note' THEN '✅' ELSE '❌ "' || u.type || '"' END AS type_check,
    CASE WHEN u.week = 1 THEN '✅' ELSE '❌ week=' || COALESCE(u.week::text, 'NULL') END AS week_check,
    CASE WHEN u.class_id = s.class_id THEN '✅' ELSE '❌ "' || u.class_id || '" ≠ "' || s.class_id || '"' END AS class_check
  FROM uploads u
  CROSS JOIN student s
  WHERE u.type LIKE '%note%'
  ORDER BY u.created_at DESC
  LIMIT 5
)
SELECT * FROM filters;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 6: FINAL DIAGNOSIS
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ STEP 6: DIAGNOSIS ━━━' AS step;

-- Count how many filters are failing
WITH student AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
),
checks AS (
  SELECT 
    COUNT(*) FILTER (WHERE session != '2025/2026') AS session_mismatches,
    COUNT(*) FILTER (WHERE term != 'First Term') AS term_mismatches,
    COUNT(*) FILTER (WHERE type != 'e-note') AS type_mismatches,
    COUNT(*) FILTER (WHERE week IS NULL OR week != 1) AS week_mismatches,
    COUNT(*) FILTER (WHERE class_id != s.class_id) AS class_mismatches,
    COUNT(*) AS total_enotes
  FROM uploads u
  CROSS JOIN student s
  WHERE u.type LIKE '%note%'
)
SELECT 
  CASE 
    WHEN session_mismatches > 0 THEN '❌ SESSION MISMATCH - Found ' || session_mismatches || ' files'
    ELSE '✅ Session OK'
  END AS session_diagnosis,
  CASE 
    WHEN term_mismatches > 0 THEN '❌ TERM MISMATCH - Found ' || term_mismatches || ' files'
    ELSE '✅ Term OK'
  END AS term_diagnosis,
  CASE 
    WHEN type_mismatches > 0 THEN '❌ TYPE MISMATCH - Found ' || type_mismatches || ' files with wrong type'
    ELSE '✅ Type OK'
  END AS type_diagnosis,
  CASE 
    WHEN week_mismatches > 0 THEN '❌ WEEK MISMATCH - Found ' || week_mismatches || ' files'
    ELSE '✅ Week OK'
  END AS week_diagnosis,
  CASE 
    WHEN class_mismatches > 0 THEN '❌ CLASS MISMATCH - Found ' || class_mismatches || ' files'
    ELSE '✅ Class OK'
  END AS class_diagnosis,
  total_enotes || ' total e-notes in database' AS total
FROM checks;

-- ═══════════════════════════════════════════════════════════════════════
-- QUICK FIX OPTIONS
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ POTENTIAL FIXES ━━━' AS step;

SELECT 
  '1. If type is wrong (e-note vs enote):' AS fix,
  'UPDATE uploads SET type = ''enote'' WHERE type = ''e-note'';' AS sql_command
UNION ALL
SELECT 
  '2. If class_id is wrong:' AS fix,
  'Check student class_id vs upload class_id and fix manually' AS sql_command
UNION ALL
SELECT 
  '3. If session is wrong:' AS fix,
  'UPDATE uploads SET session = ''2025/2026'' WHERE LENGTH(session) > 20;' AS sql_command;

-- ═══════════════════════════════════════════════════════════════════════
-- FINAL CHECK: Show what query SHOULD return
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '━━━ WHAT SHOULD BE RETURNED? ━━━' AS step;

WITH student AS (
  SELECT id, class_id, first_name, last_name
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 1
)
SELECT 
  '📋 Expected results for student "' || s.first_name || ' ' || s.last_name || '" in class "' || s.class_id || '":' AS info,
  COUNT(*) AS file_count
FROM uploads u
CROSS JOIN student s
WHERE u.session = '2025/2026'
  AND u.term = 'First Term'
  AND u.type = 'e-note'
  AND u.week = 1
  AND u.class_id = s.class_id;

-- If count is 0, something is wrong!
-- If count > 0, files exist but frontend/backend not matching!
