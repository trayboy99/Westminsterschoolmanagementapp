-- ✅ Fix ON CONFLICT error for attendance table
-- This adds a unique constraint so upsert operations work

-- Step 1: Check current constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attendance';

-- Step 2: Drop the old primary key if it exists (it might just be on 'id')
-- ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_pkey;

-- Step 3: Add unique constraint on (student_id, date)
-- This allows one attendance record per student per day
ALTER TABLE attendance 
ADD CONSTRAINT attendance_student_date_unique 
UNIQUE (student_id, date);

-- Step 4: Verify the constraint was added
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attendance'
AND constraint_type = 'UNIQUE';

-- Step 5: Check the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'attendance'
ORDER BY ordinal_position;
