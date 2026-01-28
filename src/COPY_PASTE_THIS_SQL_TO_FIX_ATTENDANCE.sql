-- ✅ COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR AND CLICK RUN
-- This will fix the ON CONFLICT error

-- Remove any existing duplicates first
DELETE FROM attendance a
USING attendance b
WHERE a.student_id = b.student_id
  AND a.date = b.date
  AND a.id < b.id;

-- Add the unique constraint
ALTER TABLE attendance 
ADD CONSTRAINT attendance_student_date_unique 
UNIQUE (student_id, date);

-- Verify it worked (should return 1 row with constraint_type = 'UNIQUE')
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attendance'
AND constraint_name = 'attendance_student_date_unique';
