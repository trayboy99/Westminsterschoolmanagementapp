-- ============================================================================
-- SQL Queries to Debug Upload Statistics
-- Run these in your Supabase SQL Editor to check what's in the database
-- ============================================================================

-- 1. CHECK: What is the current session and term?
-- ============================================================================
SELECT 'CURRENT SESSION' as check_type, session_name, is_current 
FROM academic_sessions 
WHERE is_current = true;

SELECT 'CURRENT TERM' as check_type, term_name, is_current 
FROM academic_terms 
WHERE is_current = true;


-- 2. CHECK: What uploads exist in the database?
-- ============================================================================
SELECT 
  'ALL UPLOADS' as check_type,
  id,
  title,
  session,
  term,
  created_at,
  CASE 
    WHEN session IS NULL THEN '⚠️ NULL SESSION'
    WHEN term IS NULL THEN '⚠️ NULL TERM'
    ELSE '✅ HAS SESSION/TERM'
  END as status
FROM uploads 
ORDER BY created_at DESC
LIMIT 20;


-- 3. CHECK: How many uploads per session/term?
-- ============================================================================
SELECT 
  'UPLOADS BY SESSION/TERM' as check_type,
  COALESCE(session, '⚠️ NULL') as session,
  COALESCE(term, '⚠️ NULL') as term,
  COUNT(*) as total_uploads
FROM uploads 
GROUP BY session, term 
ORDER BY session DESC, term;


-- 4. CHECK: How many uploads for CURRENT session/term?
-- ============================================================================
SELECT 
  'CURRENT TERM UPLOADS' as check_type,
  COUNT(*) as total_for_current_term
FROM uploads 
WHERE 
  session = (SELECT session_name FROM academic_sessions WHERE is_current = true)
  AND term = (SELECT term_name FROM academic_terms WHERE is_current = true);


-- 5. CHECK: How many uploads have NULL session or term?
-- ============================================================================
SELECT 
  'NULL CHECK' as check_type,
  COUNT(*) as uploads_with_null
FROM uploads 
WHERE session IS NULL OR term IS NULL;


-- 6. CHECK: Sample of uploads with their session/term
-- ============================================================================
SELECT 
  'SAMPLE DATA' as check_type,
  LEFT(id::text, 8) as upload_id,
  title,
  session,
  term,
  TO_CHAR(created_at, 'YYYY-MM-DD') as date_uploaded
FROM uploads 
ORDER BY created_at DESC
LIMIT 10;


-- ============================================================================
-- EXPECTED RESULTS EXPLANATION:
-- ============================================================================

-- Query 1 should return:
-- session_name | is_current
-- 2025/2026    | true         ← Your active session
--
-- term_name    | is_current
-- Second Term  | true         ← Your active term

-- Query 3 should show something like:
-- session    | term        | total_uploads
-- 2025/2026  | Second Term | 4            ← These 4 should show on frontend
-- 2025/2026  | First Term  | 3
-- 2024/2025  | Third Term  | 2
-- ⚠️ NULL    | ⚠️ NULL     | 1            ← This one needs fixing!

-- Query 4 should return:
-- total_for_current_term
-- 4                                       ← This MUST match "Total Uploads: 4" on frontend

-- Query 5 should return:
-- uploads_with_null
-- 0                                       ← If > 0, some uploads need session/term values


-- ============================================================================
-- FIX: If you have uploads with NULL session/term, run this:
-- ============================================================================

-- OPTION 1: Set ALL NULL uploads to current session/term
/*
UPDATE uploads 
SET 
  session = (SELECT session_name FROM academic_sessions WHERE is_current = true),
  term = (SELECT term_name FROM academic_terms WHERE is_current = true)
WHERE session IS NULL OR term IS NULL;
*/

-- OPTION 2: Set specific uploads to specific session/term
/*
UPDATE uploads 
SET session = '2025/2026', term = 'Second Term' 
WHERE id = 'YOUR_UPLOAD_ID_HERE';
*/

-- ============================================================================
-- VERIFY: After making changes, re-run Query 3 to verify
-- ============================================================================
