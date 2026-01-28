-- ================================================================
-- FIX BRUME'S CLASS ID MISMATCH - INSTANT FIX
-- ================================================================
-- Problem: Student's class_id doesn't match promotion's to_class_id
-- Solution: Update student's class_id to match the promotion target
-- ================================================================

-- Step 1: Verify the mismatch (check before fixing)
SELECT 
    'BEFORE FIX' as status,
    p.id as student_id,
    p.first_name || ' ' || p.last_name as student_name,
    p.class_id as current_class_id,
    c.name as current_class_name,
    pr.to_class_id as promotion_target_id,
    tc.name as promotion_target_name,
    CASE 
        WHEN p.class_id = pr.to_class_id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as match_status
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
LEFT JOIN LATERAL (
    SELECT * FROM promotions 
    WHERE student_id = p.id 
      AND is_reverted = false
    ORDER BY promoted_at DESC 
    LIMIT 1
) pr ON true
LEFT JOIN classes tc ON tc.id = pr.to_class_id
WHERE p.first_name ILIKE '%brume%' 
   OR p.last_name ILIKE '%ororho%';

-- ================================================================

-- Step 2: FIX - Update student's class_id to match promotion target
UPDATE profiles 
SET class_id = (
    SELECT to_class_id 
    FROM promotions 
    WHERE student_id = profiles.id 
      AND is_reverted = false
    ORDER BY promoted_at DESC 
    LIMIT 1
)
WHERE (first_name ILIKE '%brume%' OR last_name ILIKE '%ororho%')
  AND EXISTS (
    SELECT 1 FROM promotions 
    WHERE student_id = profiles.id 
      AND is_reverted = false
  );

-- ================================================================

-- Step 3: Verify the fix (check after fixing)
SELECT 
    'AFTER FIX' as status,
    p.id as student_id,
    p.first_name || ' ' || p.last_name as student_name,
    p.class_id as current_class_id,
    c.name as current_class_name,
    pr.to_class_id as promotion_target_id,
    tc.name as promotion_target_name,
    CASE 
        WHEN p.class_id = pr.to_class_id THEN '✅ MATCH - BANNER WILL SHOW!'
        ELSE '❌ STILL BROKEN'
    END as match_status
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
LEFT JOIN LATERAL (
    SELECT * FROM promotions 
    WHERE student_id = p.id 
      AND is_reverted = false
    ORDER BY promoted_at DESC 
    LIMIT 1
) pr ON true
LEFT JOIN classes tc ON tc.id = pr.to_class_id
WHERE p.first_name ILIKE '%brume%' 
   OR p.last_name ILIKE '%ororho%';

-- ================================================================

-- Step 4: Check if there are duplicate JSS2 classes
SELECT 
    id,
    name,
    level,
    created_at,
    COUNT(*) OVER (PARTITION BY name) as duplicate_count,
    CASE 
        WHEN COUNT(*) OVER (PARTITION BY name) > 1 
        THEN '⚠️ DUPLICATE CLASS NAME'
        ELSE '✅ UNIQUE'
    END as status
FROM classes
WHERE name ILIKE '%jss2%'
ORDER BY name, created_at;

-- ================================================================
-- EXPECTED RESULTS:
-- ================================================================
-- Step 1: Shows MISMATCH status
-- Step 2: Updates 1 row (Brume's profile)
-- Step 3: Shows "✅ MATCH - BANNER WILL SHOW!"
-- Step 4: May show multiple JSS2 classes (this is the root cause!)
-- ================================================================

-- ================================================================
-- AFTER RUNNING THIS:
-- ================================================================
-- 1. Brume's class_id will match the promotion target
-- 2. Clear browser session storage: banner_dismissed_xxx_student
-- 3. Refresh student dashboard
-- 4. Banner should appear!
-- ================================================================
