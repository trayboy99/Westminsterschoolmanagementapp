-- =====================================================
-- FIX YOUR 3 UNASSIGNED CLASSES
-- =====================================================
-- Based on your diagnostic screenshot, you need to assign
-- teachers to: jss2, jss3, and SS1
-- =====================================================

-- STEP 1: See all available teachers
-- =====================================================
SELECT 
  '📋 AVAILABLE TEACHERS' as info,
  id,
  first_name || ' ' || last_name as name,
  email,
  CASE 
    WHEN EXISTS (SELECT 1 FROM classes WHERE class_teacher_id = profiles.id) 
    THEN '✅ Already assigned to: ' || (SELECT name FROM classes WHERE class_teacher_id = profiles.id)
    ELSE '🆓 Available for assignment'
  END as status
FROM profiles
WHERE role = 'teacher'
ORDER BY first_name, last_name;

-- =====================================================
-- STEP 2: See the classes that need teachers
-- =====================================================
SELECT 
  '❌ CLASSES NEEDING TEACHERS' as info,
  id,
  name as class_name,
  level,
  '← Copy this class ID' as note
FROM classes
WHERE class_teacher_id IS NULL
ORDER BY level, name;

-- =====================================================
-- STEP 3: ASSIGN TEACHERS TO CLASSES
-- =====================================================
-- Copy the teacher IDs from STEP 1 and class IDs from STEP 2
-- Then fill in and run these UPDATE statements:

/*

-- For jss2 (Junior class 2)
UPDATE classes 
SET class_teacher_id = 'PASTE-TEACHER-ID-HERE'
WHERE name = 'jss2';

-- For jss3 (Junior class 3)
UPDATE classes 
SET class_teacher_id = 'PASTE-TEACHER-ID-HERE'
WHERE name = 'jss3';

-- For SS1 (Senior class 1 - uppercase)
UPDATE classes 
SET class_teacher_id = 'PASTE-TEACHER-ID-HERE'
WHERE name = 'SS1';

*/

-- =====================================================
-- STEP 4: VERIFY ALL ASSIGNMENTS
-- =====================================================
-- After running the UPDATEs, run this to confirm:

SELECT 
  '✅ FINAL VERIFICATION' as info,
  c.name as class_name,
  c.level,
  COALESCE(p.first_name || ' ' || p.last_name, '❌ NO TEACHER') as assigned_teacher,
  COALESCE(p.email, '❌ NO EMAIL') as teacher_email,
  CASE 
    WHEN c.class_teacher_id IS NULL THEN '❌ STILL NEEDS TEACHER'
    WHEN p.id IS NULL THEN '❌ INVALID TEACHER ID'
    WHEN p.role != 'teacher' THEN '❌ NOT A TEACHER'
    ELSE '✅ CORRECTLY ASSIGNED'
  END as status
FROM classes c
LEFT JOIN profiles p ON c.class_teacher_id = p.id
ORDER BY c.level, c.name;

-- =====================================================
-- NOTES:
-- =====================================================
-- You currently have:
-- ✅ jss1 → Ahmed Hassan (teacher@school.edu)
-- ✅ ss1 → Johnson Bello (christianbello123@gmail.com)
-- 
-- You need to assign 3 more teachers to:
-- ❌ jss2
-- ❌ jss3
-- ❌ SS1
--
-- After assignment, each teacher must:
-- 1. Log out
-- 2. Log back in
-- 3. Click Attendance
-- 4. Should see their class and students!
-- =====================================================
