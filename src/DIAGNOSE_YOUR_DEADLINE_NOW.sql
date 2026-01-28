-- Diagnose why you're seeing "No Deadline Set" when deadline exists

-- STEP 1: Check ALL deadlines in the database
SELECT 
  id,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  created_at,
  -- Check status
  CASE 
    WHEN deadline > NOW() THEN '✅ ACTIVE (Not expired yet)'
    WHEN deadline <= NOW() THEN '❌ EXPIRED'
  END as status,
  -- Check what should happen
  CASE 
    WHEN deadline > NOW() AND enabled = true THEN 
      '📅 Teachers CAN upload (deadline not reached)'
    WHEN deadline <= NOW() AND enabled = true THEN 
      '❌ Teachers BLOCKED (deadline expired + enabled=true)'
    WHEN deadline <= NOW() AND enabled = false THEN 
      '✅ Teachers CAN upload (deadline disabled by admin)'
  END as expected_behavior,
  -- Hours until deadline / hours since expired
  CASE 
    WHEN deadline > NOW() THEN 
      ROUND(EXTRACT(EPOCH FROM (deadline - NOW())) / 3600, 1) || ' hours remaining'
    WHEN deadline <= NOW() THEN 
      ROUND(EXTRACT(EPOCH FROM (NOW() - deadline)) / 3600, 1) || ' hours overdue'
  END as time_info
FROM upload_deadlines
ORDER BY deadline DESC;

-- STEP 2: Check if there's a deadline for YOUR specific case
-- REPLACE THESE VALUES with what you selected in the form:
DO $$
DECLARE
  your_term TEXT := 'First Term';           -- ← Change this
  your_session TEXT := '2025/2026';         -- ← Change this
  your_type TEXT := 'e-notes';              -- ← Change this (e-notes, exam_question, assignment, other_resources)
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Checking deadline for:';
  RAISE NOTICE '  Term: %', your_term;
  RAISE NOTICE '  Session: %', your_session;
  RAISE NOTICE '  Type: %', your_type;
  RAISE NOTICE '========================================';
END $$;

-- Check exact match
SELECT 
  '🎯 EXACT MATCH FOUND' as result,
  id,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN deadline <= NOW() THEN '❌ EXPIRED'
    ELSE '✅ ACTIVE'
  END as status
FROM upload_deadlines
WHERE term = 'First Term'           -- ← Change this
  AND session = '2025/2026'         -- ← Change this
  AND upload_type = 'e-notes'       -- ← Change this
  AND enabled = true;

-- Check catch-all (upload_type = 'all')
SELECT 
  '🌐 CATCH-ALL DEADLINE FOUND' as result,
  id,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN deadline <= NOW() THEN '❌ EXPIRED - Blocks ALL upload types'
    ELSE '✅ ACTIVE - Applies to ALL upload types'
  END as status
FROM upload_deadlines
WHERE term = 'First Term'           -- ← Change this
  AND session = '2025/2026'         -- ← Change this
  AND upload_type = 'all'
  AND enabled = true;

-- STEP 3: Check for possible mismatches
SELECT 
  '⚠️ POSSIBLE MISMATCHES' as note,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN term != 'First Term' THEN '❌ Term mismatch: ' || term || ' != First Term'
    WHEN session != '2025/2026' THEN '❌ Session mismatch: ' || session || ' != 2025/2026'
    WHEN upload_type NOT IN ('e-notes', 'all') THEN '❌ Type mismatch: ' || upload_type || ' (looking for e-notes or all)'
    WHEN enabled = false THEN '❌ Deadline is disabled'
    ELSE '✅ Matches criteria'
  END as issue
FROM upload_deadlines
WHERE enabled = true
ORDER BY deadline DESC;

-- STEP 4: Show what the backend will do
SELECT 
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN deadline > NOW() AND enabled = true THEN 
      '🟢 FRONTEND SHOWS: Blue alert "Deadline active" + Button ENABLED'
    WHEN deadline <= NOW() AND enabled = true THEN 
      '🔴 FRONTEND SHOWS: Red alert "Deadline expired" + Button DISABLED (for teachers)'
    WHEN enabled = false THEN 
      '⚪ FRONTEND SHOWS: "No deadline set" + Button ENABLED (deadline was disabled)'
    ELSE 
      '❓ UNKNOWN STATE'
  END as what_user_sees
FROM upload_deadlines
WHERE enabled = true
ORDER BY deadline DESC;
