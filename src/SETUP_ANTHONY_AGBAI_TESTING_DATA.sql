-- =====================================================
-- TESTING DATA FOR ANTHONY ELOCHUKWU AGBAI
-- Graduated Student & Transcript System
-- =====================================================
-- This SQL script sets up complete testing data for:
-- 1. Graduated student record with fees cleared
-- 2. Sample transcript PIN
-- 3. Sample terminal marks for transcript
-- =====================================================

-- =====================================================
-- STEP 1: Update or Insert Anthony Elochukwu Agbai as Graduated Student
-- =====================================================

-- First, check if Anthony already exists in graduated_students table
-- If he does, we'll update him. If not, we'll insert him.

-- Option A: If Anthony already exists, UPDATE his record
UPDATE graduated_students
SET 
  -- Clear his fees for testing
  fees_cleared = true,
  fees_clearance_required = false,  -- Or set to false to skip fees check entirely
  outstanding_balance = 0.00,
  fees_cleared_at = NOW(),
  fees_notes = 'Testing purposes - Fees cleared for transcript access',
  
  -- Ensure he's active
  is_active = true,
  
  -- Set proper graduation details (adjust as needed)
  graduation_session = '2024/2025',  -- Adjust to match your current session
  graduation_class = 'SS3 A',
  graduation_date = NOW(),
  
  -- Add graduation number if missing
  graduation_number = COALESCE(graduation_number, 'GRAD-2025-001'),
  
  -- Ensure contact info is present (optional)
  email = COALESCE(email, 'anthony.agbai@alumni.school.com'),
  phone = COALESCE(phone, '+234-XXX-XXX-XXXX')
  
WHERE 
  first_name ILIKE 'Anthony' 
  AND last_name ILIKE 'Agbai';

-- Option B: If Anthony doesn't exist, INSERT him
-- (This will only run if the UPDATE above affected 0 rows)
INSERT INTO graduated_students (
  first_name,
  middle_name,
  last_name,
  admission_number,
  graduation_number,
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
  fees_cleared_at,
  fees_notes,
  is_active
)
SELECT 
  'Anthony',
  'Elochukwu',
  'Agbai',
  'ADM-2020-001',  -- Sample admission number
  'GRAD-2025-001',  -- Sample graduation number
  '2024/2025',  -- Graduation session
  'SS3 A',  -- Graduation class
  NOW(),  -- Graduation date
  'anthony.agbai@alumni.school.com',  -- Email
  '+234-XXX-XXX-XXXX',  -- Phone
  'Male',  -- Gender
  '2005-01-15'::DATE,  -- Sample date of birth
  false,  -- fees_clearance_required - Set to FALSE to bypass fees check
  true,  -- fees_cleared - Set to TRUE
  0.00,  -- outstanding_balance - Set to 0
  NOW(),  -- fees_cleared_at
  'Testing purposes - Fees cleared for transcript access',  -- fees_notes
  true  -- is_active
WHERE NOT EXISTS (
  SELECT 1 FROM graduated_students 
  WHERE first_name ILIKE 'Anthony' 
  AND last_name ILIKE 'Agbai'
);

-- =====================================================
-- STEP 2: Generate a Test Transcript PIN for Anthony
-- =====================================================

-- First, get Anthony's graduated_student_id
DO $$
DECLARE
  v_alumni_id UUID;
  v_existing_pin UUID;
BEGIN
  -- Get Anthony's ID
  SELECT id INTO v_alumni_id
  FROM graduated_students
  WHERE first_name ILIKE 'Anthony' 
    AND last_name ILIKE 'Agbai'
  LIMIT 1;

  IF v_alumni_id IS NULL THEN
    RAISE NOTICE 'Anthony Agbai not found in graduated_students table';
    RETURN;
  END IF;

  RAISE NOTICE 'Anthony Agbai ID: %', v_alumni_id;

  -- Check if PIN already exists
  SELECT id INTO v_existing_pin
  FROM transcript_pins
  WHERE graduated_student_id = v_alumni_id
    AND is_active = true
  LIMIT 1;

  IF v_existing_pin IS NOT NULL THEN
    RAISE NOTICE 'Active PIN already exists for Anthony. Deactivating old PINs...';
    
    -- Deactivate old PINs
    UPDATE transcript_pins
    SET is_active = false
    WHERE graduated_student_id = v_alumni_id;
  END IF;

  -- Create new PIN
  INSERT INTO transcript_pins (
    pin_code,
    graduated_student_id,
    generated_by,
    price,
    payment_reference,
    expires_at,
    is_active,
    is_used,
    max_uses,
    uses_count
  )
  VALUES (
    'TEST2025',  -- Easy to remember test PIN
    v_alumni_id,
    NULL,  -- Or set to your admin user ID
    0.00,  -- Free for testing
    'TEST-REF-2025',  -- Test payment reference
    NOW() + INTERVAL '365 days',  -- Valid for 1 year
    true,  -- is_active
    false,  -- is_used
    3,  -- max_uses (default from schema)
    0  -- uses_count
  );

  RAISE NOTICE 'Test PIN created: TEST2025 (valid for 1 year)';
END $$;

-- =====================================================
-- STEP 3: Add Sample Terminal Marks for Transcript
-- (Only if marks don't already exist)
-- =====================================================

-- This assumes Anthony has a student_id linked to profiles table
-- and you want to add sample marks for his transcript

-- Note: You'll need to adjust subject_ids and class_id to match your actual data
-- This is just a template - uncomment and modify as needed:

/*
DO $$
DECLARE
  v_student_id UUID;
  v_class_id UUID;
  v_subject_id UUID;
BEGIN
  -- Get Anthony's student_id
  SELECT student_id INTO v_student_id
  FROM graduated_students
  WHERE first_name ILIKE 'Anthony' 
    AND last_name ILIKE 'Agbai'
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE NOTICE 'Anthony does not have a student_id link';
    RETURN;
  END IF;

  -- Get a sample class (adjust as needed)
  SELECT id INTO v_class_id
  FROM classes
  WHERE name = 'SS3 A'
  LIMIT 1;

  -- Insert sample marks for each subject (TERMINAL EXAM TYPE ONLY)
  -- You'll need to loop through subjects or add them manually
  
  -- Example for Mathematics
  SELECT id INTO v_subject_id FROM subjects WHERE name = 'Mathematics' LIMIT 1;
  
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO marks (
      student_id,
      subject_id,
      class_id,
      session,
      term,
      exam_type,
      ca1, ca2, exam, total, grade, remarks
    )
    VALUES (
      v_student_id,
      v_subject_id,
      v_class_id,
      '2024/2025',
      'Terminal',
      'Terminal',
      15.0,  -- CA1 out of 20
      20.0,  -- CA2 out of 20
      55.0,  -- Exam out of 60
      90.0,  -- Total
      'A',
      'Excellent'
    )
    ON CONFLICT (student_id, subject_id, class_id, session, term, exam_type) 
    DO NOTHING;
  END IF;

  RAISE NOTICE 'Sample marks added for Anthony (if subjects exist)';
END $$;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check Anthony's record
SELECT 
  id,
  first_name,
  middle_name,
  last_name,
  admission_number,
  graduation_number,
  graduation_session,
  graduation_class,
  email,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  is_active
FROM graduated_students
WHERE first_name ILIKE 'Anthony' 
  AND last_name ILIKE 'Agbai';

-- Check Anthony's PIN
SELECT 
  tp.pin_code,
  tp.generated_at,
  tp.expires_at,
  tp.is_active,
  tp.is_used,
  tp.uses_count,
  tp.max_uses,
  tp.price,
  gs.first_name,
  gs.last_name
FROM transcript_pins tp
JOIN graduated_students gs ON tp.graduated_student_id = gs.id
WHERE gs.first_name ILIKE 'Anthony' 
  AND gs.last_name ILIKE 'Agbai'
ORDER BY tp.generated_at DESC;

-- =====================================================
-- TESTING CREDENTIALS
-- =====================================================
-- Use these credentials to test the Alumni Transcript Portal:
--
-- ALUMNI LOGIN:
-- First Name: Anthony
-- Last Name: Agbai
-- Graduation Session: 2024/2025 (or whatever you set above)
--
-- TRANSCRIPT PIN:
-- PIN Code: TEST2025
-- Valid Until: 1 year from now
-- Max Uses: 3
--
-- =====================================================
