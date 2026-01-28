-- ============================================================
-- FIX: Enable Your Deadline to Block Teachers
-- ============================================================
-- Your deadline has enabled=false, so the system ignores it!
-- You need enabled=true for the deadline to actually work.
-- ============================================================

-- STEP 1: Check current state
SELECT 
  '📋 BEFORE FIX' as status,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN enabled = false THEN 
      '⚪ DISABLED - System ignores this deadline, teachers CAN upload'
    WHEN enabled = true AND deadline > NOW() THEN 
      '✅ ACTIVE - Teachers can upload until ' || deadline::date
    WHEN enabled = true AND deadline <= NOW() THEN 
      '❌ ACTIVE + EXPIRED - Teachers are BLOCKED from uploading'
  END as what_this_means
FROM upload_deadlines
WHERE term = 'First Term'
  AND session = '2025/2026'
  AND upload_type = 'exam_question';


-- STEP 2: Enable the deadline (make it ACTIVE)
UPDATE upload_deadlines
SET enabled = true  -- Turn ON the deadline enforcement
WHERE term = 'First Term'
  AND session = '2025/2026'
  AND upload_type = 'exam_question'
RETURNING 
  '✅ DEADLINE NOW ENABLED' as result,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  'Teachers will now be BLOCKED because deadline expired' as effect;


-- STEP 3: Verify the fix
SELECT 
  '✔️ AFTER FIX' as status,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN enabled = true AND deadline <= NOW() THEN 
      '🔴 Teachers will see: RED alert "Deadline Expired" + Button DISABLED ❌'
    WHEN enabled = true AND deadline > NOW() THEN 
      '🔵 Teachers will see: BLUE alert "Deadline ' || deadline::date || '" + Button ENABLED ✅'
    WHEN enabled = false THEN 
      '🟢 Teachers will see: GREEN alert "No Deadline Set" + Button ENABLED ✅'
  END as teacher_experience
FROM upload_deadlines
WHERE term = 'First Term'
  AND session = '2025/2026'
  AND upload_type = 'exam_question';


-- STEP 4: Test what backend will find
-- Backend queries: WHERE enabled = true
SELECT 
  '🔍 WHAT BACKEND WILL FIND' as test,
  COUNT(*) as deadlines_found,
  CASE 
    WHEN COUNT(*) = 0 THEN 
      '❌ No deadline found → Teachers CAN upload'
    WHEN COUNT(*) > 0 THEN 
      '✅ Deadline found → Will check if expired → Teachers will be BLOCKED'
  END as backend_behavior
FROM upload_deadlines
WHERE enabled = true
  AND term = 'First Term'
  AND session = '2025/2026'
  AND upload_type = 'exam_question';


-- ============================================================
-- EXPLANATION OF enabled COLUMN:
-- ============================================================
-- enabled = false → Deadline is TURNED OFF (disabled, inactive)
--                → Backend ignores it completely
--                → Teachers can upload anytime
--                → Like a light switch in OFF position 💡❌
--
-- enabled = true  → Deadline is TURNED ON (enabled, active)
--                → Backend checks if it's expired
--                → If expired: Teachers BLOCKED ❌
--                → If not expired: Teachers allowed ✅
--                → Like a light switch in ON position 💡✅
-- ============================================================


-- BONUS: Check ALL your deadlines
SELECT 
  '📊 ALL DEADLINES OVERVIEW' as note,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN enabled = false THEN '💤 SLEEPING (not enforced)'
    WHEN enabled = true AND deadline > NOW() THEN '⏰ COUNTING DOWN'
    WHEN enabled = true AND deadline <= NOW() THEN '🚫 BLOCKING NOW'
  END as status
FROM upload_deadlines
ORDER BY deadline DESC;
