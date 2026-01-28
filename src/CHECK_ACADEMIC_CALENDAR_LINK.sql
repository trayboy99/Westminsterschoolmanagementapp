-- ============================================================================
-- CHECK IF ACADEMIC_CALENDAR PROPERLY LINKS SESSIONS AND TERMS
-- ============================================================================

SELECT 
  ac.id as calendar_id,
  ac.session_id,
  ac.term_id,
  s.session_name,
  s.is_current as session_is_current,
  s.status as session_status,
  t.term_name,
  t.is_current as term_is_current,
  t.status as term_status,
  t.number_of_weeks
FROM academic_calendar ac
JOIN academic_sessions s ON ac.session_id = s.id
JOIN academic_terms t ON ac.term_id = t.id;

-- ============================================================================
-- EXPECTED RESULT:
-- ============================================================================
-- Should show ONE row with:
-- - calendar_id: some UUID
-- - session_id: UUID matching academic_sessions.id for "2025/2026"
-- - term_id: UUID matching academic_terms.id for "First Term"
-- - session_name: 2025/2026
-- - session_is_current: true
-- - session_status: active
-- - term_name: First Term
-- - term_is_current: true
-- - term_status: active
-- - number_of_weeks: 13
-- ============================================================================

-- IF YOU GET NO ROWS:
-- This means academic_calendar table is empty. Run this to fix:
-- INSERT INTO academic_calendar (session_id, term_id)
-- SELECT 
--   (SELECT id FROM academic_sessions WHERE is_current = true LIMIT 1),
--   (SELECT id FROM academic_terms WHERE is_current = true LIMIT 1)
-- WHERE NOT EXISTS (SELECT 1 FROM academic_calendar);
-- ============================================================================
