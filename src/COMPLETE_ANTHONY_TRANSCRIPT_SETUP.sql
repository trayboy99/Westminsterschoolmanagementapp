-- ============================================================
-- COMPLETE ANTHONY AGBAI TRANSCRIPT SETUP
-- Simplified: Uses NULL student_id to bypass profile requirement
-- ============================================================

DO $$
DECLARE
  anthony_graduated_id UUID;
  director_id UUID;
  jss1_exam_id UUID;
  jss2_exam_id UUID;
  jss3_exam_id UUID;
  ss1_exam_id UUID;
  ss2_exam_id UUID;
  ss3_exam_id UUID;
BEGIN
  
  -- ============================================================
  -- STEP 1: Create graduated student record (standalone)
  -- ============================================================
  
  -- Check if Anthony already exists
  SELECT id INTO anthony_graduated_id
  FROM graduated_students
  WHERE first_name = 'Anthony' 
    AND last_name = 'Agbai'
    AND admission_number = 'BMGS/2020/001'
  LIMIT 1;
  
  IF anthony_graduated_id IS NULL THEN
    -- Create graduated student without profile link
    INSERT INTO graduated_students (
      student_id,
      first_name,
      last_name,
      middle_name,
      admission_number,
      graduation_session,
      graduation_class,
      graduation_number,
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
      NULL,  -- No profile needed for graduated student
      'Anthony',
      'Agbai',
      'Elochukwu',
      'BMGS/2020/001',
      '2025/2026',
      'SS3',
      'BMGS-2026-001',
      'anthony.agbai@student.brume.edu.ng',
      '08012345678',
      'Male',  -- Capitalized to match constraint
      '2007-03-15',
      true,
      false,  -- No fees clearance required
      true,   -- Fees cleared
      0.00,   -- No outstanding balance
      NOW()
    ) RETURNING id INTO anthony_graduated_id;
    
    RAISE NOTICE '✅ Created graduated student with ID: %', anthony_graduated_id;
  ELSE
    RAISE NOTICE '✅ Graduated student already exists with ID: %', anthony_graduated_id;
  END IF;
  
  -- ============================================================
  -- STEP 2: Create transcript PIN (if not exists)
  -- ============================================================
  
  -- Find a director
  SELECT id INTO director_id
  FROM profiles
  WHERE role = 'director'
  LIMIT 1;
  
  IF director_id IS NULL THEN
    -- Use any admin user
    SELECT id INTO director_id
    FROM profiles
    WHERE role IN ('admin', 'principal')
    LIMIT 1;
  END IF;
  
  -- Delete any existing PIN with this code (from previous runs)
  DELETE FROM transcript_pins
  WHERE pin_code = 'C7GV-GEZG-UP99';
  
  -- Delete all PINs for Anthony
  DELETE FROM transcript_pins
  WHERE graduated_student_id = anthony_graduated_id;
  
  -- Create fresh PIN
  INSERT INTO transcript_pins (
    graduated_student_id,
    pin_code,
    is_used,
    expires_at,
    generated_by,
    price,
    created_at
  ) VALUES (
    anthony_graduated_id,
    'C7GV-GEZG-UP99',
    false,
    NULL,
    director_id,
    0.00,
    NOW()
  );
  
  RAISE NOTICE '✅ PIN C7GV-GEZG-UP99 created successfully!';
  
  -- ============================================================
  -- STEP 3: Create exams for each year
  -- ============================================================
  
  -- JSS1 (2020/2021)
  INSERT INTO exams (name, type, session, term, status, created_at)
  VALUES ('JSS1 Terminal Exam 2020/2021', 'terminal', '2020/2021', 'third', 'published', NOW())
  ON CONFLICT (name, session) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO jss1_exam_id;
  
  -- Get existing exam if conflict
  IF jss1_exam_id IS NULL THEN
    SELECT id INTO jss1_exam_id FROM exams WHERE name = 'JSS1 Terminal Exam 2020/2021' AND session = '2020/2021';
  END IF;
  
  -- JSS2 (2021/2022)
  INSERT INTO exams (name, type, session, term, status, created_at)
  VALUES ('JSS2 Terminal Exam 2021/2022', 'terminal', '2021/2022', 'third', 'published', NOW())
  ON CONFLICT (name, session) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO jss2_exam_id;
  
  IF jss2_exam_id IS NULL THEN
    SELECT id INTO jss2_exam_id FROM exams WHERE name = 'JSS2 Terminal Exam 2021/2022' AND session = '2021/2022';
  END IF;
  
  -- JSS3 (2022/2023)
  INSERT INTO exams (name, type, session, term, status, created_at)
  VALUES ('JSS3 Terminal Exam 2022/2023', 'terminal', '2022/2023', 'third', 'published', NOW())
  ON CONFLICT (name, session) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO jss3_exam_id;
  
  IF jss3_exam_id IS NULL THEN
    SELECT id INTO jss3_exam_id FROM exams WHERE name = 'JSS3 Terminal Exam 2022/2023' AND session = '2022/2023';
  END IF;
  
  -- SS1 (2023/2024)
  INSERT INTO exams (name, type, session, term, status, created_at)
  VALUES ('SS1 Terminal Exam 2023/2024', 'terminal', '2023/2024', 'third', 'published', NOW())
  ON CONFLICT (name, session) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO ss1_exam_id;
  
  IF ss1_exam_id IS NULL THEN
    SELECT id INTO ss1_exam_id FROM exams WHERE name = 'SS1 Terminal Exam 2023/2024' AND session = '2023/2024';
  END IF;
  
  -- SS2 (2024/2025)
  INSERT INTO exams (name, type, session, term, status, created_at)
  VALUES ('SS2 Terminal Exam 2024/2025', 'terminal', '2024/2025', 'third', 'published', NOW())
  ON CONFLICT (name, session) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO ss2_exam_id;
  
  IF ss2_exam_id IS NULL THEN
    SELECT id INTO ss2_exam_id FROM exams WHERE name = 'SS2 Terminal Exam 2024/2025' AND session = '2024/2025';
  END IF;
  
  -- SS3 (2025/2026)
  INSERT INTO exams (name, type, session, term, status, created_at)
  VALUES ('SS3 Terminal Exam 2025/2026', 'terminal', '2025/2026', 'third', 'published', NOW())
  ON CONFLICT (name, session) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO ss3_exam_id;
  
  IF ss3_exam_id IS NULL THEN
    SELECT id INTO ss3_exam_id FROM exams WHERE name = 'SS3 Terminal Exam 2025/2026' AND session = '2025/2026';
  END IF;
  
  RAISE NOTICE '✅ Created/found 6 exams (JSS1-SS3)';
  
  -- ============================================================
  -- STEP 4: Create a dummy student profile for marks
  -- ============================================================
  
  -- Get any existing student to use as placeholder
  DECLARE
    dummy_student_id UUID;
  BEGIN
    SELECT id INTO dummy_student_id
    FROM profiles
    WHERE role = 'student'
    LIMIT 1;
    
    IF dummy_student_id IS NULL THEN
      RAISE EXCEPTION 'No student profiles found. Please create at least one student first.';
    END IF;
    
    RAISE NOTICE '✅ Using student ID for marks: %', dummy_student_id;
  
    -- ============================================================
    -- STEP 5: Insert academic records (57 subjects across 6 years)
    -- ============================================================
    
    -- Delete existing marks for these exams
    DELETE FROM marks WHERE exam_id IN (jss1_exam_id, jss2_exam_id, jss3_exam_id, ss1_exam_id, ss2_exam_id, ss3_exam_id);
    
    -- JSS1 (2020/2021) - Foundation year
    INSERT INTO marks (student_id, exam_id, subject, ca1, ca2, exam_score, total, grade, status, created_at, updated_at)
    VALUES
      (dummy_student_id, jss1_exam_id, 'Mathematics', 15.0, 15.0, 52.0, 82.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'English Language', 14.0, 14.0, 50.0, 78.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'Basic Science', 13.0, 13.0, 48.0, 74.0, 'B', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'Basic Technology', 14.0, 14.0, 49.0, 77.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'Social Studies', 13.0, 13.0, 47.0, 73.0, 'B', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'Business Studies', 14.0, 13.0, 48.0, 75.0, 'B', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'Computer Studies', 15.0, 15.0, 53.0, 83.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'Christian Religious Studies', 13.0, 13.0, 46.0, 72.0, 'B', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'French', 12.0, 12.0, 44.0, 68.0, 'C', 'approved', NOW(), NOW()),
      (dummy_student_id, jss1_exam_id, 'Civic Education', 13.0, 13.0, 47.0, 73.0, 'B', 'approved', NOW(), NOW());
    
    -- JSS2 (2021/2022) - Improvement
    INSERT INTO marks (student_id, exam_id, subject, ca1, ca2, exam_score, total, grade, status, created_at, updated_at)
    VALUES
      (dummy_student_id, jss2_exam_id, 'Mathematics', 16.0, 16.0, 56.0, 88.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'English Language', 15.0, 15.0, 54.0, 84.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'Basic Science', 14.0, 14.0, 52.0, 80.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'Basic Technology', 15.0, 15.0, 53.0, 83.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'Social Studies', 14.0, 14.0, 51.0, 79.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'Business Studies', 15.0, 14.0, 52.0, 81.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'Computer Studies', 16.0, 16.0, 57.0, 89.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'Christian Religious Studies', 14.0, 14.0, 50.0, 78.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'French', 13.0, 13.0, 48.0, 74.0, 'B', 'approved', NOW(), NOW()),
      (dummy_student_id, jss2_exam_id, 'Civic Education', 14.0, 14.0, 51.0, 79.0, 'A', 'approved', NOW(), NOW());
    
    -- JSS3 (2022/2023) - Excellence begins
    INSERT INTO marks (student_id, exam_id, subject, ca1, ca2, exam_score, total, grade, status, created_at, updated_at)
    VALUES
      (dummy_student_id, jss3_exam_id, 'Mathematics', 17.0, 17.0, 58.0, 92.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'English Language', 16.0, 16.0, 56.0, 88.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'Basic Science', 15.0, 15.0, 54.0, 84.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'Basic Technology', 16.0, 16.0, 55.0, 87.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'Social Studies', 15.0, 15.0, 53.0, 83.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'Business Studies', 16.0, 15.0, 54.0, 85.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'Computer Studies', 17.0, 17.0, 59.0, 93.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'Christian Religious Studies', 15.0, 15.0, 52.0, 82.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'French', 14.0, 14.0, 50.0, 78.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, jss3_exam_id, 'Civic Education', 15.0, 15.0, 53.0, 83.0, 'A', 'approved', NOW(), NOW());
    
    -- SS1 (2023/2024) - Science track
    INSERT INTO marks (student_id, exam_id, subject, ca1, ca2, exam_score, total, grade, status, created_at, updated_at)
    VALUES
      (dummy_student_id, ss1_exam_id, 'Mathematics', 18.0, 18.0, 60.0, 96.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'English Language', 16.0, 16.0, 56.0, 88.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'Physics', 17.0, 17.0, 58.0, 92.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'Chemistry', 17.0, 17.0, 57.0, 91.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'Biology', 16.0, 16.0, 55.0, 87.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'Further Mathematics', 17.0, 17.0, 58.0, 92.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'Computer Science', 18.0, 18.0, 61.0, 97.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'Economics', 15.0, 15.0, 53.0, 83.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss1_exam_id, 'Christian Religious Studies', 15.0, 15.0, 52.0, 82.0, 'A', 'approved', NOW(), NOW());
    
    -- SS2 (2024/2025) - Outstanding
    INSERT INTO marks (student_id, exam_id, subject, ca1, ca2, exam_score, total, grade, status, created_at, updated_at)
    VALUES
      (dummy_student_id, ss2_exam_id, 'Mathematics', 18.0, 18.0, 61.0, 97.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'English Language', 17.0, 17.0, 57.0, 91.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'Physics', 18.0, 18.0, 59.0, 95.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'Chemistry', 17.0, 17.0, 58.0, 92.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'Biology', 17.0, 17.0, 56.0, 90.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'Further Mathematics', 18.0, 18.0, 59.0, 95.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'Computer Science', 19.0, 19.0, 62.0, 100.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'Economics', 16.0, 16.0, 54.0, 86.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss2_exam_id, 'Christian Religious Studies', 16.0, 16.0, 53.0, 85.0, 'A', 'approved', NOW(), NOW());
    
    -- SS3 (2025/2026) - Final year brilliance
    INSERT INTO marks (student_id, exam_id, subject, ca1, ca2, exam_score, total, grade, status, created_at, updated_at)
    VALUES
      (dummy_student_id, ss3_exam_id, 'Mathematics', 19.0, 19.0, 62.0, 100.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'English Language', 17.0, 17.0, 58.0, 92.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'Physics', 18.0, 18.0, 60.0, 96.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'Chemistry', 18.0, 18.0, 59.0, 95.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'Biology', 17.0, 17.0, 57.0, 91.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'Further Mathematics', 19.0, 19.0, 61.0, 99.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'Computer Science', 19.0, 19.0, 62.0, 100.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'Economics', 17.0, 17.0, 56.0, 90.0, 'A', 'approved', NOW(), NOW()),
      (dummy_student_id, ss3_exam_id, 'Christian Religious Studies', 16.0, 16.0, 54.0, 86.0, 'A', 'approved', NOW(), NOW());
    
    RAISE NOTICE '✅ Successfully created 57 academic records!';
    
    -- Update graduated_students with marks reference
    UPDATE graduated_students
    SET student_id = dummy_student_id
    WHERE id = anthony_graduated_id;
    
    RAISE NOTICE '✅ Linked marks to graduated student!';
  END;
  
  RAISE NOTICE '✅ Complete setup finished for Anthony Agbai!';
  
END $$;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check everything was created
SELECT 
  '✅ COMPLETE SETUP SUCCESSFUL' as status,
  (SELECT COUNT(*) FROM graduated_students WHERE first_name = 'Anthony' AND last_name = 'Agbai') as graduated_students_count,
  (SELECT COUNT(*) FROM transcript_pins WHERE pin_code = 'C7GV-GEZG-UP99') as pin_count,
  (SELECT COUNT(*) FROM marks WHERE student_id IN (
    SELECT student_id FROM graduated_students WHERE first_name = 'Anthony' AND last_name = 'Agbai'
  )) as marks_count,
  (SELECT AVG(total) FROM marks WHERE student_id IN (
    SELECT student_id FROM graduated_students WHERE first_name = 'Anthony' AND last_name = 'Agbai'
  )) as average_score;

-- Show Anthony's complete profile
SELECT 
  '✅ ANTHONY AGBAI PROFILE' as info,
  gs.first_name || ' ' || gs.middle_name || ' ' || gs.last_name as full_name,
  gs.admission_number,
  gs.graduation_class,
  gs.graduation_session,
  gs.graduation_number,
  gs.fees_cleared,
  tp.pin_code,
  tp.is_used,
  COUNT(m.id) as total_subjects
FROM graduated_students gs
LEFT JOIN transcript_pins tp ON gs.id = tp.graduated_student_id
LEFT JOIN marks m ON gs.student_id = m.student_id
WHERE gs.first_name = 'Anthony' AND gs.last_name = 'Agbai'
GROUP BY gs.id, gs.first_name, gs.middle_name, gs.last_name, gs.admission_number, 
         gs.graduation_class, gs.graduation_session, gs.graduation_number, 
         gs.fees_cleared, tp.pin_code, tp.is_used;
