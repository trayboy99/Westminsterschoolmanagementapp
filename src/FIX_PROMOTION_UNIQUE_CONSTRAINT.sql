-- ============================================================================
-- FIX: Promotion Unique Constraint for Revert System
-- ============================================================================
-- Problem: Constraint prevents re-promoting after revert
-- Solution: Make constraint only apply to non-reverted promotions
-- ============================================================================

-- STEP 1: Drop the old constraint
DROP INDEX IF EXISTS idx_promotions_unique_student_session;

-- STEP 2: Create new PARTIAL unique index (excludes reverted promotions)
CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (student_id, current_session, new_session) 
WHERE is_reverted = false;

-- ============================================================================
-- WHAT THIS DOES:
-- ============================================================================
-- ✅ Allows multiple promotion records for same student/session
-- ✅ But only ONE active (non-reverted) promotion at a time
-- ✅ Reverted promotions (is_reverted = true) are ignored by constraint
-- ✅ Can promote → revert → promote again without errors
--
-- EXAMPLE:
-- Record 1: student_id=123, current=2026/2027, new=2026/2027, is_reverted=TRUE  ✅ OK
-- Record 2: student_id=123, current=2026/2027, new=2026/2027, is_reverted=FALSE ✅ OK
-- Record 3: student_id=123, current=2026/2027, new=2026/2027, is_reverted=FALSE ❌ BLOCKED
-- ============================================================================

-- Verify the index was created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'promotions'
    AND indexname = 'idx_promotions_unique_student_session';
