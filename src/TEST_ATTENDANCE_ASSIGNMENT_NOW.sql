-- =====================================================
-- TEST ATTENDANCE CLASS TEACHER ASSIGNMENT NOW
-- =====================================================
-- Run this script to quickly diagnose and verify 
-- class teacher assignments for attendance
-- =====================================================

-- QUICK DIAGNOSTIC (Run this first)
-- =====================================================

SELECT '📋 STEP 1: LIST ALL TEACHERS' as step;

SELECT 
  ROW_NUMBER() OVER (ORDER BY first_name, last_name) as "#",
  id,
  first_name || ' ' || last_name as full_name,
  email,
  role,
  CASE 
    WHEN role != 'teacher' THEN '❌ NOT A TEACHER'
    ELSE '✅'
  END as status
FROM profiles
WHERE role = 'teacher'
ORDER BY first_name, last_name;

-- =====================================================

SELECT '📚 STEP 2: LIST ALL CLASSES' as step;

SELECT 
  ROW_NUMBER() OVER (ORDER BY level, name) as "#",
  id,
  name as class_name,
  level,
  class_teacher_id,
  CASE 
    WHEN class_teacher_id IS NULL THEN '❌ NO TEACHER ASSIGNED'
    ELSE '✅ HAS TEACHER'
  END as status
FROM classes
ORDER BY level, name;

-- =====================================================

SELECT '🔗 STEP 3: SHOW ASSIGNMENTS' as step;

SELECT 
  ROW_NUMBER() OVER (ORDER BY c.level, c.name) as "#",
  c.id as class_id,
  c.name as class_name,
  c.level,
  c.class_teacher_id,
  COALESCE(p.first_name || ' ' || p.last_name, '❌ NO TEACHER') as teacher_name,
  COALESCE(p.email, '❌ NO EMAIL') as teacher_email,
  CASE 
    WHEN c.class_teacher_id IS NULL THEN '❌ NO TEACHER ASSIGNED'
    WHEN p.id IS NULL THEN '❌ INVALID TEACHER ID (ID doesn''t exist)'
    WHEN p.role != 'teacher' THEN '❌ WRONG ROLE (not a teacher)'
    ELSE '✅ CORRECTLY ASSIGNED'
  END as status
FROM classes c
LEFT JOIN profiles p ON c.class_teacher_id = p.id
ORDER BY c.level, c.name;

-- =====================================================

SELECT '⚠️ STEP 4: FIND PROBLEMS' as step;

-- Find teachers without class assignments
SELECT 
  '❌ TEACHERS WITHOUT CLASSES' as problem,
  p.id as teacher_id,
  p.first_name || ' ' || p.last_name as teacher_name,
  p.email,
  'This teacher cannot mark attendance' as note
FROM profiles p
WHERE p.role = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM classes c WHERE c.class_teacher_id = p.id
  )
ORDER BY p.first_name, p.last_name;

-- =====================================================

-- Find classes without teachers
SELECT 
  '❌ CLASSES WITHOUT TEACHERS' as problem,
  c.id as class_id,
  c.name as class_name,
  c.level,
  'No one can mark attendance for this class' as note
FROM classes c
WHERE c.class_teacher_id IS NULL
ORDER BY c.level, c.name;

-- =====================================================

SELECT '📊 STEP 5: SUMMARY STATISTICS' as step;

SELECT 
  'TEACHERS' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM classes WHERE class_teacher_id = p.id
  )) as assigned,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM classes WHERE class_teacher_id = p.id
  )) as unassigned
FROM profiles p
WHERE role = 'teacher'

UNION ALL

SELECT 
  'CLASSES' as category,
  COUNT(*) as total,
  COUNT(class_teacher_id) as assigned,
  COUNT(*) FILTER (WHERE class_teacher_id IS NULL) as unassigned
FROM classes;

-- =====================================================

SELECT '✅ STEP 6: VERIFICATION CHECK' as step;

-- This should return ZERO rows if everything is correct
SELECT 
  '⚠️ ISSUES FOUND' as alert,
  issue_type,
  details
FROM (
  -- Classes with NULL teacher
  SELECT 
    'Class without teacher' as issue_type,
    'Class: ' || name || ' (Level: ' || level || ')' as details
  FROM classes
  WHERE class_teacher_id IS NULL
  
  UNION ALL
  
  -- Classes with invalid teacher ID
  SELECT 
    'Class has invalid teacher ID' as issue_type,
    'Class: ' || c.name || ' has teacher ID ' || c.class_teacher_id || ' which doesn''t exist' as details
  FROM classes c
  WHERE c.class_teacher_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = c.class_teacher_id)
  
  UNION ALL
  
  -- Classes with non-teacher assigned
  SELECT 
    'Class teacher is not a teacher' as issue_type,
    'Class: ' || c.name || ' has ' || p.first_name || ' ' || p.last_name || ' (role: ' || p.role || ')' as details
  FROM classes c
  JOIN profiles p ON c.class_teacher_id = p.id
  WHERE p.role != 'teacher'
  
  UNION ALL
  
  -- Teachers without assignments
  SELECT 
    'Teacher without class assignment' as issue_type,
    'Teacher: ' || p.first_name || ' ' || p.last_name || ' (' || p.email || ')' as details
  FROM profiles p
  WHERE p.role = 'teacher'
    AND NOT EXISTS (SELECT 1 FROM classes WHERE class_teacher_id = p.id)
) issues;

-- =====================================================

SELECT '🎯 STEP 7: READY-TO-USE FIX TEMPLATE' as step;

-- Copy these templates and fill in the IDs from Step 1 and Step 2 above

SELECT 
  '-- Copy and customize these UPDATE statements:' as instruction
UNION ALL
SELECT '-- UPDATE classes SET class_teacher_id = ''PASTE-TEACHER-ID-HERE'' WHERE id = ''PASTE-CLASS-ID-HERE'';'
UNION ALL
SELECT '-- Example:'
UNION ALL
SELECT '-- UPDATE classes SET class_teacher_id = ''' || p.id || ''' WHERE id = ''PASTE-CLASS-ID-HERE''; -- Assign ' || p.first_name || ' ' || p.last_name
FROM profiles p
WHERE role = 'teacher'
ORDER BY p.first_name, p.last_name
LIMIT 5;

-- =====================================================
-- FINAL NOTE
-- =====================================================

SELECT 
  '📝 INSTRUCTIONS' as note,
  'If you see issues in STEP 6, use the template from STEP 7 to fix them.' as instructions
UNION ALL
SELECT 
  '⚡ QUICK FIX',
  'Copy teacher ID from STEP 1, copy class ID from STEP 2, then run:'
UNION ALL
SELECT 
  '📌 COMMAND',
  'UPDATE classes SET class_teacher_id = ''teacher-id'' WHERE id = ''class-id'';'
UNION ALL
SELECT 
  '🔄 AFTER FIX',
  'Run this entire script again to verify. STEP 6 should show ZERO rows.';
