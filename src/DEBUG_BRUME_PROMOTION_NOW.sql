-- ================================================================
-- DEBUG BRUME ORORHO PROMOTION STATUS
-- ================================================================
-- Run this in Supabase SQL Editor to see why banner isn't showing
-- ================================================================

-- Step 1: Find Brume's student ID and current class
SELECT 
    p.id as student_id,
    p.first_name,
    p.last_name,
    p.email,
    p.class_id as current_class_id,
    c.name as current_class_name,
    c.level as current_class_level
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.first_name ILIKE '%brume%' 
   OR p.last_name ILIKE '%ororho%'
   OR p.email ILIKE '%brume%';

-- ================================================================

-- Step 2: Check all promotions for this student
SELECT 
    pr.id as promotion_id,
    pr.student_id,
    pr.from_class_id,
    pr.to_class_id,
    fc.name as from_class_name,
    tc.name as to_class_name,
    pr.current_session,
    pr.new_session,
    pr.is_reverted,
    pr.is_graduation,
    pr.promoted_at,
    pr.promoted_by,
    -- Check if promotion is within 28 days
    CASE 
        WHEN pr.promoted_at >= (NOW() - INTERVAL '28 days') 
        THEN '✅ RECENT (will show banner)'
        ELSE '❌ TOO OLD (banner won''t show)'
    END as banner_status,
    -- Check age
    EXTRACT(DAY FROM (NOW() - pr.promoted_at)) as days_ago
FROM promotions pr
LEFT JOIN classes fc ON fc.id = pr.from_class_id
LEFT JOIN classes tc ON tc.id = pr.to_class_id
WHERE pr.student_id IN (
    SELECT id FROM profiles 
    WHERE first_name ILIKE '%brume%' 
       OR last_name ILIKE '%ororho%'
)
ORDER BY pr.promoted_at DESC;

-- ================================================================

-- Step 3: Check if student's current class matches promotion
SELECT 
    p.id as student_id,
    p.first_name || ' ' || p.last_name as student_name,
    p.class_id as current_class_id,
    c.name as current_class_name,
    pr.to_class_id as promotion_target_class_id,
    tc.name as promotion_target_class_name,
    pr.is_reverted,
    pr.promoted_at,
    CASE 
        WHEN p.class_id = pr.to_class_id AND pr.is_reverted = false 
        THEN '✅ MATCH - Banner SHOULD show'
        WHEN p.class_id != pr.to_class_id AND pr.is_reverted = false
        THEN '❌ MISMATCH - Student not in promoted class!'
        WHEN pr.is_reverted = true
        THEN '⚠️ REVERTED - Banner will not show'
        ELSE '❓ UNKNOWN'
    END as verification_status
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

-- Step 4: Check exact banner query (what PromotionBanner component uses)
WITH target_student AS (
    SELECT id FROM profiles 
    WHERE first_name ILIKE '%brume%' 
       OR last_name ILIKE '%ororho%'
    LIMIT 1
)
SELECT 
    pr.*,
    fc.name as from_class_name,
    tc.name as to_class_name,
    '✅ This is what banner should see' as note
FROM promotions pr
LEFT JOIN classes fc ON fc.id = pr.from_class_id
LEFT JOIN classes tc ON tc.id = pr.to_class_id
WHERE pr.student_id = (SELECT id FROM target_student)
  AND pr.is_reverted = false
  AND pr.promoted_at >= (NOW() - INTERVAL '28 days')
ORDER BY pr.promoted_at DESC
LIMIT 1;

-- ================================================================
-- EXPECTED RESULTS:
-- ================================================================
-- 1. Step 1 should show: class_id matching JSS2 class ID
-- 2. Step 2 should show: At least one promotion record
-- 3. Step 3 should show: "✅ MATCH - Banner SHOULD show"
-- 4. Step 4 should return: One promotion record (this is what banner sees)
--
-- If Step 4 returns NOTHING, banner won't show!
-- Common reasons:
--   - No promotion record exists
--   - Promotion is_reverted = true
--   - Promotion older than 28 days
--   - Promotion record was never created
-- ================================================================
