-- ✅ Complete fix for ON CONFLICT error
-- Handles duplicates first, then adds the unique constraint

-- Step 1: Check for existing duplicates
SELECT student_id, date, COUNT(*) as count
FROM attendance
GROUP BY student_id, date
HAVING COUNT(*) > 1;

-- Step 2: If duplicates exist, keep only the most recent one
-- Delete older duplicates (keeps the one with the highest ID)
DELETE FROM attendance a
USING attendance b
WHERE a.student_id = b.student_id
  AND a.date = b.date
  AND a.id < b.id;

-- Step 3: Verify duplicates are gone
SELECT student_id, date, COUNT(*) as count
FROM attendance
GROUP BY student_id, date
HAVING COUNT(*) > 1;

-- Step 4: Now add the unique constraint
ALTER TABLE attendance 
ADD CONSTRAINT attendance_student_date_unique 
UNIQUE (student_id, date);

-- Step 5: Verify the constraint was added
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attendance'
AND constraint_type = 'UNIQUE';

-- ✅ Done! Now the upsert operation will work
