-- ============================================================================
-- COPY-PASTE THIS TO FIX PROMOTION REVERT ERROR (10 seconds)
-- ============================================================================
-- Error: duplicate key value violates unique constraint
-- Fix: Allow promotions after revert by excluding reverted records
-- ============================================================================

DROP INDEX IF EXISTS idx_promotions_unique_student_session;

CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (student_id, current_session, new_session) 
WHERE is_reverted = false;

-- ✅ Done! Try promoting again - should work now!
