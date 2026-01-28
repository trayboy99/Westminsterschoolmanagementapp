-- ============================================================================
-- FIX GRADUATION_SESSION FOR EXISTING GRADUATED STUDENTS
-- ============================================================================
-- This SQL fixes students who graduated with the WRONG session stored
-- (They have new_session instead of current_session)
--
-- BEFORE RUNNING: Replace the session values below with your actual sessions!
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSTIC - Check current graduated students sessions
-- ============================================================================
-- Run this first to see what sessions you currently have

SELECT 
  graduation_session,
  COUNT(*) as student_count,
  MIN(graduation_date) as earliest_graduation,
  MAX(graduation_date) as latest_graduation,
  graduation_class
FROM graduated_students
GROUP BY graduation_session, graduation_class
ORDER BY graduation_session DESC, graduation_class;

-- ============================================================================
-- STEP 2: IDENTIFY THE PROBLEM
-- ============================================================================
-- If you see students with graduation_session = "2024/2025" or "2025/2026"
-- but they actually graduated in "2023/2024" or "2024/2025" (one year earlier),
-- then you need to fix them.

-- Example of what you might see:
-- graduation_session | student_count | graduation_class
-- 2024/2025         | 25            | SS3  <-- WRONG! Should be 2023/2024
-- 2025/2026         | 30            | SS3  <-- WRONG! Should be 2024/2025

-- ============================================================================
-- STEP 3: FIX THE DATA
-- ============================================================================
-- Replace these values with your actual sessions:
--   WRONG_SESSION: The incorrect session currently stored (e.g., '2024/2025')
--   CORRECT_SESSION: The correct session it should be (e.g., '2023/2024')
--
-- If you have multiple batches, run this for each batch separately.
-- ============================================================================

-- EXAMPLE 1: Fix 2024/2025 → 2023/2024
-- Uncomment and modify these lines:

-- BEGIN;

-- -- Fix graduated_students table
-- UPDATE graduated_students
-- SET graduation_session = '2023/2024'  -- ✅ CORRECT session
-- WHERE graduation_session = '2024/2025'  -- ❌ WRONG session
--   AND graduation_date >= '2024-06-01'  -- Adjust date range if needed
--   AND graduation_date <= '2024-09-30'; -- Adjust date range if needed

-- -- Fix profiles table
-- UPDATE profiles
-- SET graduation_session = '2023/2024'  -- ✅ CORRECT session
-- WHERE graduation_session = '2024/2025'  -- ❌ WRONG session
--   AND status = 'graduated'
--   AND role = 'student';

-- COMMIT;

-- ============================================================================
-- EXAMPLE 2: Fix 2025/2026 → 2024/2025
-- Uncomment and modify these lines:

-- BEGIN;

-- -- Fix graduated_students table
-- UPDATE graduated_students
-- SET graduation_session = '2024/2025'  -- ✅ CORRECT session
-- WHERE graduation_session = '2025/2026'  -- ❌ WRONG session
--   AND graduation_date >= '2025-06-01'  -- Adjust date range if needed
--   AND graduation_date <= '2025-09-30'; -- Adjust date range if needed

-- -- Fix profiles table
-- UPDATE profiles
-- SET graduation_session = '2024/2025'  -- ✅ CORRECT session
-- WHERE graduation_session = '2025/2026'  -- ❌ WRONG session
--   AND status = 'graduated'
--   AND role = 'student';

-- COMMIT;

-- ============================================================================
-- STEP 4: VERIFY THE FIX
-- ============================================================================
-- Run this after the update to confirm it worked

SELECT 
  graduation_session,
  COUNT(*) as student_count,
  MIN(graduation_date) as earliest_graduation,
  MAX(graduation_date) as latest_graduation,
  graduation_class
FROM graduated_students
GROUP BY graduation_session, graduation_class
ORDER BY graduation_session DESC, graduation_class;

-- Also check a few individual students
SELECT 
  first_name,
  last_name,
  admission_number,
  graduation_number,
  graduation_session,
  graduation_class,
  graduation_date
FROM graduated_students
ORDER BY graduation_date DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: VERIFY ALUMNI PORTAL WORKS
-- ============================================================================
-- After fixing, test that alumni can login with the CORRECT session

-- Check graduation sessions available in the system
SELECT DISTINCT graduation_session
FROM graduated_students
WHERE is_active = true
ORDER BY graduation_session DESC;

-- ============================================================================
-- QUICK COPY-PASTE TEMPLATES
-- ============================================================================
-- Use these templates based on your specific situation:

-- ────────────────────────────────────────────────────────────────────────
-- TEMPLATE A: Fix one session for all students
-- ────────────────────────────────────────────────────────────────────────
/*
BEGIN;

UPDATE graduated_students
SET graduation_session = 'CORRECT_SESSION_HERE'
WHERE graduation_session = 'WRONG_SESSION_HERE';

UPDATE profiles
SET graduation_session = 'CORRECT_SESSION_HERE'
WHERE graduation_session = 'WRONG_SESSION_HERE'
  AND status = 'graduated'
  AND role = 'student';

COMMIT;
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEMPLATE B: Fix specific class only
-- ────────────────────────────────────────────────────────────────────────
/*
BEGIN;

UPDATE graduated_students
SET graduation_session = 'CORRECT_SESSION_HERE'
WHERE graduation_session = 'WRONG_SESSION_HERE'
  AND graduation_class = 'SS3';  -- Only fix SS3 students

UPDATE profiles
SET graduation_session = 'CORRECT_SESSION_HERE'
WHERE graduation_session = 'WRONG_SESSION_HERE'
  AND status = 'graduated'
  AND role = 'student'
  AND id IN (
    SELECT student_id 
    FROM graduated_students 
    WHERE graduation_class = 'SS3'
  );

COMMIT;
*/

-- ────────────────────────────────────────────────────────────────────────
-- TEMPLATE C: Fix by date range
-- ────────────────────────────────────────────────────────────────────────
/*
BEGIN;

UPDATE graduated_students
SET graduation_session = 'CORRECT_SESSION_HERE'
WHERE graduation_session = 'WRONG_SESSION_HERE'
  AND graduation_date >= '2024-06-01'
  AND graduation_date <= '2024-09-30';

UPDATE profiles
SET graduation_session = 'CORRECT_SESSION_HERE'
WHERE graduation_session = 'WRONG_SESSION_HERE'
  AND status = 'graduated'
  AND role = 'student'
  AND id IN (
    SELECT student_id 
    FROM graduated_students 
    WHERE graduation_date >= '2024-06-01'
      AND graduation_date <= '2024-09-30'
  );

COMMIT;
*/

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Always run STEP 1 (diagnostic) first to see what you have
-- 2. Use BEGIN/COMMIT to wrap updates in a transaction (can rollback if needed)
-- 3. Test on a small batch first if you're unsure
-- 4. The correct graduation_session is the session students completed, NOT next year
-- 5. After fixing, test the Alumni Portal to ensure students can login
-- ============================================================================
