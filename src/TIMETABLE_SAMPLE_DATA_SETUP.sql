-- ================================================
-- TIMETABLE SAMPLE DATA SETUP
-- ================================================
-- Quick setup script to configure sample data for testing
-- Run this AFTER creating the timetable tables

-- ================================================
-- 1. UPDATE TEACHER AVAILABILITY
-- ================================================

-- Set up a part-time Physical Education teacher
-- Available: Monday, Wednesday, Friday - periods 6-7 only
WITH pe_subject AS (
  SELECT id::text as subject_id FROM subjects WHERE name = 'Physical Education' LIMIT 1
)
UPDATE profiles
SET 
  is_part_time = true,
  max_periods_per_week = 6,
  max_periods_per_day = 2,
  availability = '{
    "mon": [6, 7],
    "wed": [6, 7],
    "fri": [6, 7]
  }'::jsonb,
  qualified_subjects = ARRAY[(SELECT subject_id FROM pe_subject)]
WHERE role = 'teacher'
  AND (first_name ILIKE '%sports%' OR first_name ILIKE '%PE%' OR last_name ILIKE '%coach%')
  AND id = (
    SELECT id FROM profiles 
    WHERE role = 'teacher' 
    AND (first_name ILIKE '%sports%' OR first_name ILIKE '%PE%' OR last_name ILIKE '%coach%')
    LIMIT 1
  );

-- Set all other teachers as full-time with full availability
UPDATE profiles
SET 
  is_part_time = false,
  max_periods_per_week = 20,
  max_periods_per_day = 6,
  availability = '{
    "mon": [1,2,3,4,5,6,7,8],
    "tue": [1,2,3,4,5,6,7,8],
    "wed": [1,2,3,4,5,6,7,8],
    "thu": [1,2,3,4,5,6,7,8,9,10],
    "fri": [1,2,3,4,5,6,7]
  }'::jsonb
WHERE role = 'teacher'
  AND (is_part_time IS NULL OR is_part_time = false);

-- ================================================
-- 2. ASSIGN SUBJECTS TO TEACHERS
-- ================================================

-- Mathematics teachers
WITH math_subjects AS (
  SELECT ARRAY_AGG(id::text) as subject_ids FROM (
    SELECT id FROM subjects 
    WHERE name ILIKE '%math%' 
    LIMIT 3
  ) s
)
UPDATE profiles
SET qualified_subjects = (SELECT subject_ids FROM math_subjects)
WHERE role = 'teacher'
  AND (first_name ILIKE '%math%' OR last_name ILIKE '%ahmed%')
  AND id = (
    SELECT id FROM profiles
    WHERE role = 'teacher'
    AND (first_name ILIKE '%math%' OR last_name ILIKE '%ahmed%')
    LIMIT 1
  );

-- English teachers  
WITH english_subjects AS (
  SELECT ARRAY_AGG(id::text) as subject_ids FROM (
    SELECT id FROM subjects 
    WHERE name ILIKE '%english%'
    LIMIT 3
  ) s
)
UPDATE profiles
SET qualified_subjects = (SELECT subject_ids FROM english_subjects)
WHERE role = 'teacher'
  AND (first_name ILIKE '%english%' OR first_name ILIKE '%sarah%')
  AND id = (
    SELECT id FROM profiles
    WHERE role = 'teacher'
    AND (first_name ILIKE '%english%' OR first_name ILIKE '%sarah%')
    LIMIT 1
  );

-- Science teachers (Physics, Chemistry, Biology)
WITH science_subjects AS (
  SELECT ARRAY_AGG(id::text) as subject_ids FROM (
    SELECT id FROM subjects 
    WHERE name IN ('Physics', 'Chemistry', 'Biology', 'Science')
    LIMIT 4
  ) s
)
UPDATE profiles
SET qualified_subjects = (SELECT subject_ids FROM science_subjects)
WHERE role = 'teacher'
  AND (first_name ILIKE '%science%' OR last_name ILIKE '%santos%')
  AND id = (
    SELECT id FROM profiles
    WHERE role = 'teacher'
    AND (first_name ILIKE '%science%' OR last_name ILIKE '%santos%')
    LIMIT 1
  );

-- For teachers without specific subjects, assign general subjects
WITH general_subjects AS (
  SELECT ARRAY_AGG(id::text) as subject_ids FROM (
    SELECT id FROM subjects 
    WHERE level = 'junior' AND type = 'general'
    LIMIT 5
  ) s
)
UPDATE profiles
SET qualified_subjects = (SELECT subject_ids FROM general_subjects)
WHERE role = 'teacher'
  AND (qualified_subjects IS NULL OR cardinality(qualified_subjects) = 0);

-- ================================================
-- 3. CONFIGURE SUBJECT PROPERTIES
-- ================================================

-- High-frequency subjects (6 periods/week)
UPDATE subjects
SET 
  periods_per_week = 6,
  double_allowed = false
WHERE name IN ('Mathematics', 'English', 'English Language');

-- Medium-frequency subjects (5 periods/week)
UPDATE subjects
SET 
  periods_per_week = 5,
  double_allowed = true,
  double_max_per_week = 1
WHERE name IN ('Physics', 'Chemistry', 'Biology', 'Science');

-- Standard subjects (4 periods/week)
UPDATE subjects
SET 
  periods_per_week = 4,
  double_allowed = false
WHERE name IN ('History', 'Geography', 'Civic Education', 'Computer Science', 
               'Economics', 'Literature', 'Agricultural Science');

-- Low-frequency subjects (2-3 periods/week)
UPDATE subjects
SET 
  periods_per_week = 2,
  double_allowed = true,
  double_max_per_week = 1
WHERE name IN ('Physical Education', 'Art', 'Music', 'Home Economics', 
               'Technical Drawing', 'Business Studies');

-- ================================================
-- 4. CREATE CLASS-SUBJECT ASSIGNMENTS
-- ================================================

-- Junior Classes (JSS 1-3) - General Subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  CASE 
    WHEN s.name IN ('Mathematics', 'English', 'English Language') THEN 6
    WHEN s.name IN ('Science', 'Basic Science') THEN 5
    WHEN s.name IN ('Physical Education', 'Art') THEN 2
    ELSE 4
  END as periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'junior'
  AND s.level = 'junior'
  AND s.type = 'general'
  AND NOT EXISTS (
    SELECT 1 FROM class_subject_assignments csa
    WHERE csa.class_id = c.id AND csa.subject_id = s.id
  )
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Classes (SS 1-3) - General + Departmental
-- First, assign general subjects to all senior classes
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  CASE 
    WHEN s.name IN ('Mathematics', 'English Language') THEN 6
    WHEN s.name = 'Civic Education' THEN 3
    WHEN s.name IN ('Physical Education') THEN 2
    ELSE 4
  END as periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND s.level = 'senior'
  AND s.type = 'general'
  AND NOT EXISTS (
    SELECT 1 FROM class_subject_assignments csa
    WHERE csa.class_id = c.id AND csa.subject_id = s.id
  )
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Science Department subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  5 as periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND c.department = 'Science'
  AND s.level = 'senior'
  AND s.type = 'departmental'
  AND s.department = 'Science'
  AND s.name IN ('Physics', 'Chemistry', 'Biology')
  AND NOT EXISTS (
    SELECT 1 FROM class_subject_assignments csa
    WHERE csa.class_id = c.id AND csa.subject_id = s.id
  )
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Arts Department subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  4 as periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND c.department = 'Arts'
  AND s.level = 'senior'
  AND s.type = 'departmental'
  AND s.department = 'Arts'
  AND s.name IN ('Literature', 'Government', 'History', 'CRS/IRS')
  AND NOT EXISTS (
    SELECT 1 FROM class_subject_assignments csa
    WHERE csa.class_id = c.id AND csa.subject_id = s.id
  )
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Commercial Department subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  4 as periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND c.department = 'Commercial'
  AND s.level = 'senior'
  AND s.type = 'departmental'
  AND s.department = 'Commercial'
  AND s.name IN ('Economics', 'Accounting', 'Commerce', 'Business Studies')
  AND NOT EXISTS (
    SELECT 1 FROM class_subject_assignments csa
    WHERE csa.class_id = c.id AND csa.subject_id = s.id
  )
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- ================================================
-- 5. VERIFY SETUP
-- ================================================

-- Check teacher configurations
SELECT 
  first_name || ' ' || last_name as teacher_name,
  is_part_time,
  max_periods_per_week,
  cardinality(qualified_subjects) as num_qualified_subjects,
  CASE 
    WHEN availability IS NOT NULL THEN 'Configured'
    ELSE 'Not Set'
  END as availability_status
FROM profiles
WHERE role = 'teacher'
ORDER BY is_part_time DESC, last_name;

-- Check subject configurations
SELECT 
  name,
  level,
  type,
  periods_per_week,
  double_allowed,
  double_max_per_week
FROM subjects
ORDER BY level, type, name;

-- Check class-subject assignments count per class
SELECT 
  c.name as class_name,
  c.level,
  c.department,
  COUNT(csa.id) as num_subjects,
  SUM(csa.periods_per_week) as total_periods_per_week
FROM classes c
LEFT JOIN class_subject_assignments csa ON c.id = csa.class_id
GROUP BY c.id, c.name, c.level, c.department
ORDER BY c.level, c.name;

-- Check for classes without subject assignments
SELECT 
  c.id,
  c.name,
  c.level,
  c.department
FROM classes c
WHERE NOT EXISTS (
  SELECT 1 FROM class_subject_assignments csa WHERE csa.class_id = c.id
);

-- Check for subjects without qualified teachers
SELECT 
  s.id,
  s.name,
  s.level,
  COUNT(DISTINCT p.id) as num_qualified_teachers
FROM subjects s
LEFT JOIN profiles p ON s.id::text = ANY(p.qualified_subjects)
WHERE s.level IS NOT NULL
GROUP BY s.id, s.name, s.level
HAVING COUNT(DISTINCT p.id) = 0
ORDER BY s.level, s.name;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
DECLARE
  teacher_count INTEGER;
  part_time_count INTEGER;
  subject_count INTEGER;
  class_count INTEGER;
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO teacher_count FROM profiles WHERE role = 'teacher';
  SELECT COUNT(*) INTO part_time_count FROM profiles WHERE role = 'teacher' AND is_part_time = true;
  SELECT COUNT(*) INTO subject_count FROM subjects;
  SELECT COUNT(*) INTO class_count FROM classes;
  SELECT COUNT(*) INTO assignment_count FROM class_subject_assignments;
  
  RAISE NOTICE '✅ Sample data setup complete!';
  RAISE NOTICE '👥 Teachers configured: % (% part-time)', teacher_count, part_time_count;
  RAISE NOTICE '📚 Subjects configured: %', subject_count;
  RAISE NOTICE '🎓 Classes: %', class_count;
  RAISE NOTICE '📋 Class-Subject assignments: %', assignment_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '1. Review the verification queries above';
  RAISE NOTICE '2. Configure timetable settings in the UI';
  RAISE NOTICE '3. Generate your first timetable!';
END $$;
