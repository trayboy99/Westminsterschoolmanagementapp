-- ============================================
-- SQL Session Filter for Student Uploads
-- ============================================

-- 1. VIEW CORRUPTED SESSIONS (sessions that DON'T match YYYY/YYYY format)
-- Run this to see what corrupted data exists:
SELECT 
  id,
  title,
  session,
  term,
  class_id,
  created_at
FROM uploads
WHERE session !~ '^\d{4}/\d{4}$'  -- PostgreSQL regex: NOT matching YYYY/YYYY
ORDER BY created_at DESC;

-- 2. COUNT CORRUPTED vs VALID SESSIONS
SELECT 
  CASE 
    WHEN session ~ '^\d{4}/\d{4}$' THEN 'Valid (YYYY/YYYY)'
    ELSE 'Corrupted'
  END as session_status,
  COUNT(*) as count
FROM uploads
GROUP BY session_status;

-- 3. VIEW ALL UNIQUE SESSIONS (both valid and corrupted)
SELECT 
  DISTINCT session,
  COUNT(*) as upload_count,
  CASE 
    WHEN session ~ '^\d{4}/\d{4}$' THEN '✅ Valid'
    ELSE '❌ Corrupted'
  END as status
FROM uploads
GROUP BY session
ORDER BY session DESC;

-- 4. CLEAN UP - DELETE CORRUPTED SESSION UPLOADS (OPTIONAL - BE CAREFUL!)
-- Uncomment and run ONLY if you want to permanently delete corrupted uploads:
-- DELETE FROM uploads WHERE session !~ '^\d{4}/\d{4}$';

-- 5. CLEAN UP - UPDATE CORRUPTED SESSIONS TO DEFAULT (OPTIONAL)
-- Uncomment and run ONLY if you want to fix corrupted sessions:
-- UPDATE uploads 
-- SET session = '2024/2025' 
-- WHERE session !~ '^\d{4}/\d{4}$';

-- ============================================
-- How the Backend Filter Works Now
-- ============================================
-- 
-- The backend now uses this SQL filter via PostgREST:
-- 
-- SELECT * FROM uploads 
-- WHERE session ~ '^\d{4}/\d{4}$'
-- 
-- In code: query.filter("session", "match", "^\\d{4}/\\d{4}$")
-- 
-- This PostgreSQL regex means:
-- ^ = start of string
-- \d{4} = exactly 4 digits
-- / = literal slash
-- \d{4} = exactly 4 digits  
-- $ = end of string
--
-- Results:
-- ✅ session = "2025/2026" → Will be included
-- ✅ session = "2024/2025" → Will be included
-- ❌ session = '{"access_token":"..."}' → Will be EXCLUDED
-- ❌ session = "Bearer abc123..." → Will be EXCLUDED
-- ❌ session = NULL → Will be EXCLUDED
-- ❌ session = "2025/2026 extra" → Will be EXCLUDED (must be exact)
-- 
-- Students will ONLY see valid session folders!
-- ============================================
