-- ============================================================
-- ANTHONY AGBAI TRANSCRIPT SETUP - DECEMBER 2024
-- ⚠️ RUN THIS FILE - NOT ANY OTHER ANTHONY FILES
-- This file DOES NOT create subjects - uses your existing ones
-- ============================================================

DO $$
DECLARE
  anthony_graduated_id UUID;
  director_id UUID;
  dummy_student_id UUID;
  dummy_class_id UUID;
  
  jss1_exam_id UUID;
  jss2_exam_id UUID;
  jss3_exam_id UUID;
  ss1_exam_id UUID;
  ss2_exam_id UUID;
  ss3_exam_id UUID;
  
  subject_ids UUID[];
  subject_id UUID;
  marks_count INT := 0;
  
BEGIN
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'ANTHONY AGBAI TRANSCRIPT SETUP STARTING';
  RAISE NOTICE '==========================================';
  
  -- ============================================================
  -- STEP 1: Create graduated student record
  -- ============================================================
  
  SELECT id INTO anthony_graduated_id
  FROM graduated_students
  WHERE first_name = 'Anthony' 
    AND last_name = 'Agbai'
    AND admission_number = 'BMGS/2020/001'
  LIMIT 1;
  
  IF anthony_graduated_id IS NULL THEN
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
      NULL,
      'Anthony',
      'Agbai',
      'Elochukwu',
      'BMGS/2020/001',
      '2025/2026',
      'SS3',
      'BMGS-2026-001',
      'anthony.agbai@student.brume.edu.ng',
      '08012345678',
      'Male',
      '2007-03-15',
      true,
      false,
      true,
      0.00,
      NOW()
    ) RETURNING id INTO anthony_graduated_id;
    
    RAISE NOTICE '✅ Created graduated student with ID: %', anthony_graduated_id;
  ELSE
    RAISE NOTICE '✅ Graduated student already exists with ID: %', anthony_graduated_id;
  END IF;
  
  -- ============================================================
  -- STEP 2: Create transcript PIN
  -- ============================================================
  
  SELECT id INTO director_id
  FROM profiles
  WHERE role IN ('director', 'admin', 'principal')
  LIMIT 1;
  
  IF director_id IS NULL THEN
    RAISE NOTICE '⚠️ No director/admin found - using first user';
    SELECT id INTO director_id FROM profiles LIMIT 1;
  END IF;
  
  -- Delete existing PIN
  DELETE FROM transcript_pins WHERE pin_code = 'C7GV-GEZG-UP99';
  RAISE NOTICE '✅ Deleted old PIN if it existed';
  
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
  
  RAISE NOTICE '✅ PIN C7GV-GEZG-UP99 created!';
  
  -- ============================================================
  -- STEP 3: Create exams
  -- ============================================================
  
  INSERT INTO exams (name, term, session, status, created_at)
  VALUES ('JSS1 Terminal 2020/2021', 'Third Term', '2020/2021', 'completed', NOW())
  RETURNING id INTO jss1_exam_id;
  
  INSERT INTO exams (name, term, session, status, created_at)
  VALUES ('JSS2 Terminal 2021/2022', 'Third Term', '2021/2022', 'completed', NOW())
  RETURNING id INTO jss2_exam_id;
  
  INSERT INTO exams (name, term, session, status, created_at)
  VALUES ('JSS3 Terminal 2022/2023', 'Third Term', '2022/2023', 'completed', NOW())
  RETURNING id INTO jss3_exam_id;
  
  INSERT INTO exams (name, term, session, status, created_at)
  VALUES ('SS1 Terminal 2023/2024', 'Third Term', '2023/2024', 'completed', NOW())
  RETURNING id INTO ss1_exam_id;
  
  INSERT INTO exams (name, term, session, status, created_at)
  VALUES ('SS2 Terminal 2024/2025', 'Third Term', '2024/2025', 'completed', NOW())
  RETURNING id INTO ss2_exam_id;
  
  INSERT INTO exams (name, term, session, status, created_at)
  VALUES ('SS3 Terminal 2025/2026', 'Third Term', '2025/2026', 'completed', NOW())
  RETURNING id INTO ss3_exam_id;
  
  RAISE NOTICE '✅ Created 6 exams!';
  
  -- ============================================================
  -- STEP 4: Get a student profile and class
  -- ============================================================
  
  SELECT id INTO dummy_student_id
  FROM profiles
  WHERE role = 'student'
  LIMIT 1;
  
  IF dummy_student_id IS NULL THEN
    RAISE EXCEPTION '❌ No student found. Please create at least one student first.';
  END IF;
  
  SELECT id INTO dummy_class_id
  FROM classes
  LIMIT 1;
  
  IF dummy_class_id IS NULL THEN
    RAISE EXCEPTION '❌ No class found. Please create at least one class first.';
  END IF;
  
  RAISE NOTICE '✅ Using student ID: %', dummy_student_id;
  RAISE NOTICE '✅ Using class ID: %', dummy_class_id;
  
  -- ============================================================
  -- STEP 5: Get existing subject IDs from YOUR database
  -- ============================================================
  
  SELECT ARRAY_AGG(id) INTO subject_ids
  FROM subjects
  LIMIT 15;
  
  IF subject_ids IS NULL OR array_length(subject_ids, 1) = 0 THEN
    RAISE EXCEPTION '❌ No subjects found. Please create at least one subject first.';
  END IF;
  
  RAISE NOTICE '✅ Found % subjects in database', array_length(subject_ids, 1);
  
  -- ============================================================
  -- STEP 6: Create marks using YOUR existing subjects
  -- ============================================================
  
  -- JSS1 (2020/2021) - 10 subjects
  FOREACH subject_id IN ARRAY subject_ids[1:LEAST(10, array_length(subject_ids, 1))]
  LOOP
    INSERT INTO marks (student_id, exam_id, subject_id, class_id, type, terminal_ca1, terminal_ca2, terminal_exam, terminal_total, status)
    VALUES (dummy_student_id, jss1_exam_id, subject_id, dummy_class_id, 'terminal', 
            13 + floor(random() * 5)::int, 
            13 + floor(random() * 5)::int, 
            46 + floor(random() * 14)::int, 
            72 + floor(random() * 18)::int, 
            'approved');
    marks_count := marks_count + 1;
  END LOOP;
  
  -- JSS2 (2021/2022) - 10 subjects
  FOREACH subject_id IN ARRAY subject_ids[1:LEAST(10, array_length(subject_ids, 1))]
  LOOP
    INSERT INTO marks (student_id, exam_id, subject_id, class_id, type, terminal_ca1, terminal_ca2, terminal_exam, terminal_total, status)
    VALUES (dummy_student_id, jss2_exam_id, subject_id, dummy_class_id, 'terminal', 
            14 + floor(random() * 5)::int, 
            14 + floor(random() * 5)::int, 
            50 + floor(random() * 12)::int, 
            78 + floor(random() * 15)::int, 
            'approved');
    marks_count := marks_count + 1;
  END LOOP;
  
  -- JSS3 (2022/2023) - 10 subjects
  FOREACH subject_id IN ARRAY subject_ids[1:LEAST(10, array_length(subject_ids, 1))]
  LOOP
    INSERT INTO marks (student_id, exam_id, subject_id, class_id, type, terminal_ca1, terminal_ca2, terminal_exam, terminal_total, status)
    VALUES (dummy_student_id, jss3_exam_id, subject_id, dummy_class_id, 'terminal', 
            15 + floor(random() * 4)::int, 
            15 + floor(random() * 4)::int, 
            52 + floor(random() * 10)::int, 
            82 + floor(random() * 12)::int, 
            'approved');
    marks_count := marks_count + 1;
  END LOOP;
  
  -- SS1 (2023/2024) - 9 subjects
  FOREACH subject_id IN ARRAY subject_ids[1:LEAST(9, array_length(subject_ids, 1))]
  LOOP
    INSERT INTO marks (student_id, exam_id, subject_id, class_id, type, terminal_ca1, terminal_ca2, terminal_exam, terminal_total, status)
    VALUES (dummy_student_id, ss1_exam_id, subject_id, dummy_class_id, 'terminal', 
            16 + floor(random() * 3)::int, 
            16 + floor(random() * 3)::int, 
            54 + floor(random() * 8)::int, 
            86 + floor(random() * 10)::int, 
            'approved');
    marks_count := marks_count + 1;
  END LOOP;
  
  -- SS2 (2024/2025) - 9 subjects
  FOREACH subject_id IN ARRAY subject_ids[1:LEAST(9, array_length(subject_ids, 1))]
  LOOP
    INSERT INTO marks (student_id, exam_id, subject_id, class_id, type, terminal_ca1, terminal_ca2, terminal_exam, terminal_total, status)
    VALUES (dummy_student_id, ss2_exam_id, subject_id, dummy_class_id, 'terminal', 
            17 + floor(random() * 2)::int, 
            17 + floor(random() * 2)::int, 
            56 + floor(random() * 6)::int, 
            90 + floor(random() * 8)::int, 
            'approved');
    marks_count := marks_count + 1;
  END LOOP;
  
  -- SS3 (2025/2026) - 9 subjects (Best scores)
  FOREACH subject_id IN ARRAY subject_ids[1:LEAST(9, array_length(subject_ids, 1))]
  LOOP
    INSERT INTO marks (student_id, exam_id, subject_id, class_id, type, terminal_ca1, terminal_ca2, terminal_exam, terminal_total, status)
    VALUES (dummy_student_id, ss3_exam_id, subject_id, dummy_class_id, 'terminal', 
            18 + floor(random() * 1)::int, 
            18 + floor(random() * 1)::int, 
            58 + floor(random() * 4)::int, 
            94 + floor(random() * 6)::int, 
            'approved');
    marks_count := marks_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Created % marks records!', marks_count;
  
  -- Link marks to graduated student
  UPDATE graduated_students
  SET student_id = dummy_student_id
  WHERE id = anthony_graduated_id;
  
  RAISE NOTICE '✅ Linked student to graduated record';
  
  -- ============================================================
  -- FINAL SUCCESS MESSAGE
  -- ============================================================
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅✅✅ SETUP COMPLETE! ✅✅✅';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Anthony Agbai transcript is ready!';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST IN ALUMNI PORTAL:';
  RAISE NOTICE 'First Name: Anthony';
  RAISE NOTICE 'Last Name: Agbai';
  RAISE NOTICE 'PIN: C7GV-GEZG-UP99';
  RAISE NOTICE '';
  RAISE NOTICE 'Graduated Student ID: %', anthony_graduated_id;
  RAISE NOTICE 'Student Profile ID: %', dummy_student_id;
  RAISE NOTICE 'Total Marks Created: %', marks_count;
  RAISE NOTICE '==========================================';
  
END $$;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

SELECT 
  '🎓 ANTHONY TRANSCRIPT SETUP COMPLETE!' as message,
  (SELECT COUNT(*) FROM graduated_students WHERE first_name = 'Anthony' AND last_name = 'Agbai') as graduated_student_exists,
  (SELECT COUNT(*) FROM transcript_pins WHERE pin_code = 'C7GV-GEZG-UP99') as pin_exists,
  (SELECT COUNT(*) FROM exams WHERE session IN ('2020/2021', '2021/2022', '2022/2023', '2023/2024', '2024/2025', '2025/2026')) as exams_created,
  (SELECT COUNT(*) FROM marks WHERE student_id IN (
    SELECT student_id FROM graduated_students WHERE first_name = 'Anthony' AND student_id IS NOT NULL
  )) as marks_created;
