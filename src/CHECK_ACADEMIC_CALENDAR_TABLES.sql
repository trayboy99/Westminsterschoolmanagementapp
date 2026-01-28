-- ============================================================================
-- CHECK IF ACADEMIC CALENDAR TABLES EXIST
-- Run this to verify the tables were created correctly
-- ============================================================================

-- Check if academic_sessions table exists
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'academic_sessions'
  ) as academic_sessions_exists;

-- Check if academic_terms table exists
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'academic_terms'
  ) as academic_terms_exists;

-- Check if academic_calendar table exists
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'academic_calendar'
  ) as academic_calendar_exists;

-- ============================================================================
-- If all three return TRUE, the tables exist ✅
-- If any return FALSE, you need to run RESTRUCTURE_ACADEMIC_CALENDAR.sql
-- ============================================================================

-- View academic_sessions table structure
\d academic_sessions;

-- View academic_terms table structure
\d academic_terms;

-- View academic_calendar table structure
\d academic_calendar;

-- ============================================================================
-- Check if there's any data
-- ============================================================================

-- Count sessions
SELECT COUNT(*) as total_sessions FROM academic_sessions;

-- Count terms
SELECT COUNT(*) as total_terms FROM academic_terms;

-- Count calendar entries
SELECT COUNT(*) as total_calendar_entries FROM academic_calendar;

-- ============================================================================
-- View all sessions
-- ============================================================================
SELECT 
  id,
  session_name,
  start_date,
  end_date,
  is_current,
  status,
  created_at
FROM academic_sessions
ORDER BY start_date DESC;

-- ============================================================================
-- View all terms
-- ============================================================================
SELECT 
  id,
  term_name,
  start_date,
  end_date,
  next_term_begins,
  number_of_weeks,
  is_current,
  status,
  created_at
FROM academic_terms
ORDER BY start_date ASC;

-- ============================================================================
-- View current academic calendar
-- ============================================================================
SELECT 
  ac.id as calendar_id,
  s.session_name,
  s.is_current as session_is_current,
  s.status as session_status,
  t.term_name,
  t.number_of_weeks,
  t.is_current as term_is_current,
  t.status as term_status
FROM academic_calendar ac
JOIN academic_sessions s ON ac.session_id = s.id
JOIN academic_terms t ON ac.term_id = t.id;

-- ============================================================================
-- Check triggers exist
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('academic_sessions', 'academic_terms')
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- trigger_session_active_on_current on academic_sessions
-- trigger_term_active_on_current on academic_terms

-- ============================================================================
-- INTERPRETATION OF RESULTS:
-- ============================================================================
-- If you see:
-- ✅ Tables exist (all three return TRUE)
-- ✅ Sessions have data (at least 1 row)
-- ✅ Terms have data (at least 3 rows)
-- ✅ academic_calendar has 1 row
-- ✅ Triggers exist (2 triggers total)
-- ✅ number_of_weeks column exists in academic_terms
--
-- → Everything is set up correctly! ✅
--
-- If you see errors:
-- ❌ relation "academic_sessions" does not exist
--    → Run RESTRUCTURE_ACADEMIC_CALENDAR.sql
--
-- ❌ column "number_of_weeks" does not exist
--    → Re-run RESTRUCTURE_ACADEMIC_CALENDAR.sql (it will recreate tables)
--
-- ❌ No triggers found
--    → Re-run RESTRUCTURE_ACADEMIC_CALENDAR.sql
-- ============================================================================
