-- ============================================
-- URGENT: Find Class ID Mismatch
-- ============================================

-- 1. Show Favour Blessing's class_id
SELECT 
  '👤 STUDENT INFO' as section,
  first_name || ' ' || last_name as name,
  email,
  class_id as student_class_id
FROM profiles
WHERE first_name = 'Favour' AND last_name = 'Blessing' AND role = 'student';

-- 2. Show what class that ID belongs to
SELECT 
  '🏫 STUDENT''S CLASS' as section,
  c.id as class_id,
  c.name as class_name,
  c.section,
  c.level
FROM classes c
WHERE c.id = '06bdb592-0ebe-426d-943f-d0f9acab38ec';

-- 3. Show ALL uploads with session 2025/2026 and their class_ids
SELECT 
  '📁 UPLOADS (2025/2026)' as section,
  u.id as upload_id,
  u.session,
  u.term,
  u.type,
  u.class_id as upload_class_id,
  c.name as class_name,
  c.section,
  c.level,
  CASE 
    WHEN u.class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec' THEN '✅ MATCHES Favour'
    ELSE '❌ DIFFERENT CLASS'
  END as match_status
FROM uploads u
LEFT JOIN classes c ON c.id = u.class_id
WHERE u.session = '2025/2026'
ORDER BY u.created_at DESC;

-- 4. Count uploads by class
SELECT 
  '📊 UPLOAD COUNTS BY CLASS' as section,
  c.name as class_name,
  c.section,
  c.id as class_id,
  COUNT(u.id) as upload_count,
  CASE 
    WHEN c.id = '06bdb592-0ebe-426d-943f-d0f9acab38ec' THEN '← Favour is in THIS class'
    ELSE ''
  END as note
FROM classes c
LEFT JOIN uploads u ON u.class_id = c.id AND u.session = '2025/2026'
WHERE c.name LIKE '%JSS%' OR c.name LIKE '%Junior%'
GROUP BY c.id, c.name, c.section
ORDER BY upload_count DESC;

-- ============================================
-- DIAGNOSIS:
-- ============================================
-- If "MATCHES Favour" shows ❌ for all uploads,
-- then Favour's class_id doesn't match any upload class_ids
-- 
-- SOLUTION: Either:
-- A) Reassign Favour to the correct class (class with uploads)
-- B) Update uploads to use Favour's class_id
-- C) Create uploads for Favour's class
-- ============================================
