-- ================================================================
-- SIMPLE CHECK: Do you have duplicate or deleted JSS2 classes?
-- ================================================================
-- Run this first - it's quick and will tell us the root cause
-- ================================================================

-- Question 1: How many JSS2 classes exist RIGHT NOW?
SELECT 
    '=== CURRENT JSS2 CLASSES ===' as question,
    COUNT(*) as total_jss2_classes,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ NO JSS2 CLASS EXISTS!'
        WHEN COUNT(*) = 1 THEN '✅ One JSS2 class (good)'
        WHEN COUNT(*) > 1 THEN '⚠️ MULTIPLE JSS2 CLASSES (this is the problem!)'
    END as diagnosis
FROM classes
WHERE name ILIKE '%jss2%';

-- ================================================================

-- Question 2: Show me ALL JSS2 classes (if multiple exist)
SELECT 
    '=== LIST OF ALL JSS2 CLASSES ===' as question,
    id as class_id,
    name as class_name,
    level,
    section_id,
    created_at,
    COUNT(*) OVER () as total_count,
    ROW_NUMBER() OVER (ORDER BY created_at) as which_one,
    CASE 
        WHEN COUNT(*) OVER () > 1 THEN '⚠️ DUPLICATE - should only have ONE!'
        ELSE '✅ OK'
    END as status
FROM classes
WHERE name ILIKE '%jss2%'
ORDER BY created_at;

-- ================================================================

-- Question 3: Which JSS2 class does Brume's promotion point to?
WITH brume AS (
    SELECT id FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
),
latest_promotion AS (
    SELECT to_class_id FROM promotions
    WHERE student_id = (SELECT id FROM brume)
      AND is_reverted = false
    ORDER BY promoted_at DESC
    LIMIT 1
)
SELECT 
    '=== PROMOTION TARGET CLASS ===' as question,
    lp.to_class_id as promotion_points_to_this_class_id,
    c.name as class_name,
    CASE 
        WHEN c.id IS NULL THEN '❌ CLASS DELETED! (orphaned reference)'
        ELSE '✅ Class exists'
    END as class_exists_status,
    c.created_at as class_created_date
FROM latest_promotion lp
LEFT JOIN classes c ON c.id = lp.to_class_id;

-- ================================================================

-- Question 4: Which JSS2 class is Brume ACTUALLY in?
WITH brume AS (
    SELECT id, class_id FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
)
SELECT 
    '=== STUDENT CURRENT CLASS ===' as question,
    b.class_id as student_current_class_id,
    c.name as class_name,
    CASE 
        WHEN c.id IS NULL THEN '❌ CLASS DELETED! (student in non-existent class)'
        ELSE '✅ Class exists'
    END as class_exists_status,
    c.created_at as class_created_date
FROM brume b
LEFT JOIN classes c ON c.id = b.class_id;

-- ================================================================

-- Question 5: Do they match?
WITH brume AS (
    SELECT id, class_id FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
),
latest_promotion AS (
    SELECT to_class_id FROM promotions
    WHERE student_id = (SELECT id FROM brume)
      AND is_reverted = false
    ORDER BY promoted_at DESC
    LIMIT 1
)
SELECT 
    '=== THE VERDICT ===' as question,
    b.class_id as student_class_id,
    lp.to_class_id as promotion_class_id,
    CASE 
        WHEN b.class_id = lp.to_class_id THEN '✅ THEY MATCH - should work fine!'
        WHEN b.class_id != lp.to_class_id THEN '❌ MISMATCH - THIS IS WHY BANNER DOESNT SHOW!'
        ELSE '❓ Unknown'
    END as final_diagnosis,
    -- Show the exact IDs for debugging
    'Student in: ' || SUBSTRING(b.class_id::text, 1, 20) || '...' as student_id_short,
    'Promotion to: ' || SUBSTRING(lp.to_class_id::text, 1, 20) || '...' as promotion_id_short
FROM brume b
CROSS JOIN latest_promotion lp;

-- ================================================================

-- Question 6: Are there JSS2 class IDs in promotions that don't exist anymore?
SELECT 
    '=== ORPHANED JSS2 CLASS IDS (deleted classes) ===' as question,
    DISTINCT p.to_class_id as orphaned_class_id,
    'JSS2' as was_supposed_to_be,
    COUNT(*) as how_many_promotions_point_here,
    MIN(p.promoted_at) as first_used,
    MAX(p.promoted_at) as last_used,
    '❌ This class was DELETED!' as diagnosis
FROM promotions p
WHERE p.to_class_id IS NOT NULL
  AND p.to_class_id NOT IN (SELECT id FROM classes)
  AND EXISTS (
      -- Only show if this promotion involves JSS1/JSS2 (Brume's classes)
      SELECT 1 FROM classes 
      WHERE (id = p.from_class_id OR id = p.to_class_id)
        AND name ILIKE '%jss%'
  )
GROUP BY p.to_class_id;

-- ================================================================
-- INTERPRETATION GUIDE:
-- ================================================================
-- 
-- If Question 1 shows "MULTIPLE JSS2 CLASSES":
--   → You have duplicate classes! That's the root cause.
--   → Question 2 will show you which ones.
--   → Fix: Merge them or rename them.
--
-- If Question 3 shows "CLASS DELETED":
--   → The promotion points to a deleted JSS2 class!
--   → You probably deleted and recreated JSS2.
--   → Fix: Update promotion to point to current JSS2.
--
-- If Question 4 shows "CLASS DELETED":
--   → Student is in a non-existent class!
--   → Very bad state.
--   → Fix: Update student's class_id to valid JSS2.
--
-- If Question 5 shows "MISMATCH":
--   → This is THE problem!
--   → Student's class_id doesn't match promotion target.
--   → Fix: Run FIX_BRUME_CLASS_ID_MISMATCH_NOW.sql
--
-- If Question 6 shows results:
--   → You deleted JSS2 class(es) in the past.
--   → Old promotions still reference them.
--   → Fix: Clean up old promotions or restore deleted classes.
--
-- ================================================================
