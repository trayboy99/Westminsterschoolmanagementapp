-- ==========================================
-- FIX: ADD ASSIGNMENT AND OTHER_RESOURCES TO UPLOADS TABLE
-- (Corrected column name: "type" not "resource_type")
-- ==========================================

-- Step 1: Check current constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'uploads'::regclass
AND conname LIKE '%type%';

-- Step 2: Drop the existing constraint (try both possible names)
ALTER TABLE uploads 
DROP CONSTRAINT IF EXISTS uploads_type_check;

ALTER TABLE uploads 
DROP CONSTRAINT IF EXISTS uploads_resource_type_check;

-- Step 3: Add the new constraint with all valid types
-- Database column is "type" (not "resource_type")
-- Valid values: enote, exam_question, assignment, other_resources
ALTER TABLE uploads 
ADD CONSTRAINT uploads_type_check 
CHECK (type IN ('enote', 'e-notes', 'exam_question', 'assignment', 'other_resources'));

-- Step 4: Verify the constraint was added
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'uploads'::regclass
AND conname = 'uploads_type_check';

-- ==========================================
-- VERIFICATION QUERY
-- ==========================================

-- Check current types in use
SELECT 
    type,
    COUNT(*) as count
FROM uploads
GROUP BY type
ORDER BY count DESC;

-- ==========================================
-- NOTES:
-- ==========================================
-- Column name: "type" (not "resource_type")
-- Valid database values:
--   1. 'enote' or 'e-notes' - Electronic notes for weekly lessons (requires week)
--   2. 'exam_question' - Past questions and exam materials (no week)
--   3. 'assignment' - Student assignments (NEW - requires week)
--   4. 'other_resources' - Miscellaneous educational materials (NEW - no week)
--
-- Frontend sends: 'e-notes', 'exam-questions', 'assignment', 'other-resources'
-- Backend normalizes to: 'enote', 'exam_question', 'assignment', 'other_resources'
-- ==========================================
