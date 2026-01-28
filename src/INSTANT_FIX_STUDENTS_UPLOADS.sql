-- ============================================
-- 🔥 INSTANT FIX - Students Can't See Uploads
-- ============================================
-- Copy this entire file and run in Supabase SQL Editor

-- ============================================
-- DIAGNOSTIC: What's the problem?
-- ============================================

-- Show which class has the 2025/2026 uploads
SELECT 
  '📁 UPLOADS ARE IN THIS CLASS:' as info,
  c.id as class_id,
  c.name as class_name,
  COUNT(u.id) as upload_count
FROM uploads u
JOIN classes c ON c.id = u.class_id
WHERE u.session = '2025/2026'
GROUP BY c.id, c.name;

-- Show where students are currently assigned
SELECT 
  '👤 STUDENTS ARE IN THESE CLASSES:' as info,
  c.id as class_id,
  c.name as class_name,
  COUNT(p.id) as student_count
FROM profiles p
JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
GROUP BY c.id, c.name;

-- ============================================
-- THE FIX: Move all JSS2 students to the class with uploads
-- ============================================

UPDATE profiles
SET class_id = (
  -- Find the JSS2 class that has uploads
  SELECT DISTINCT u.class_id
  FROM uploads u
  JOIN classes c ON c.id = u.class_id
  WHERE u.session = '2025/2026'
    AND c.name ILIKE '%JSS%2%'
  ORDER BY u.created_at DESC
  LIMIT 1
)
WHERE role = 'student'
  AND class_id IN (
    -- All JSS2 classes (current student classes)
    SELECT id FROM classes 
    WHERE name ILIKE '%JSS%2%'
  );

-- ============================================
-- VERIFICATION: Did it work?
-- ============================================

SELECT 
  '✅ VERIFICATION - Can students see uploads now?' as check,
  p.first_name || ' ' || p.last_name as student,
  c.name as class_name,
  (SELECT COUNT(*) 
   FROM uploads 
   WHERE class_id = p.class_id 
   AND session = '2025/2026') as uploads_they_can_see
FROM profiles p
JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY student;

-- If uploads_they_can_see > 0, then SUCCESS! 🎉
-- Students should now see sessions when they refresh the page
