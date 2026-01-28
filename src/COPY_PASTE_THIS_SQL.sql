-- ============================================
-- 🔥 COPY THIS ENTIRE FILE AND RUN IT NOW
-- ============================================

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

-- ============================================
-- THEN REFRESH THE STUDENT PAGE
-- ============================================
-- Sessions will appear! ✅
