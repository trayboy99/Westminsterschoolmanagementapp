-- =====================================================
-- DIAGNOSTIC QUERIES - Run these to see what's wrong
-- =====================================================

-- Query 1: See ALL classes and their current level values
SELECT id, name, level, section_id, created_at 
FROM classes 
ORDER BY created_at DESC;

-- Query 2: See unique level values and how many of each
SELECT level, COUNT(*) as count 
FROM classes 
GROUP BY level
ORDER BY count DESC;

-- Query 3: Find classes that would violate the new constraint
SELECT id, name, level 
FROM classes 
WHERE level NOT IN ('Junior', 'Senior')
ORDER BY name;

-- Query 4: Check if the constraint currently exists
SELECT con.conname, pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'classes' 
AND con.conname LIKE '%level%';

-- =====================================================
-- AFTER RUNNING DIAGNOSTICS:
-- If you see classes with levels other than 'Junior'/'Senior',
-- you need to either:
-- 1. Update them manually, OR
-- 2. Use the FIX_LEVEL_ONE_COMMAND.sql script
-- =====================================================

-- Manual update examples (if needed):
-- UPDATE classes SET level = 'Junior' WHERE id = 'your-class-id-here';
-- UPDATE classes SET level = 'Senior' WHERE id = 'your-class-id-here';
