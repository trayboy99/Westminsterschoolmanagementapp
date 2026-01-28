-- Fix marks table status constraint to allow 'pending_approval'
-- This SQL file fixes the check constraint error on the marks table

-- Step 1: Drop the existing check constraint (if it exists)
ALTER TABLE marks DROP CONSTRAINT IF EXISTS marks_status_check;

-- Step 2: Add the updated constraint with all valid status values
ALTER TABLE marks 
ADD CONSTRAINT marks_status_check 
CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected', 'pending', 'pending_approval'));

-- Step 3: Verify the constraint was added correctly
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'marks_status_check';

-- Step 4: Update any existing marks with invalid status values to 'pending'
UPDATE marks 
SET status = 'pending' 
WHERE status NOT IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected', 'pending', 'pending_approval');

-- Step 5: Show sample of current marks statuses
SELECT DISTINCT status, COUNT(*) 
FROM marks 
GROUP BY status 
ORDER BY status;
