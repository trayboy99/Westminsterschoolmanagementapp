-- ============================================================
-- STEP 1: CREATE ANTHONY AGBAI AS GRADUATED STUDENT
-- ============================================================
-- This creates the graduated student record first
-- Then we can add academic data
-- ============================================================

-- First, check if a student profile exists for Anthony
DO $$
DECLARE
  anthony_student_id UUID;
  anthony_graduated_id UUID;
BEGIN
  -- Try to find Anthony in profiles table
  SELECT id INTO anthony_student_id
  FROM profiles
  WHERE first_name ILIKE '%anthony%' 
    AND last_name ILIKE '%agbai%'
    AND role = 'student'
  LIMIT 1;

  -- If no student profile exists, create one
  IF anthony_student_id IS NULL THEN
    RAISE NOTICE 'Creating new student profile for Anthony Agbai...';
    
    INSERT INTO profiles (
      id,
      email,
      role,
      first_name,
      middle_name,
      last_name,
      gender,
      phone,
      address,
      date_of_birth,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'anthony.agbai@example.com',
      'student',
      'Anthony',
      'Elochukwu',
      'Agbai',
      'male',
      '+234 801 234 5678',
      'Irhirhi Town, Ughelli South',
      '2008-03-15',
      NOW()
    )
    RETURNING id INTO anthony_student_id;
    
    RAISE NOTICE '✅ Created student profile with ID: %', anthony_student_id;
  ELSE
    RAISE NOTICE '✅ Found existing student profile with ID: %', anthony_student_id;
  END IF;

  -- Check if graduated student record exists
  SELECT id INTO anthony_graduated_id
  FROM graduated_students
  WHERE student_id = anthony_student_id;

  -- If no graduated student record, create one
  IF anthony_graduated_id IS NULL THEN
    RAISE NOTICE 'Creating graduated student record...';
    
    INSERT INTO graduated_students (
      student_id,
      first_name,
      middle_name,
      last_name,
      admission_number,
      graduation_session,
      graduation_class,
      graduation_number,
      graduation_date,
      email,
      phone,
      gender,
      date_of_birth,
      is_active,
      fees_clearance_required,
      fees_cleared,
      outstanding_balance,
      created_at
    ) VALUES (
      anthony_student_id,
      'Anthony',
      'Elochukwu',
      'Agbai',
      'BMGS/2020/001',
      '2025/2026',
      'SS3',
      'GS/2026/001',
      '2026-07-15',
      'anthony.agbai@example.com',
      '+234 801 234 5678',
      'male',
      '2008-03-15',
      true,
      false,  -- No fees clearance required (scholarship student)
      true,   -- Fees cleared
      0.00,   -- No outstanding balance
      NOW()
    )
    RETURNING id INTO anthony_graduated_id;
    
    RAISE NOTICE '✅ Created graduated student record with ID: %', anthony_graduated_id;
  ELSE
    RAISE NOTICE '✅ Graduated student record already exists with ID: %', anthony_graduated_id;
  END IF;

END $$;

-- Verify the setup
SELECT 
  '✅ ANTHONY AGBAI SETUP COMPLETE' as status,
  p.id as student_id,
  p.first_name || ' ' || p.middle_name || ' ' || p.last_name as full_name,
  p.email,
  gs.id as graduated_student_id,
  gs.admission_number,
  gs.graduation_class,
  gs.graduation_session,
  gs.graduation_number,
  gs.fees_cleared,
  gs.is_active
FROM profiles p
JOIN graduated_students gs ON p.id = gs.student_id
WHERE p.first_name ILIKE '%anthony%' AND p.last_name ILIKE '%agbai%';

-- ============================================================
-- EXPECTED OUTPUT:
-- status: ✅ ANTHONY AGBAI SETUP COMPLETE
-- student_id: [UUID]
-- full_name: Anthony Elochukwu Agbai
-- admission_number: BMGS/2020/001
-- graduation_class: SS3
-- graduation_session: 2025/2026
-- fees_cleared: true
-- is_active: true
-- ============================================================
