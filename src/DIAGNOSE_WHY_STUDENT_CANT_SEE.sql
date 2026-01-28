-- ============================================
-- SIMPLE DIAGNOSTIC - Why Can't Students See Uploads?
-- ============================================

-- 1. Show Favour's info
SELECT 
  '1️⃣ FAVOUR INFO' as section,
  first_name || ' ' || last_name as name,
  class_id,
  (SELECT name FROM classes WHERE id = class_id) as class_name
FROM profiles
WHERE first_name = 'Favour' AND last_name = 'Blessing';

-- 2. Show ALL uploads with session 2025/2026
SELECT 
  '2️⃣ ALL UPLOADS (2025/2026)' as section,
  u.class_id as upload_class_id,
  c.name as class_name,
  COUNT(*) as upload_count
FROM uploads u
LEFT JOIN classes c ON c.id = u.class_id
WHERE u.session = '2025/2026'
GROUP BY u.class_id, c.name;

-- 3. Check if Favour's class_id matches any upload class_id
SELECT 
  '3️⃣ DOES FAVOUR SEE UPLOADS?' as section,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ YES - ' || COUNT(*) || ' uploads visible'
    ELSE '❌ NO - Class ID mismatch!'
  END as result
FROM uploads
WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec'
  AND session = '2025/2026';

-- 4. Show which class has the uploads
SELECT 
  '4️⃣ WHICH CLASS HAS UPLOADS?' as section,
  c.id as class_id,
  c.name as class_name,
  COUNT(u.id) as upload_count
FROM classes c
JOIN uploads u ON u.class_id = c.id
WHERE u.session = '2025/2026'
GROUP BY c.id, c.name;
