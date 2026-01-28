-- ============================================
-- VERIFY AUTOMATIC EXAM STATUS SETUP
-- ============================================
-- Run this after applying migrations to verify
-- everything is configured correctly
-- ============================================

-- 1. Check exams table structure
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'exams' 
ORDER BY ordinal_position;

-- 2. Check status constraint (should only allow: upcoming, active, completed)
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'exams' 
AND con.contype = 'c'
AND con.conname LIKE '%status%';

-- 3. Verify no draft exams exist
SELECT 
  status, 
  COUNT(*) as count 
FROM exams 
GROUP BY status 
ORDER BY status;

-- 4. Check sample exams with their dates and statuses
SELECT 
  id,
  name,
  session,
  term,
  start_datetime,
  end_datetime,
  status,
  created_at,
  updated_at,
  CASE 
    WHEN start_datetime IS NULL OR end_datetime IS NULL THEN 'No dates set'
    WHEN NOW() < start_datetime THEN 'Should be: upcoming'
    WHEN NOW() >= start_datetime AND NOW() <= end_datetime THEN 'Should be: active'
    WHEN NOW() > end_datetime THEN 'Should be: completed'
  END as calculated_status
FROM exams 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Find any exams with mismatched status (should auto-correct on next fetch)
SELECT 
  id,
  name,
  status as current_status,
  start_datetime,
  end_datetime,
  CASE 
    WHEN start_datetime IS NULL OR end_datetime IS NULL THEN 'upcoming'
    WHEN NOW() < start_datetime THEN 'upcoming'
    WHEN NOW() >= start_datetime AND NOW() <= end_datetime THEN 'active'
    WHEN NOW() > end_datetime THEN 'completed'
  END as should_be
FROM exams 
WHERE status != CASE 
  WHEN start_datetime IS NULL OR end_datetime IS NULL THEN 'upcoming'
  WHEN NOW() < start_datetime THEN 'upcoming'
  WHEN NOW() >= start_datetime AND NOW() <= end_datetime THEN 'active'
  WHEN NOW() > end_datetime THEN 'completed'
END;

-- 6. Check if updated_at column exists and has values
SELECT 
  COUNT(*) as total_exams,
  COUNT(updated_at) as exams_with_updated_at,
  COUNT(*) - COUNT(updated_at) as missing_updated_at
FROM exams;

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- ✅ Table has columns: id, name, term, session, start_datetime, end_datetime, status, created_at, updated_at
-- ✅ Status constraint only allows: 'upcoming', 'active', 'completed'
-- ✅ No exams with status = 'draft'
-- ✅ All exams have updated_at value
-- ✅ Most exams have matching calculated_status (some may be outdated until next fetch)
-- ============================================
