-- ============================================
-- FIX: Clean Up Corrupted Session Data
-- ============================================
-- ONLY run this if CHECK_STUDENT_DATA_NOW.sql shows corrupted sessions

-- OPTION 1: VIEW corrupted uploads first (SAFE - READ ONLY)
-- Run this first to see what will be affected
SELECT 
  id,
  session,
  term,
  class_id,
  type,
  file_url,
  created_at,
  CASE 
    WHEN session IS NULL THEN 'NULL session'
    WHEN session !~ '^[0-9]{4}/[0-9]{4}$' THEN 'Invalid format: ' || LEFT(session, 50)
    ELSE 'Valid'
  END as issue
FROM uploads
WHERE session !~ '^[0-9]{4}/[0-9]{4}$'
   OR session IS NULL
ORDER BY created_at DESC;

-- ============================================
-- OPTION 2: DELETE corrupted uploads (DESTRUCTIVE!)
-- ============================================
-- ⚠️ WARNING: This permanently deletes corrupted uploads
-- Only use if they are garbage data (access tokens, etc.)
/*
DELETE FROM uploads
WHERE session !~ '^[0-9]{4}/[0-9]{4}$'
   OR session IS NULL;
*/

-- ============================================
-- OPTION 3: UPDATE corrupted sessions to valid value (RECOMMENDED)
-- ============================================
-- This preserves the uploads but fixes the session field
-- Replace '2025/2026' with your current academic session

-- First, check what the current session should be:
SELECT session FROM academic_calendar ORDER BY created_at DESC LIMIT 1;

-- Then update corrupted uploads to use this session:
/*
UPDATE uploads
SET session = '2025/2026'  -- ⚠️ CHANGE THIS to match your current session
WHERE session !~ '^[0-9]{4}/[0-9]{4}$'
   OR session IS NULL;
*/

-- ============================================
-- OPTION 4: UPDATE specific corrupted uploads only
-- ============================================
-- More targeted approach - fix specific bad sessions
/*
-- Example: Fix access token sessions
UPDATE uploads
SET session = '2025/2026'
WHERE session LIKE '%access_token%'
   OR session LIKE '%eyJ%'  -- JWT tokens start with eyJ
   OR session = 'null'
   OR session = 'undefined';
*/

-- ============================================
-- VERIFICATION: Check results after fix
-- ============================================
-- Run this after applying a fix to verify it worked:
SELECT 
  'After Fix' as status,
  COUNT(*) as total_uploads,
  COUNT(CASE WHEN session ~ '^[0-9]{4}/[0-9]{4}$' THEN 1 END) as valid_uploads,
  COUNT(CASE WHEN session !~ '^[0-9]{4}/[0-9]{4}$' OR session IS NULL THEN 1 END) as corrupted_uploads
FROM uploads;

-- Also check by session:
SELECT 
  session,
  COUNT(*) as count,
  CASE 
    WHEN session ~ '^[0-9]{4}/[0-9]{4}$' THEN '✅ Valid'
    ELSE '❌ Still Corrupted'
  END as status
FROM uploads
GROUP BY session
ORDER BY session DESC;

-- ============================================
-- RECOMMENDED FIX WORKFLOW:
-- ============================================
/*
1. Run OPTION 1 to see what's corrupted
2. Check current academic session:
   SELECT session FROM academic_calendar ORDER BY created_at DESC LIMIT 1;
3. Uncomment and run OPTION 3 (UPDATE) with correct session
4. Run VERIFICATION queries to confirm fix
5. Test student login → should see sessions now!
*/
