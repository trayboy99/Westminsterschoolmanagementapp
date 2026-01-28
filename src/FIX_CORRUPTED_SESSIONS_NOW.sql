-- ═══════════════════════════════════════════════════════════════════════
-- FIX CORRUPTED SESSION FIELD IN UPLOADS TABLE
-- ═══════════════════════════════════════════════════════════════════════
-- 
-- ISSUE: Teachers' uploads had access tokens saved in the session field
--        instead of academic sessions like "2025/2026"
--
-- This script:
-- 1. Shows corrupted data
-- 2. Fixes it to "2025/2026" (current session)
-- 3. Verifies the fix
-- ═══════════════════════════════════════════════════════════════════════

-- STEP 1: Check for corrupted sessions
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '🔍 CHECKING FOR CORRUPTED DATA...' AS status;

-- Show corrupted uploads (session field contains tokens)
SELECT 
  id,
  title,
  LEFT(session, 50) || '...' AS corrupted_session,
  term,
  type,
  class_id,
  created_at,
  uploaded_by
FROM uploads
WHERE LENGTH(session) > 50  -- Tokens are very long
   OR session LIKE 'eyJ%'   -- JWT tokens start with this
ORDER BY created_at DESC;

-- Count corrupted vs valid
SELECT 
  COUNT(*) FILTER (WHERE session ~ '^\d{4}/\d{4}$') AS valid_uploads,
  COUNT(*) FILTER (WHERE NOT (session ~ '^\d{4}/\d{4}$')) AS corrupted_uploads,
  COUNT(*) AS total_uploads
FROM uploads;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: FIX CORRUPTED SESSIONS
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '🔧 FIXING CORRUPTED SESSIONS...' AS status;

-- Update all corrupted sessions to "2025/2026" (current academic session)
UPDATE uploads
SET session = '2025/2026'
WHERE LENGTH(session) > 50
   OR session LIKE 'eyJ%'
   OR NOT (session ~ '^\d{4}/\d{4}$');

-- Show how many were fixed
SELECT 
  '✅ FIXED!' AS status,
  COUNT(*) AS uploads_fixed
FROM uploads
WHERE session = '2025/2026';

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: VERIFY THE FIX
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '✅ VERIFICATION...' AS status;

-- Should show NO corrupted sessions
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS - No corrupted sessions found!'
    ELSE '❌ STILL CORRUPTED - ' || COUNT(*) || ' uploads have bad session values'
  END AS result
FROM uploads
WHERE LENGTH(session) > 50
   OR session LIKE 'eyJ%'
   OR NOT (session ~ '^\d{4}/\d{4}$');

-- Show all unique sessions (should only be valid academic sessions)
SELECT 
  session,
  COUNT(*) AS upload_count,
  CASE 
    WHEN session ~ '^\d{4}/\d{4}$' THEN '✅ Valid'
    ELSE '❌ Invalid'
  END AS status
FROM uploads
GROUP BY session
ORDER BY upload_count DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: SHOW SAMPLE OF FIXED DATA
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '📊 SAMPLE OF FIXED DATA...' AS status;

SELECT 
  id,
  title,
  session,  -- Should be "2025/2026" now
  term,
  type,
  week,
  class_id,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS uploaded_at
FROM uploads
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════
-- OPTIONAL: If you need to set different sessions based on created_at
-- ═══════════════════════════════════════════════════════════════════════

-- Uncomment if you want to set sessions based on upload date:
/*
UPDATE uploads
SET session = CASE 
  WHEN created_at >= '2025-09-01' THEN '2025/2026'
  WHEN created_at >= '2024-09-01' THEN '2024/2025'
  WHEN created_at >= '2023-09-01' THEN '2023/2024'
  ELSE '2025/2026'  -- Default for older uploads
END
WHERE LENGTH(session) > 50
   OR session LIKE 'eyJ%'
   OR NOT (session ~ '^\d{4}/\d{4}$');
*/

-- ═══════════════════════════════════════════════════════════════════════
-- FINAL STATUS
-- ═══════════════════════════════════════════════════════════════════════
SELECT 
  '🎉 COMPLETE!' AS status,
  'All corrupted sessions have been fixed to 2025/2026' AS message,
  'Students should now be able to see uploaded files!' AS next_step;
