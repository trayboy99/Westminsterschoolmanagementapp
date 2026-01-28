-- ============================================
-- 🚨 COPY AND RUN THIS ENTIRE QUERY NOW
-- ============================================
-- This will fix ALL students who can't see uploads

-- STEP 1: Show the problem
SELECT 
  '====== BEFORE FIX ======' as status,
  p.first_name || ' ' || p.last_name as student,
  p.class_id as student_class_id,
  c.name as class_name,
  (SELECT COUNT(*) FROM uploads WHERE class_id = p.class_id AND session = '2025/2026') as uploads_visible
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY student;

-- STEP 2: Apply the fix - Reassign students to JSS2 class with uploads
UPDATE profiles
SET class_id = (
  SELECT DISTINCT u.class_id
  FROM uploads u
  JOIN classes c ON c.id = u.class_id
  WHERE u.session = '2025/2026'
    AND c.name ILIKE '%JSS%2%'
  LIMIT 1
)
WHERE role = 'student'
  AND class_id IN (
    SELECT id FROM classes WHERE name ILIKE '%JSS%2%'
  );

-- STEP 3: Verify the fix worked
SELECT 
  '====== AFTER FIX ======' as status,
  p.first_name || ' ' || p.last_name as student,
  p.class_id as student_class_id,
  c.name as class_name,
  (SELECT COUNT(*) FROM uploads WHERE class_id = p.class_id AND session = '2025/2026') as uploads_visible
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY student;

-- Expected: uploads_visible should be > 0 for all students
