-- ============================================
-- DIAGNOSE: Student Class ID vs Upload Class ID Mismatch
-- ============================================

-- STEP 1: Find the student and their class_id
SELECT 
  'STUDENT INFO' as info,
  p.id as student_id,
  p.first_name || ' ' || p.last_name as student_name,
  p.email,
  p.class_id as student_class_id,
  c.name as class_name,
  c.section as class_section,
  c.level as class_level
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY p.created_at DESC
LIMIT 5;

-- STEP 2: Show all JSS2 classes and their IDs
SELECT 
  'JSS2 CLASSES' as info,
  id as class_id,
  name,
  section,
  level,
  (SELECT COUNT(*) FROM uploads WHERE class_id = classes.id) as upload_count,
  (SELECT COUNT(*) FROM uploads WHERE class_id = classes.id AND session = '2025/2026') as valid_uploads_2025_2026
FROM classes
WHERE name LIKE '%JSS%2%' OR name LIKE '%Junior%2%'
ORDER BY name;

-- STEP 3: Show uploads for JSS2 with valid sessions
SELECT 
  'UPLOADS FOR JSS2 (2025/2026)' as info,
  u.id as upload_id,
  u.session,
  u.term,
  u.type,
  c.name as class_name,
  c.section as class_section,
  c.id as class_id,
  s.name as subject_name
FROM uploads u
LEFT JOIN classes c ON c.id = u.class_id
LEFT JOIN subjects s ON s.id = u.subject_id
WHERE u.session = '2025/2026'
  AND c.name LIKE '%JSS%2%'
ORDER BY u.created_at DESC;

-- STEP 4: Check if student's class_id matches any upload class_ids
SELECT 
  'CLASS ID MATCH CHECK' as info,
  p.email as student_email,
  p.class_id as student_class_id,
  c.name as student_class_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM uploads 
      WHERE class_id = p.class_id 
      AND session = '2025/2026'
    ) THEN '✅ YES - Student has uploads'
    ELSE '❌ NO - Student has NO uploads'
  END as has_uploads,
  (SELECT COUNT(*) FROM uploads WHERE class_id = p.class_id AND session = '2025/2026') as upload_count
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student'
ORDER BY p.created_at DESC
LIMIT 5;

-- ============================================
-- EXPECTED DIAGNOSIS:
-- ============================================
/*
If student can't see uploads, you'll likely see:
- Student's class_id is different from the upload's class_id
- Even though both are "JSS2", they have different UUIDs

SOLUTION:
- Either reassign student to correct class
- Or update uploads to use student's class_id
- Or check if there are duplicate JSS2 classes
*/
