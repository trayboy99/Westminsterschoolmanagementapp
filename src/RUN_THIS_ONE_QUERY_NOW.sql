-- ============================================
-- 🚨 RUN THIS ONE QUERY NOW - INSTANT FIX
-- ============================================
-- This single query fixes ALL JSS2 students

-- Reassign ALL JSS2 students to the JSS2 class that has uploads
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

-- ============================================
-- Then refresh the student page - uploads will appear!
-- ============================================
