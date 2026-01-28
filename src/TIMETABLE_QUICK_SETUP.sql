-- ================================================
-- TIMETABLE QUICK SETUP - ERROR-FREE VERSION
-- ================================================
-- Simple setup script that works for all PostgreSQL versions
-- Run this AFTER creating the timetable tables

-- ================================================
-- 1. SET ALL TEACHERS AS FULL-TIME WITH FULL AVAILABILITY
-- ================================================

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
WHERE role = 'teacher';

-- ================================================
-- 2. ASSIGN ALL SUBJECTS TO ALL TEACHERS (SIMPLE APPROACH)
-- ================================================

-- This assigns all subjects to all teachers
-- Later you can refine by manually updating specific teachers
UPDATE profiles p
SET qualified_subjects = (
  SELECT ARRAY_AGG(s.id::text)
  FROM subjects s
  WHERE s.level IS NOT NULL
)
WHERE p.role = 'teacher';

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
WHERE name IN ('Physics', 'Chemistry', 'Biology', 'Science', 'Basic Science');

-- Standard subjects (4 periods/week)
UPDATE subjects
SET 
  periods_per_week = 4,
  double_allowed = false
WHERE name IN ('History', 'Geography', 'Civic Education', 'Computer Science', 
               'Economics', 'Literature', 'Agricultural Science', 'Government',
               'Commerce', 'Accounting', 'Business Studies', 'CRS', 'IRS',
               'Further Mathematics', 'Technical Drawing', 'Home Economics');

-- Low-frequency subjects (2 periods/week)
UPDATE subjects
SET 
  periods_per_week = 2,
  double_allowed = false
WHERE name IN ('Physical Education', 'Art', 'Music', 'Creative Arts');

-- ================================================
-- 4. CREATE CLASS-SUBJECT ASSIGNMENTS
-- ================================================

-- Junior Classes - Assign all junior subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  s.periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'junior'
  AND s.level = 'junior'
  AND s.type = 'general'
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Classes - General subjects for all
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  s.periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND s.level = 'senior'
  AND s.type = 'general'
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Classes - Departmental subjects (Science)
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  s.periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND c.department = 'Science'
  AND s.level = 'senior'
  AND s.type = 'departmental'
  AND s.department = 'Science'
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Classes - Departmental subjects (Arts)
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  s.periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND c.department = 'Arts'
  AND s.level = 'senior'
  AND s.type = 'departmental'
  AND s.department = 'Arts'
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Classes - Departmental subjects (Commercial)
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  s.periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'senior'
  AND c.department = 'Commercial'
  AND s.level = 'senior'
  AND s.type = 'departmental'
  AND s.department = 'Commercial'
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;

-- ================================================
-- 5. OPTIONAL: CREATE ONE PART-TIME TEACHER
-- ================================================

-- Manually set one teacher as part-time (if you have PE teacher)
-- Uncomment and replace 'TEACHER_EMAIL_HERE' with actual teacher email

/*
UPDATE profiles
SET 
  is_part_time = true,
  max_periods_per_week = 6,
  max_periods_per_day = 2,
  availability = '{
    "mon": [6, 7],
    "wed": [6, 7],
    "fri": [6, 7]
  }'::jsonb
WHERE role = 'teacher'
  AND email = 'TEACHER_EMAIL_HERE';
*/

-- ================================================
-- 6. VERIFICATION QUERIES
-- ================================================

-- Check teacher setup
SELECT 
  first_name || ' ' || last_name as teacher_name,
  is_part_time,
  max_periods_per_week,
  COALESCE(cardinality(qualified_subjects), 0) as num_subjects
FROM profiles
WHERE role = 'teacher'
ORDER BY last_name;

-- Check subjects configured
SELECT 
  name,
  level,
  type,
  periods_per_week,
  double_allowed
FROM subjects
WHERE level IS NOT NULL
ORDER BY level, type, name;

-- Check class assignments
SELECT 
  c.name as class_name,
  c.level,
  c.department,
  COUNT(csa.id) as num_subjects,
  SUM(csa.periods_per_week) as total_periods
FROM classes c
LEFT JOIN class_subject_assignments csa ON c.id = csa.class_id
GROUP BY c.id, c.name, c.level, c.department
ORDER BY c.level, c.name;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
DECLARE
  teacher_count INTEGER;
  subject_count INTEGER;
  class_count INTEGER;
  assignment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO teacher_count FROM profiles WHERE role = 'teacher';
  SELECT COUNT(*) INTO subject_count FROM subjects WHERE level IS NOT NULL;
  SELECT COUNT(*) INTO class_count FROM classes;
  SELECT COUNT(*) INTO assignment_count FROM class_subject_assignments;
  
  RAISE NOTICE '✅ Quick setup complete!';
  RAISE NOTICE '👥 Teachers: % (all full-time by default)', teacher_count;
  RAISE NOTICE '📚 Subjects: %', subject_count;
  RAISE NOTICE '🎓 Classes: %', class_count;
  RAISE NOTICE '📋 Assignments: %', assignment_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '1. Go to Admin → Timetable → Settings';
  RAISE NOTICE '2. Configure days, breaks, and special rules';
  RAISE NOTICE '3. Click "Generate Timetable"!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 To create part-time teachers later:';
  RAISE NOTICE 'UPDATE profiles SET is_part_time=true, availability=''{"mon":[6,7]}''::jsonb WHERE email=''teacher@school.com'';';
END $$;
