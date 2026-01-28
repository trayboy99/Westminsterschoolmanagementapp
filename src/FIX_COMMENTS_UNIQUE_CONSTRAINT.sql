-- ============================================================================
-- FIX COMMENTS TABLE UNIQUE CONSTRAINT
-- ============================================================================
-- Problem: Current constraint only checks (student_id, exam_id, comment_type)
-- This breaks after student promotion - same student can't have comments
-- for the same exam type across different classes/sessions/terms
--
-- Solution: Include ALL contextual columns in the unique constraint
-- ============================================================================

-- Step 1: Drop the existing wrong constraint
ALTER TABLE comments 
DROP CONSTRAINT IF EXISTS comments_student_id_exam_id_comment_type_key;

-- Step 2: Add the correct constraint with full historical context
ALTER TABLE comments 
ADD CONSTRAINT comments_unique_per_context 
  UNIQUE(student_id, class_id, academic_sessions_id, academic_terms_id, exam_id, comment_type);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that the new constraint exists
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'comments'::regclass
  AND contype = 'u';

-- ============================================================================
-- WHAT THIS FIXES
-- ============================================================================
-- BEFORE (BROKEN):
--   Student John in JSS 1A - Terminal Exam - Teacher Comment ✅ Saved
--   John promoted to JSS 2A
--   Student John in JSS 2A - Terminal Exam - Teacher Comment ❌ ERROR!
--   (Constraint thinks it's duplicate because it only checks student_id + exam_id + type)
--
-- AFTER (FIXED):
--   Student John in JSS 1A - 2024/2025 - First Term - Terminal Exam - Teacher Comment ✅ Saved
--   John promoted to JSS 2A
--   Student John in JSS 2A - 2025/2026 - First Term - Terminal Exam - Teacher Comment ✅ Saved
--   (Constraint now checks student_id + class_id + session + term + exam + type = UNIQUE!)
--
-- Historical comments remain accessible by querying with the stored class_id
-- ============================================================================
