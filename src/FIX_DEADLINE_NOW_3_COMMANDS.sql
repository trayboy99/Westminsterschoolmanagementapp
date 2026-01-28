-- ============================================================
-- FIX DEADLINE NOW - Just Copy and Paste These 3 Commands
-- ============================================================

-- COMMAND 1: See what's in your database right now
-- ============================================================
SELECT 
  '📋 CURRENT DEADLINES' as status,
  id,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN deadline > NOW() THEN '✅ ACTIVE'
    WHEN deadline <= NOW() AND enabled = true THEN '❌ EXPIRED (blocking teachers)'
    WHEN deadline <= NOW() AND enabled = false THEN '⚪ DISABLED (allowing uploads)'
  END as current_state,
  CASE 
    WHEN deadline > NOW() THEN 
      '📅 Teachers see: Blue alert "Deadline ' || deadline::date || '" + Button ENABLED'
    WHEN deadline <= NOW() AND enabled = true THEN 
      '🔴 Teachers see: Red alert "Deadline expired" + Button DISABLED'
    WHEN deadline <= NOW() AND enabled = false THEN 
      '🟢 Teachers see: Green alert "No deadline set" + Button ENABLED'
  END as what_teachers_see
FROM upload_deadlines
ORDER BY deadline DESC;


-- COMMAND 2: Auto-disable ALL expired deadlines
-- ============================================================
-- This will set enabled=false for any deadline that has passed
UPDATE upload_deadlines
SET enabled = false
WHERE deadline <= NOW() 
  AND enabled = true
RETURNING 
  '✅ AUTO-DISABLED' as action,
  term,
  session,
  upload_type,
  deadline,
  'Teachers can now upload for this term/session/type' as result;


-- COMMAND 3: Verify everything is correct now
-- ============================================================
SELECT 
  '✅ VERIFICATION' as status,
  term || ' / ' || session || ' / ' || upload_type as config,
  deadline,
  enabled,
  CASE 
    WHEN deadline > NOW() AND enabled = true THEN 
      '✅ CORRECT: Active deadline'
    WHEN deadline <= NOW() AND enabled = false THEN 
      '✅ CORRECT: Expired deadline is disabled'
    WHEN deadline <= NOW() AND enabled = true THEN 
      '❌ ERROR: Expired but still enabled!'
    ELSE 
      '⚠️ REVIEW NEEDED'
  END as status_check
FROM upload_deadlines
ORDER BY deadline DESC;


-- ============================================================
-- BONUS: Check specific deadline (YOUR case)
-- ============================================================
-- Edit these values to match what you selected in the form:
SELECT 
  '🎯 YOUR SPECIFIC DEADLINE' as note,
  *,
  CASE 
    WHEN deadline > NOW() THEN '✅ Active - Button should be ENABLED'
    WHEN deadline <= NOW() AND enabled = true THEN '❌ Expired + Enabled - Button should be DISABLED (run COMMAND 2!)'
    WHEN deadline <= NOW() AND enabled = false THEN '✅ Expired + Disabled - Button should be ENABLED'
  END as expected_behavior
FROM upload_deadlines
WHERE term = 'First Term'        -- ← Change this to YOUR term
  AND session = '2025/2026'      -- ← Change this to YOUR session
  AND upload_type = 'e-notes';   -- ← Change this to YOUR type


-- ============================================================
-- IF YOU SEE "No rows returned" ABOVE:
-- ============================================================
-- It means there's NO deadline for that term/session/type combination!
-- Check what's actually in your database:
SELECT 
  'Available deadlines:' as note,
  term,
  session,
  upload_type,
  deadline,
  enabled
FROM upload_deadlines
ORDER BY term, session, upload_type;
