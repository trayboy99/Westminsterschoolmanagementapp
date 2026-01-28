-- ============================================
-- REMOVE DRAFT STATUS FROM EXAMS TABLE
-- ============================================
-- This script removes 'draft' from the exam status constraint
-- and updates any existing draft exams to 'upcoming'
-- ============================================

-- Step 1: Update any existing 'draft' exams to 'upcoming'
UPDATE exams 
SET status = 'upcoming' 
WHERE status = 'draft';

-- Step 2: Drop the old constraint
ALTER TABLE exams 
DROP CONSTRAINT IF EXISTS exams_status_check;

-- Step 3: Add new constraint without 'draft'
ALTER TABLE exams 
ADD CONSTRAINT exams_status_check 
CHECK (status IN ('upcoming', 'active', 'completed'));

-- Verification: Check all exam statuses
SELECT status, COUNT(*) as count 
FROM exams 
GROUP BY status;

-- ============================================
-- EXPECTED RESULT:
-- Only 'upcoming', 'active', or 'completed'
-- ============================================
