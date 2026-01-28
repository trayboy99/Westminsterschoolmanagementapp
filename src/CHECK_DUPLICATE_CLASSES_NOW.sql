-- ================================================================
-- CHECK FOR DUPLICATE CLASS NAMES (Root Cause Analysis)
-- ================================================================
-- This checks if you have multiple classes with the same name
-- which would cause promotion confusion
-- ================================================================

-- Find all classes with their students
SELECT 
    c.id as class_id,
    c.name as class_name,
    c.level,
    s.name as section_name,
    COUNT(p.id) as student_count,
    STRING_AGG(p.first_name || ' ' || p.last_name, ', ') as students,
    c.created_at
FROM classes c
LEFT JOIN sections s ON s.id = c.section_id
LEFT JOIN profiles p ON p.class_id = c.id AND p.role = 'student'
WHERE c.name ILIKE '%jss2%'
GROUP BY c.id, c.name, c.level, s.name, c.created_at
ORDER BY c.created_at;

-- ================================================================

-- Check for duplicate class names
SELECT 
    name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 1 THEN '⚠️ DUPLICATE - This will cause promotion issues!'
        ELSE '✅ OK'
    END as status
FROM classes
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ================================================================

-- Show ALL classes with duplicate names (if any)
WITH duplicate_classes AS (
    SELECT name 
    FROM classes 
    GROUP BY name 
    HAVING COUNT(*) > 1
)
SELECT 
    c.id,
    c.name,
    c.level,
    s.name as section,
    COUNT(p.id) as student_count,
    c.created_at,
    '⚠️ DUPLICATE CLASS - Should merge or rename' as note
FROM classes c
LEFT JOIN sections s ON s.id = c.section_id
LEFT JOIN profiles p ON p.class_id = c.id AND p.role = 'student'
WHERE c.name IN (SELECT name FROM duplicate_classes)
GROUP BY c.id, c.name, c.level, s.name, c.created_at
ORDER BY c.name, c.created_at;

-- ================================================================
-- WHAT TO DO IF DUPLICATES FOUND:
-- ================================================================
-- Option 1: Rename duplicate classes
--   UPDATE classes SET name = 'jss2 A' WHERE id = 'old-id';
--   UPDATE classes SET name = 'jss2 B' WHERE id = 'other-id';
--
-- Option 2: Merge duplicate classes (move all students to one)
--   UPDATE profiles SET class_id = 'keep-this-id' 
--   WHERE class_id = 'delete-this-id';
--   DELETE FROM classes WHERE id = 'delete-this-id';
--
-- Option 3: Keep duplicates but use sections
--   UPDATE classes SET section_id = (section for A) WHERE id = 'id-1';
--   UPDATE classes SET section_id = (section for B) WHERE id = 'id-2';
-- ================================================================
