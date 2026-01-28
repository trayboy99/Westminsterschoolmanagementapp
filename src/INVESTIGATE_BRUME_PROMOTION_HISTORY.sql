-- ================================================================
-- INVESTIGATE BRUME'S COMPLETE PROMOTION HISTORY
-- ================================================================
-- This checks your exact theory: Multiple promote/revert cycles
-- causing class_id mismatch
-- ================================================================

-- Step 1: Get Brume's student ID
WITH brume AS (
    SELECT id, first_name, last_name, class_id, email
    FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
)
SELECT 
    '=== BRUME''S CURRENT STATE ===' as section,
    b.id as student_id,
    b.first_name || ' ' || b.last_name as name,
    b.email,
    b.class_id as current_class_id,
    c.name as current_class_name
FROM brume b
LEFT JOIN classes c ON c.id = b.class_id;

-- ================================================================

-- Step 2: ALL promotion records for Brume (including reverted ones)
WITH brume AS (
    SELECT id FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
)
SELECT 
    '=== ALL PROMOTIONS (INCLUDING REVERTED) ===' as section,
    pr.id as promotion_record_id,
    pr.from_class_id,
    fc.name as from_class_name,
    pr.to_class_id,
    tc.name as to_class_name,
    pr.current_session,
    pr.new_session,
    pr.is_reverted,
    pr.promoted_at,
    pr.reverted_at,
    -- Show sequence number
    ROW_NUMBER() OVER (ORDER BY pr.promoted_at) as sequence_num,
    -- Show if this is the latest non-reverted
    CASE 
        WHEN pr.is_reverted = false 
         AND pr.promoted_at = (
            SELECT MAX(promoted_at) FROM promotions 
            WHERE student_id = pr.student_id AND is_reverted = false
        )
        THEN '← LATEST NON-REVERTED (this is what banner sees)'
        WHEN pr.is_reverted = true THEN '(reverted)'
        ELSE ''
    END as status
FROM promotions pr
JOIN brume b ON b.id = pr.student_id
LEFT JOIN classes fc ON fc.id = pr.from_class_id
LEFT JOIN classes tc ON tc.id = pr.to_class_id
ORDER BY pr.promoted_at;

-- ================================================================

-- Step 3: Check if JSS2 class changed over time
SELECT 
    '=== JSS2 CLASSES (check for duplicates or deletions) ===' as section,
    c.id as class_id,
    c.name as class_name,
    c.level,
    s.name as section_name,
    c.created_at,
    COUNT(p.id) as current_student_count,
    -- Check if this class is in any promotion records
    EXISTS(
        SELECT 1 FROM promotions 
        WHERE from_class_id = c.id OR to_class_id = c.id
    ) as used_in_promotions,
    -- Count how many times used in promotions
    (
        SELECT COUNT(*) FROM promotions 
        WHERE from_class_id = c.id OR to_class_id = c.id
    ) as promotion_usage_count
FROM classes c
LEFT JOIN sections s ON s.id = c.section_id
LEFT JOIN profiles p ON p.class_id = c.id AND p.role = 'student'
WHERE c.name ILIKE '%jss2%'
GROUP BY c.id, c.name, c.level, s.name, c.created_at
ORDER BY c.created_at;

-- ================================================================

-- Step 4: Check for DELETED JSS2 classes (might show in promotions but not in classes table)
WITH brume AS (
    SELECT id FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
),
brume_promotions AS (
    SELECT DISTINCT 
        COALESCE(from_class_id, to_class_id) as class_id
    FROM promotions
    WHERE student_id = (SELECT id FROM brume)
      AND (from_class_id IS NOT NULL OR to_class_id IS NOT NULL)
)
SELECT 
    '=== ORPHANED CLASS IDS (in promotions but not in classes table) ===' as section,
    bp.class_id,
    CASE 
        WHEN c.id IS NULL THEN '❌ CLASS DELETED!'
        ELSE '✅ Class still exists'
    END as status,
    c.name as class_name_if_exists
FROM brume_promotions bp
LEFT JOIN classes c ON c.id = bp.class_id
WHERE c.id IS NULL;

-- ================================================================

-- Step 5: Timeline of what happened (ordered story)
WITH brume AS (
    SELECT id, class_id as current_class_id FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
)
SELECT 
    '=== COMPLETE TIMELINE ===' as section,
    ROW_NUMBER() OVER (ORDER BY pr.promoted_at) as step,
    TO_CHAR(pr.promoted_at, 'YYYY-MM-DD HH24:MI:SS') as when_it_happened,
    CASE 
        WHEN pr.is_reverted = true THEN '⏪ REVERT'
        ELSE '⏩ PROMOTE'
    END as action,
    fc.name || ' (ID: ' || SUBSTRING(pr.from_class_id::text, 1, 8) || '...)' as from_class,
    COALESCE(tc.name, 'GRADUATED') || ' (ID: ' || SUBSTRING(COALESCE(pr.to_class_id::text, 'null'), 1, 8) || '...)' as to_class,
    pr.is_reverted,
    -- After this action, what should student's class_id be?
    CASE 
        WHEN pr.is_reverted = false THEN pr.to_class_id
        ELSE NULL -- Revert sets is_reverted flag but doesn't create new promotion record
    END as expected_class_after_action,
    -- Does it match current state?
    CASE 
        WHEN pr.is_reverted = false 
         AND pr.to_class_id = (SELECT current_class_id FROM brume)
         AND pr.promoted_at = (SELECT MAX(promoted_at) FROM promotions WHERE student_id = pr.student_id AND is_reverted = false)
        THEN '✅ MATCHES CURRENT STATE'
        WHEN pr.is_reverted = false 
         AND pr.to_class_id != (SELECT current_class_id FROM brume)
        THEN '❌ MISMATCH!'
        ELSE ''
    END as verification
FROM promotions pr
JOIN brume b ON b.id = pr.student_id
LEFT JOIN classes fc ON fc.id = pr.from_class_id
LEFT JOIN classes tc ON tc.id = pr.to_class_id
ORDER BY pr.promoted_at;

-- ================================================================

-- Step 6: Direct comparison (what SHOULD be vs what IS)
WITH brume AS (
    SELECT id, class_id FROM profiles 
    WHERE first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%'
    LIMIT 1
),
latest_promotion AS (
    SELECT * FROM promotions
    WHERE student_id = (SELECT id FROM brume)
      AND is_reverted = false
    ORDER BY promoted_at DESC
    LIMIT 1
)
SELECT 
    '=== FINAL VERIFICATION ===' as section,
    b.id as student_id,
    b.class_id as student_current_class_id,
    c1.name as student_current_class_name,
    lp.to_class_id as promotion_target_class_id,
    c2.name as promotion_target_class_name,
    -- Are they the same?
    CASE 
        WHEN b.class_id = lp.to_class_id THEN '✅ PERFECT MATCH'
        WHEN b.class_id != lp.to_class_id THEN '❌ MISMATCH - THIS IS THE PROBLEM!'
        WHEN lp.to_class_id IS NULL THEN '⚠️ No active promotion found'
        ELSE '❓ Unknown state'
    END as diagnosis,
    -- Additional info
    lp.promoted_at as last_promotion_date,
    EXTRACT(DAY FROM (NOW() - lp.promoted_at)) as days_since_promotion
FROM brume b
LEFT JOIN latest_promotion lp ON true
LEFT JOIN classes c1 ON c1.id = b.class_id
LEFT JOIN classes c2 ON c2.id = lp.to_class_id;

-- ================================================================
-- WHAT TO LOOK FOR:
-- ================================================================
-- 1. Step 2: How many promotions/reverts happened?
-- 2. Step 3: Is there more than ONE JSS2 class? (duplicate classes)
-- 3. Step 4: Are there any DELETED classes? (orphaned IDs)
-- 4. Step 5: Does the timeline show multiple promote→revert cycles?
-- 5. Step 6: Does it confirm the mismatch?
--
-- YOUR THEORY: Multiple promote/revert cycles caused the class_id
-- to point to a different JSS2 class than the latest promotion record.
--
-- This SQL will show us EXACTLY what happened!
-- ================================================================
