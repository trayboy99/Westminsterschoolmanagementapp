-- ============================================
-- UNIVERSAL FIX: All Students Class Mismatch
-- ============================================
-- This fixes the issue for ALL students who can't see uploads
-- because their class_id doesn't match upload class_ids

-- DIAGNOSTIC: Show the problem
SELECT 
  '🔍 STUDENTS WITH NO UPLOADS' as section,
  p.id,
  p.first_name || ' ' || p.last_name as student_name,
  p.email,
  p.class_id as current_class_id,
  c.name as current_class_name,
  s.name as current_section,
  (SELECT COUNT(*) 
   FROM uploads 
   WHERE class_id = p.class_id 
   AND session = '2025/2026') as uploads_available
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY student_name;

-- ============================================
-- OPTION 1: Reassign ALL JSS2 students to JSS2 class with uploads
-- ============================================
-- Run this if you want all JSS2 students to use the same class
/*
UPDATE profiles
SET class_id = (
  -- Find the JSS2 class that has the most uploads
  SELECT c.id
  FROM classes c
  LEFT JOIN uploads u ON u.class_id = c.id AND u.session = '2025/2026'
  WHERE c.name LIKE '%JSS%2%' OR c.name LIKE '%Junior%2%'
  GROUP BY c.id
  ORDER BY COUNT(u.id) DESC
  LIMIT 1
)
WHERE role = 'student'
  AND class_id IN (
    -- All JSS2 classes
    SELECT id FROM classes 
    WHERE name LIKE '%JSS%2%' OR name LIKE '%Junior%2%'
  );
*/

-- ============================================
-- OPTION 2: Move uploads TO students' current classes
-- ============================================
-- Run this if you want to keep students in their current classes
-- and move the uploads to match
/*
-- For each class, copy uploads to it if students exist
DO $$
DECLARE
  student_class RECORD;
  upload_source_class UUID;
BEGIN
  -- Find JSS2 class with uploads
  SELECT id INTO upload_source_class
  FROM classes
  WHERE id IN (
    SELECT DISTINCT class_id 
    FROM uploads 
    WHERE session = '2025/2026'
  )
  AND (name LIKE '%JSS%2%' OR name LIKE '%Junior%2%')
  LIMIT 1;
  
  -- For each JSS2 class with students but no uploads
  FOR student_class IN 
    SELECT DISTINCT p.class_id, c.name
    FROM profiles p
    JOIN classes c ON c.id = p.class_id
    WHERE p.role = 'student'
      AND (c.name LIKE '%JSS%2%' OR c.name LIKE '%Junior%2%')
      AND NOT EXISTS (
        SELECT 1 FROM uploads 
        WHERE class_id = p.class_id 
        AND session = '2025/2026'
      )
  LOOP
    -- Update uploads to this class
    UPDATE uploads
    SET class_id = student_class.class_id
    WHERE class_id = upload_source_class
      AND session = '2025/2026';
      
    RAISE NOTICE 'Moved uploads to class: %', student_class.name;
  END LOOP;
END $$;
*/

-- ============================================
-- OPTION 3: SIMPLE FIX - Reassign specific students
-- ============================================
-- Most common: Just reassign the students who can't see uploads

-- Find the JSS2 class with uploads
WITH jss2_with_uploads AS (
  SELECT c.id as class_id, c.name, c.section
  FROM classes c
  JOIN uploads u ON u.class_id = c.id
  WHERE u.session = '2025/2026'
    AND (c.name LIKE '%JSS%2%' OR c.name LIKE '%Junior%2%')
  GROUP BY c.id, c.name, c.section
  ORDER BY COUNT(u.id) DESC
  LIMIT 1
)
-- Show what will change
SELECT 
  'Students to reassign:' as action,
  p.first_name || ' ' || p.last_name as student,
  p.email,
  'Current class: ' || COALESCE(c1.name, 'None') as from_class,
  'New class: ' || c2.name || ' ' || COALESCE(c2.section, '') as to_class
FROM profiles p
LEFT JOIN classes c1 ON c1.id = p.class_id
CROSS JOIN jss2_with_uploads c2
WHERE p.role = 'student'
  AND p.class_id IN (
    SELECT id FROM classes 
    WHERE name LIKE '%JSS%2%' OR name LIKE '%Junior%2%'
  )
  AND p.class_id != c2.class_id;

-- Uncomment to apply the fix:
/*
UPDATE profiles
SET class_id = (
  SELECT c.id
  FROM classes c
  JOIN uploads u ON u.class_id = c.id
  WHERE u.session = '2025/2026'
    AND (c.name LIKE '%JSS%2%' OR c.name LIKE '%Junior%2%')
  GROUP BY c.id
  ORDER BY COUNT(u.id) DESC
  LIMIT 1
)
WHERE role = 'student'
  AND class_id IN (
    SELECT id FROM classes 
    WHERE name LIKE '%JSS%2%' OR name LIKE '%Junior%2%'
  );
*/

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  '✅ AFTER FIX - Students with uploads' as section,
  p.first_name || ' ' || p.last_name as student_name,
  c.name as class_name,
  c.section,
  (SELECT COUNT(*) 
   FROM uploads 
   WHERE class_id = p.class_id 
   AND session = '2025/2026') as uploads_visible
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY student_name;
