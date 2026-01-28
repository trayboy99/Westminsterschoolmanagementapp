-- =====================================================
-- COPY, PASTE, AND RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- This will show you what needs to be fixed
-- =====================================================

-- STEP 1: Show all teachers and their IDs
SELECT 
  '👨‍🏫 TEACHERS (copy the ID of the teacher who needs attendance access)' as info,
  NULL as "#",
  NULL as id,
  NULL as name,
  NULL as email,
  NULL as note
UNION ALL
SELECT 
  NULL,
  ROW_NUMBER() OVER (ORDER BY first_name, last_name)::text,
  id::text,
  (first_name || ' ' || last_name),
  email,
  'Role: ' || role
FROM profiles
WHERE role = 'teacher'
ORDER BY info NULLS FIRST;

-- =====================================================

-- STEP 2: Show all classes and their IDs
SELECT 
  '📚 CLASSES (copy the ID of the class this teacher should teach)' as info,
  NULL as "#",
  NULL as id,
  NULL as name,
  NULL as level,
  NULL as current_teacher
UNION ALL
SELECT 
  NULL,
  ROW_NUMBER() OVER (ORDER BY level, name)::text,
  c.id::text,
  c.name,
  c.level,
  COALESCE(p.first_name || ' ' || p.last_name, '❌ No teacher assigned')
FROM classes c
LEFT JOIN profiles p ON c.class_teacher_id = p.id
ORDER BY info NULLS FIRST;

-- =====================================================

-- STEP 3: Show current status
SELECT 
  '🔍 CURRENT STATUS' as info,
  NULL as problem,
  NULL as details
UNION ALL
SELECT 
  NULL,
  'Teachers without class assignment',
  STRING_AGG(first_name || ' ' || last_name, ', ')
FROM profiles
WHERE role = 'teacher'
  AND NOT EXISTS (SELECT 1 FROM classes WHERE class_teacher_id = profiles.id)
UNION ALL
SELECT 
  NULL,
  'Classes without teacher assignment',
  STRING_AGG(name, ', ')
FROM classes
WHERE class_teacher_id IS NULL;

-- =====================================================
-- STEP 4: NOW FIX IT!
-- =====================================================
-- Copy the template below, replace the IDs, then run it:

/*

-- COPY THIS TEMPLATE:
UPDATE classes 
SET class_teacher_id = 'PASTE-TEACHER-ID-FROM-STEP-1-HERE'
WHERE id = 'PASTE-CLASS-ID-FROM-STEP-2-HERE';

-- EXAMPLE (replace with your actual IDs):
-- UPDATE classes 
-- SET class_teacher_id = '123e4567-e89b-12d3-a456-426614174000'
-- WHERE id = '987fcdeb-51a2-43e7-9876-543210fedcba';

*/

-- =====================================================
-- STEP 5: VERIFY IT WORKED
-- =====================================================
-- After running the UPDATE, run this to verify:

SELECT 
  '✅ VERIFICATION' as info,
  c.name as class_name,
  c.level,
  p.first_name || ' ' || p.last_name as assigned_teacher,
  p.email,
  CASE 
    WHEN c.class_teacher_id IS NOT NULL AND p.id IS NOT NULL AND p.role = 'teacher' 
    THEN '✅ CORRECTLY ASSIGNED'
    ELSE '❌ PROBLEM FOUND'
  END as status
FROM classes c
LEFT JOIN profiles p ON c.class_teacher_id = p.id
ORDER BY c.level, c.name;

-- =====================================================
-- DONE! 
-- =====================================================
-- After running the UPDATE:
-- 1. Teacher should log out
-- 2. Teacher should log back in
-- 3. Click Attendance menu
-- 4. Should now see students! 🎉
-- =====================================================
