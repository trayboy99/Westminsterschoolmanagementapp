-- ============================================================================
-- SYNC GRADUATED STUDENTS FROM PROFILES TO GRADUATED_STUDENTS TABLE
-- ============================================================================
-- This migrates all students with status='graduated' from profiles table
-- to the proper graduated_students table with full metadata
-- ============================================================================

-- STEP 0: Add UNIQUE constraint FIRST (required for ON CONFLICT to work)
-- This ensures each student can only have ONE graduated_students record
ALTER TABLE graduated_students 
DROP CONSTRAINT IF EXISTS graduated_students_student_id_unique;

ALTER TABLE graduated_students 
ADD CONSTRAINT graduated_students_student_id_unique 
UNIQUE (student_id);

-- STEP 1: Check how many graduated students we have in profiles
SELECT 
  COUNT(*) as total_graduated_students,
  COUNT(DISTINCT graduation_session) as unique_sessions
FROM profiles
WHERE role = 'student' AND status = 'graduated';

-- STEP 2: Preview the data we'll migrate
SELECT 
  id,
  first_name,
  last_name,
  middle_name,
  admission_number,
  email,
  phone,
  gender,
  date_of_birth,
  graduation_session,
  class_id
FROM profiles
WHERE role = 'student' AND status = 'graduated'
ORDER BY graduation_session DESC, last_name, first_name
LIMIT 20;

-- STEP 3: Sync graduated students with promotion data
-- This INSERT will fail if graduated_students already has records for these students
-- Use ON CONFLICT to handle duplicates

INSERT INTO graduated_students (
  student_id,
  first_name,
  last_name,
  middle_name,
  admission_number,
  graduation_session,
  graduation_class,
  graduation_date,
  email,
  phone,
  gender,
  date_of_birth,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  is_active
)
SELECT 
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.middle_name,
  p.admission_number,
  COALESCE(p.graduation_session, 'Unknown') as graduation_session,
  COALESCE(c.name, 'SS3') as graduation_class,
  COALESCE(pr.promoted_at, NOW()) as graduation_date,
  p.email,
  p.phone,
  p.gender,
  p.date_of_birth,
  true as fees_clearance_required,
  false as fees_cleared,
  0.00 as outstanding_balance,
  true as is_active
FROM profiles p
LEFT JOIN classes c ON p.class_id = c.id
LEFT JOIN promotions pr ON pr.student_id = p.id 
  AND pr.is_graduation = true 
  AND pr.is_reverted = false
WHERE p.role = 'student' 
  AND p.status = 'graduated'
ON CONFLICT (student_id) 
DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  middle_name = EXCLUDED.middle_name,
  admission_number = EXCLUDED.admission_number,
  graduation_session = EXCLUDED.graduation_session,
  graduation_class = EXCLUDED.graduation_class,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gender = EXCLUDED.gender,
  date_of_birth = EXCLUDED.date_of_birth,
  updated_at = NOW();

-- STEP 4: Verify the sync worked
SELECT 
  COUNT(*) as total_in_graduated_students,
  COUNT(DISTINCT graduation_session) as unique_sessions,
  COUNT(CASE WHEN fees_cleared = true THEN 1 END) as fees_cleared_count,
  COUNT(CASE WHEN fees_clearance_required = false THEN 1 END) as no_clearance_required
FROM graduated_students;

-- STEP 5: Show sample of synced data
SELECT 
  gs.id,
  gs.first_name,
  gs.last_name,
  gs.graduation_class,
  gs.graduation_session,
  gs.graduation_date,
  gs.fees_cleared,
  gs.outstanding_balance,
  gs.is_active
FROM graduated_students gs
ORDER BY gs.graduation_date DESC
LIMIT 20;

-- STEP 6: Check for any students in profiles.graduated but not in graduated_students
-- This should return 0 rows after sync
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.graduation_session
FROM profiles p
WHERE p.role = 'student' 
  AND p.status = 'graduated'
  AND NOT EXISTS (
    SELECT 1 FROM graduated_students gs 
    WHERE gs.student_id = p.id
  );

-- ============================================================================
-- WHAT THIS DOES:
-- ============================================================================
-- ✅ Finds all profiles with role='student' AND status='graduated'
-- ✅ Creates graduated_students records with full metadata
-- ✅ Links to promotion history to get correct graduation date
-- ✅ Handles duplicates with ON CONFLICT (updates existing records)
-- ✅ Sets default fees_clearance_required=true, fees_cleared=false
-- ✅ Preserves all student data (name, email, phone, gender, DOB)
-- ============================================================================

-- ============================================================================
-- AFTER RUNNING THIS:
-- ============================================================================
-- 1. The graduated_students table will be populated with all alumni
-- 2. Foreign keys in transcript_pins will work (after we fix the constraint)
-- 3. TranscriptPinManagement will be able to fetch from graduated_students
-- 4. Future promotions will automatically create graduated_students records
-- ============================================================================

-- ============================================================================
-- WHAT THIS DOES:
-- ============================================================================
-- ✅ FIRST: Adds UNIQUE constraint on student_id (required for ON CONFLICT!)
-- ✅ Finds all profiles with role='student' AND status='graduated'
-- ✅ Creates graduated_students records with full metadata
-- ✅ Links to promotion history to get correct graduation date
-- ✅ Handles duplicates with ON CONFLICT (updates existing records)
-- ✅ Sets default fees_clearance_required=true, fees_cleared=false
-- ✅ Preserves all student data (name, email, phone, gender, DOB)
-- ============================================================================
