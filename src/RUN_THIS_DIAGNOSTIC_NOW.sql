-- ============================================
-- 🚨 RUN THIS NOW - Find Why Student Can't See Sessions
-- ============================================
-- Copy all of this and paste into Supabase SQL Editor

-- ============================================
-- ⚠️  CONFIGURE THESE FIRST:
-- ============================================
-- Replace with the actual student's email:
\set student_email '''student@example.com'''

-- ============================================
-- DIAGNOSTIC QUERY (Run this first)
-- ============================================
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as divider,
  '🔍 DIAGNOSTIC RESULTS' as title
UNION ALL
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '';

-- Student Info
SELECT 
  '1️⃣ STUDENT INFO' as section,
  p.email || ' (Class ID: ' || COALESCE(p.class_id::text, 'NULL') || ')' as details
FROM profiles p
WHERE p.email = :student_email AND p.role = 'student'
UNION ALL
SELECT 
  '   Class Name',
  COALESCE(c.name, 'NO CLASS ASSIGNED') || 
  COALESCE(' ' || c.section, '') ||
  ' (' || COALESCE(c.level, 'no level') || ')'
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.email = :student_email AND p.role = 'student';

-- Uploads for Student's Class  
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''
UNION ALL
SELECT 
  '2️⃣ UPLOADS FOR STUDENT''S CLASS' as section,
  COUNT(*)::text || ' uploads found' as details
FROM uploads u
WHERE u.class_id = (SELECT class_id FROM profiles WHERE email = :student_email AND role = 'student')
UNION ALL
SELECT 
  '   With valid sessions (YYYY/YYYY)',
  COUNT(*)::text || ' uploads'
FROM uploads u
WHERE u.class_id = (SELECT class_id FROM profiles WHERE email = :student_email AND role = 'student')
  AND u.session ~ '^[0-9]{4}/[0-9]{4}$'
UNION ALL
SELECT 
  '   Session: 2025/2026',
  COUNT(*)::text || ' uploads'
FROM uploads u
WHERE u.class_id = (SELECT class_id FROM profiles WHERE email = :student_email AND role = 'student')
  AND u.session = '2025/2026';

-- All JSS2 Classes
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''
UNION ALL
SELECT '3️⃣ ALL JSS2 CLASSES' as section, 'with upload counts' as details
UNION ALL
SELECT 
  '   ' || c.name || COALESCE(' ' || c.section, ''),
  'ID: ' || LEFT(c.id::text, 8) || '... | Uploads: ' || COUNT(u.id)::text
FROM classes c
LEFT JOIN uploads u ON u.class_id = c.id AND u.session = '2025/2026'
WHERE c.name LIKE '%JSS%2%' OR c.name LIKE '%Junior%2%'
GROUP BY c.id, c.name, c.section;

-- Diagnosis
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''
UNION ALL
SELECT '4️⃣ DIAGNOSIS' as section, '' as details
UNION ALL
SELECT 
  '   Problem',
  CASE 
    WHEN p.class_id IS NULL THEN 
      '❌ Student has NO class assigned'
    WHEN NOT EXISTS (
      SELECT 1 FROM uploads 
      WHERE class_id = p.class_id 
      AND session = '2025/2026'
    ) THEN 
      '❌ Student''s class has NO uploads with session 2025/2026'
    ELSE 
      '✅ Student''s class HAS uploads - should be visible!'
  END
FROM profiles p
WHERE p.email = :student_email AND p.role = 'student'
UNION ALL
SELECT 
  '   Solution',
  CASE 
    WHEN p.class_id IS NULL THEN 
      '→ Assign student to a class (Students Manager)'
    WHEN NOT EXISTS (
      SELECT 1 FROM uploads 
      WHERE class_id = p.class_id 
      AND session = '2025/2026'
    ) THEN 
      '→ Either reassign student OR move uploads to student''s class'
    ELSE 
      '→ Check browser console - may be corrupted sessions'
  END
FROM profiles p
WHERE p.email = :student_email AND p.role = 'student';

SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '';

-- ============================================
-- RECOMMENDED FIX (uncomment and run if needed)
-- ============================================

-- FIX A: Student has NO class - assign to JSS2 with uploads
/*
UPDATE profiles
SET class_id = (
  SELECT c.id
  FROM classes c
  JOIN uploads u ON u.class_id = c.id
  WHERE c.name LIKE '%JSS%2%'
    AND u.session = '2025/2026'
  GROUP BY c.id
  ORDER BY COUNT(u.id) DESC
  LIMIT 1
)
WHERE email = :student_email
  AND role = 'student'
  AND class_id IS NULL;
*/

-- FIX B: Student in JSS2 but wrong section - reassign to section with uploads
/*
UPDATE profiles
SET class_id = (
  SELECT c.id
  FROM classes c
  JOIN uploads u ON u.class_id = c.id
  WHERE c.name LIKE '%JSS%2%'
    AND u.session = '2025/2026'
  GROUP BY c.id
  ORDER BY COUNT(u.id) DESC
  LIMIT 1
)
WHERE email = :student_email
  AND role = 'student';
*/

-- FIX C: Move JSS2 uploads to student's current class
/*
UPDATE uploads
SET class_id = (
  SELECT class_id FROM profiles 
  WHERE email = :student_email 
  AND role = 'student'
)
WHERE class_id IN (
  SELECT id FROM classes WHERE name LIKE '%JSS%2%'
)
AND session = '2025/2026';
*/
