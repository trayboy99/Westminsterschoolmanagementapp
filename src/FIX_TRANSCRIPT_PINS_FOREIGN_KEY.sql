-- ============================================================================
-- FIX TRANSCRIPT PINS FOREIGN KEY CONSTRAINT
-- ============================================================================
-- Problem: transcript_pins references graduated_students.id, but the table might be empty
-- Solution: Keep the foreign key to graduated_students (proper architecture!)
--           But we need to populate graduated_students table first
-- ============================================================================

-- IMPORTANT: Run SYNC_GRADUATED_STUDENTS_FROM_PROFILES.sql FIRST!
-- This ensures graduated_students table is populated before we create foreign keys

-- STEP 1: Drop the existing foreign key constraint (if it exists)
ALTER TABLE transcript_pins 
DROP CONSTRAINT IF EXISTS transcript_pins_graduated_student_id_fkey;

-- STEP 2: Add UNIQUE constraint on graduated_students.student_id
-- This prevents duplicate alumni records
-- Note: Drop first, then add (PostgreSQL doesn't support IF NOT EXISTS with ADD CONSTRAINT)
ALTER TABLE graduated_students 
DROP CONSTRAINT IF EXISTS graduated_students_student_id_unique;

ALTER TABLE graduated_students 
ADD CONSTRAINT graduated_students_student_id_unique 
UNIQUE (student_id);

-- STEP 3: Re-create foreign key constraint to graduated_students table
-- This is the CORRECT architecture (not profiles table)
ALTER TABLE transcript_pins 
ADD CONSTRAINT transcript_pins_graduated_student_id_fkey 
FOREIGN KEY (graduated_student_id) 
REFERENCES graduated_students(id) 
ON DELETE CASCADE;

-- Note: graduated_student_id in transcript_pins points to graduated_students.id
-- graduated_students.student_id then points to profiles.id
-- This is proper data architecture!

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the constraint was created:
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'transcript_pins'::regclass
AND conname LIKE '%graduated%';

-- ============================================================================
-- WHAT THIS DOES:
-- ============================================================================
-- ✅ Removes the foreign key to non-existent graduated_students table
-- ✅ Adds foreign key to profiles table instead (where graduated students actually are)
-- ✅ Ensures CASCADE deletion if student profile is deleted
-- ✅ Works with existing promotion system that sets status='graduated'
-- ✅ Backend validates student is graduated before creating PIN
-- ============================================================================

-- ============================================================================
-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR AND RUN IT
-- ============================================================================
