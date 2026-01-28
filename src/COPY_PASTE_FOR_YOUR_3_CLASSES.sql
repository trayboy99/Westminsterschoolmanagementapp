-- =====================================================
-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- =====================================================
-- This will fix your 3 unassigned classes: jss2, jss3, SS1
-- =====================================================

-- FIRST: Run this to see available teachers
-- =====================================================
SELECT 
  '🆓 AVAILABLE TEACHERS (not yet assigned to any class)' as section;

SELECT 
  ROW_NUMBER() OVER (ORDER BY first_name) as "#",
  id,
  first_name || ' ' || last_name as teacher_name,
  email
FROM profiles
WHERE role = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM classes WHERE class_teacher_id = profiles.id
  )
ORDER BY first_name, last_name;

-- =====================================================

SELECT 
  '📚 YOUR 3 CLASSES THAT NEED TEACHERS' as section;

SELECT 
  ROW_NUMBER() OVER (ORDER BY name) as "#",
  id,
  name as class_name,
  level
FROM classes
WHERE name IN ('jss2', 'jss3', 'SS1')
ORDER BY name;

-- =====================================================
-- COPY THE IDs FROM ABOVE, PASTE BELOW, THEN RUN:
-- =====================================================

/*

-- Template (remove the /* and */ to use):

-- Assign first available teacher to jss2
UPDATE classes 
SET class_teacher_id = 'PASTE-TEACHER-ID-1-HERE'
WHERE name = 'jss2';

-- Assign second available teacher to jss3
UPDATE classes 
SET class_teacher_id = 'PASTE-TEACHER-ID-2-HERE'
WHERE name = 'jss3';

-- Assign third available teacher to SS1
UPDATE classes 
SET class_teacher_id = 'PASTE-TEACHER-ID-3-HERE'
WHERE name = 'SS1';

*/

-- =====================================================
-- AFTER RUNNING THE UPDATES, VERIFY WITH THIS:
-- =====================================================

SELECT 
  '✅ VERIFICATION - ALL 5 CLASSES' as section;

SELECT 
  c.name as class_name,
  c.level,
  COALESCE(p.first_name || ' ' || p.last_name, '❌ NO TEACHER') as teacher,
  COALESCE(p.email, '❌ NO EMAIL') as email,
  CASE 
    WHEN c.class_teacher_id IS NOT NULL AND p.id IS NOT NULL 
    THEN '✅ ASSIGNED'
    ELSE '❌ NEEDS FIX'
  END as status
FROM classes c
LEFT JOIN profiles p ON c.class_teacher_id = p.id
ORDER BY c.level, c.name;

-- =====================================================
-- EXPECTED RESULT AFTER FIX:
-- =====================================================
-- jss1 → Ahmed Hassan → teacher@school.edu → ✅ ASSIGNED
-- jss2 → (teacher name) → (email) → ✅ ASSIGNED
-- jss3 → (teacher name) → (email) → ✅ ASSIGNED
-- ss1 → Johnson Bello → christianbello123@gmail.com → ✅ ASSIGNED
-- SS1 → (teacher name) → (email) → ✅ ASSIGNED
--
-- All 5 should show ✅ ASSIGNED
-- =====================================================

-- =====================================================
-- FINAL STEP: Teachers must log out and log back in!
-- =====================================================
