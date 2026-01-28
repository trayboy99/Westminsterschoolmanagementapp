-- ═══════════════════════════════════════════════════════════════════════
-- TEST TYPE FIX - Verify Students Can See E-Notes
-- ═══════════════════════════════════════════════════════════════════════

-- STEP 1: Check what type values exist in database
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 1: CHECK TYPE VALUES ━━━' AS test;

SELECT 
  type,
  COUNT(*) as file_count,
  CASE 
    WHEN type = 'enote' THEN '✅ CORRECT - This is what backend expects'
    WHEN type = 'e-note' THEN '❌ WRONG - Backend won''t find these'
    WHEN type = 'e-notes' THEN '❌ WRONG - Should be normalized to "enote"'
    WHEN type = 'E-Notes' THEN '❌ WRONG - Should be normalized to "enote"'
    ELSE '⚠️ OTHER: ' || type
  END AS status,
  CASE 
    WHEN type = 'enote' THEN 'No action needed'
    ELSE 'UPDATE uploads SET type = ''enote'' WHERE type = ''' || type || ''';'
  END AS fix_sql
FROM uploads
WHERE type LIKE '%note%'  -- Find all note-related types
GROUP BY type
ORDER BY file_count DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Show sample e-notes
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 2: SAMPLE E-NOTES ━━━' AS test;

SELECT 
  id,
  title,
  type,
  session,
  term,
  week,
  class_id,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created
FROM uploads
WHERE type LIKE '%note%'
ORDER BY created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Test student query (simulated)
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 3: SIMULATE STUDENT QUERY ━━━' AS test;

-- Get a student's class
WITH student_info AS (
  SELECT 
    id,
    class_id,
    first_name || ' ' || last_name AS name
  FROM profiles
  WHERE role = 'student'
  LIMIT 1
)
SELECT 
  '📊 Testing query for student: ' || s.name AS info,
  'Class: ' || s.class_id AS class_info,
  COUNT(*) AS files_found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ SUCCESS - Student can see ' || COUNT(*) || ' files!'
    ELSE '❌ FAIL - No files found for this student'
  END AS result
FROM uploads u
CROSS JOIN student_info s
WHERE u.session = '2025/2026'
  AND u.term = 'First Term'
  AND u.type = 'enote'          -- ✅ NOW CORRECT!
  AND u.week = 1
  AND u.class_id = s.class_id;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Show exact files that should appear
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 4: FILES THAT SHOULD APPEAR ━━━' AS test;

WITH student_info AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
)
SELECT 
  u.title AS file_title,
  u.file_name AS filename,
  u.type,
  u.week AS week_num,
  u.session,
  u.term,
  '✅ Student should see this file' AS visibility
FROM uploads u
CROSS JOIN student_info s
WHERE u.session = '2025/2026'
  AND u.term = 'First Term'
  AND u.type = 'enote'
  AND u.week = 1
  AND u.class_id = s.class_id
ORDER BY u.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: Comprehensive check - all filters
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 5: COMPREHENSIVE CHECK ━━━' AS test;

WITH student_info AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
)
SELECT 
  u.id,
  u.title,
  CASE WHEN u.session = '2025/2026' THEN '✅' ELSE '❌ "' || u.session || '"' END AS session_match,
  CASE WHEN u.term = 'First Term' THEN '✅' ELSE '❌ "' || u.term || '"' END AS term_match,
  CASE WHEN u.type = 'enote' THEN '✅' ELSE '❌ "' || u.type || '"' END AS type_match,
  CASE WHEN u.week = 1 THEN '✅' ELSE '❌ week=' || COALESCE(u.week::text, 'NULL') END AS week_match,
  CASE WHEN u.class_id = s.class_id THEN '✅' ELSE '❌ "' || u.class_id || '" ≠ "' || s.class_id || '"' END AS class_match,
  CASE 
    WHEN u.session = '2025/2026' 
     AND u.term = 'First Term'
     AND u.type = 'enote'
     AND u.week = 1
     AND u.class_id = s.class_id 
    THEN '✅ ALL FILTERS PASS - WILL APPEAR'
    ELSE '❌ SOME FILTER FAILED - WON''T APPEAR'
  END AS final_result
FROM uploads u
CROSS JOIN student_info s
WHERE u.type LIKE '%note%'
ORDER BY u.created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 6: Count files per week
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 6: FILES PER WEEK ━━━' AS test;

WITH student_info AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
)
SELECT 
  u.week,
  COUNT(*) AS file_count,
  string_agg(u.title, ', ') AS file_titles
FROM uploads u
CROSS JOIN student_info s
WHERE u.session = '2025/2026'
  AND u.term = 'First Term'
  AND u.type = 'enote'
  AND u.class_id = s.class_id
GROUP BY u.week
ORDER BY u.week;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 7: Final verdict
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 7: FINAL VERDICT ━━━' AS test;

WITH student_info AS (
  SELECT class_id FROM profiles WHERE role = 'student' LIMIT 1
),
type_check AS (
  SELECT COUNT(*) as bad_types
  FROM uploads
  WHERE type LIKE '%note%' AND type != 'enote'
),
files_check AS (
  SELECT COUNT(*) as visible_files
  FROM uploads u
  CROSS JOIN student_info s
  WHERE u.session = '2025/2026'
    AND u.term = 'First Term'
    AND u.type = 'enote'
    AND u.week = 1
    AND u.class_id = s.class_id
)
SELECT 
  CASE 
    WHEN t.bad_types = 0 THEN '✅ TYPE FIX SUCCESSFUL'
    ELSE '❌ TYPE FIX NEEDED - ' || t.bad_types || ' files have wrong type'
  END AS type_status,
  CASE 
    WHEN f.visible_files > 0 THEN '✅ STUDENTS CAN SEE FILES - ' || f.visible_files || ' files visible'
    WHEN t.bad_types > 0 THEN '⚠️ NO FILES VISIBLE - Fix type mismatch first'
    ELSE '⚠️ NO FILES UPLOADED YET for Week 1'
  END AS visibility_status,
  CASE 
    WHEN t.bad_types = 0 AND f.visible_files > 0 THEN '🎉 ALL GOOD - System working!'
    WHEN t.bad_types > 0 THEN '🔧 ACTION NEEDED - Run type fix SQL'
    ELSE '📤 ACTION NEEDED - Upload some e-notes first'
  END AS recommendation
FROM type_check t
CROSS JOIN files_check f;

-- ═══════════════════════════════════════════════════════════════════════
-- QUICK FIX: If types are wrong
-- ═══════════════════════════════════════════════════════════════════════
-- Uncomment and run if Step 1 shows wrong types:
/*
UPDATE uploads 
SET type = 'enote' 
WHERE type IN ('e-note', 'e-notes', 'E-Notes', 'E-Note');

SELECT 'Type fix applied! Re-run this test to verify.' AS message;
*/
