-- ============================================
-- QUICK FIX: Student Can't See JSS2 Uploads
-- ============================================

-- STEP 1: Find the student and their current class_id
-- Replace with actual student email
DO $$ 
DECLARE
  student_email TEXT := 'student@example.com'; -- ⚠️ CHANGE THIS
  student_class_id UUID;
  student_class_name TEXT;
  jss2_upload_class_id UUID;
BEGIN
  -- Get student's class
  SELECT class_id, (SELECT name FROM classes WHERE id = class_id)
  INTO student_class_id, student_class_name
  FROM profiles 
  WHERE email = student_email AND role = 'student';
  
  RAISE NOTICE 'Student email: %', student_email;
  RAISE NOTICE 'Student class_id: %', student_class_id;
  RAISE NOTICE 'Student class name: %', student_class_name;
  
  -- Get JSS2 uploads class_id
  SELECT DISTINCT class_id
  INTO jss2_upload_class_id
  FROM uploads
  WHERE session = '2025/2026'
    AND class_id IN (SELECT id FROM classes WHERE name LIKE '%JSS%2%')
  LIMIT 1;
  
  RAISE NOTICE 'JSS2 uploads class_id: %', jss2_upload_class_id;
  
  IF student_class_id = jss2_upload_class_id THEN
    RAISE NOTICE '✅ Class IDs MATCH - uploads should show!';
  ELSE
    RAISE NOTICE '❌ Class IDs DO NOT MATCH - this is the problem!';
    RAISE NOTICE 'Student needs to be reassigned OR uploads need to be updated';
  END IF;
END $$;

-- ============================================
-- OPTION 1: Show all classes and their upload counts
-- ============================================
SELECT 
  'ALL CLASSES' as info,
  c.id,
  c.name,
  c.section,
  c.level,
  COUNT(DISTINCT p.id) as student_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.session = '2025/2026') as uploads_count_2025
FROM classes c
LEFT JOIN profiles p ON p.class_id = c.id AND p.role = 'student'
LEFT JOIN uploads u ON u.class_id = c.id
GROUP BY c.id, c.name, c.section, c.level
ORDER BY c.name;

-- ============================================
-- OPTION 2: Find duplicate JSS2 classes
-- ============================================
SELECT 
  'DUPLICATE JSS2 CLASSES?' as info,
  id,
  name,
  section,
  level,
  created_at,
  (SELECT COUNT(*) FROM profiles WHERE class_id = classes.id AND role = 'student') as students,
  (SELECT COUNT(*) FROM uploads WHERE class_id = classes.id AND session = '2025/2026') as uploads
FROM classes
WHERE name LIKE '%JSS%2%' OR name LIKE '%Junior%2%'
ORDER BY created_at;

-- ============================================
-- FIX OPTION A: Reassign student to correct JSS2 class
-- ============================================
-- Run this if student is in wrong JSS2 class
/*
UPDATE profiles
SET class_id = (
  SELECT id FROM classes 
  WHERE name LIKE '%JSS%2%' 
  AND id IN (SELECT DISTINCT class_id FROM uploads WHERE session = '2025/2026')
  LIMIT 1
)
WHERE email = 'student@example.com'  -- ⚠️ CHANGE THIS
  AND role = 'student';
*/

-- ============================================
-- FIX OPTION B: Move uploads to student's class
-- ============================================  
-- Run this if uploads are in wrong class
/*
UPDATE uploads
SET class_id = (
  SELECT class_id FROM profiles 
  WHERE email = 'student@example.com'  -- ⚠️ CHANGE THIS
  AND role = 'student'
)
WHERE class_id IN (
  SELECT id FROM classes WHERE name LIKE '%JSS%2%'
)
AND session = '2025/2026';
*/

-- ============================================
-- VERIFICATION: Check if fix worked
-- ============================================
SELECT 
  'VERIFICATION' as check,
  p.email as student_email,
  p.class_id as student_class_id,
  c.name as class_name,
  (SELECT COUNT(*) 
   FROM uploads 
   WHERE class_id = p.class_id 
   AND session = '2025/2026') as uploads_visible
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.email = 'student@example.com'  -- ⚠️ CHANGE THIS
  AND p.role = 'student';
