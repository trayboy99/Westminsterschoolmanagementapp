-- ================================================
-- TIMETABLE AUTOMATION - COMPLETE SETUP (ERROR-PROOF)
-- ================================================
-- This is the CORRECTED version that handles missing columns
-- Run this ONE file and everything will work!

-- ================================================
-- STEP 1: ADD MISSING COLUMNS TO TABLES
-- ================================================

-- Add type and department columns to subjects
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Add department column to classes
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS department TEXT;

-- Update existing subjects
UPDATE subjects SET type = 'general' WHERE type IS NULL;

-- Set departmental subjects
UPDATE subjects SET type = 'departmental', department = 'Science'
WHERE name IN ('Physics', 'Chemistry', 'Biology', 'Further Mathematics') AND level = 'senior';

UPDATE subjects SET type = 'departmental', department = 'Arts'
WHERE name IN ('Literature', 'Government', 'History', 'CRS', 'IRS') AND level = 'senior';

UPDATE subjects SET type = 'departmental', department = 'Commercial'
WHERE name IN ('Economics', 'Accounting', 'Commerce', 'Business Studies') AND level = 'senior';

-- Set department for classes (based on typical Nigerian school structure)
-- You can manually update these later based on your actual class structure
UPDATE classes SET department = NULL WHERE level = 'junior';  -- Junior classes don't have departments
UPDATE classes SET department = 'Science' WHERE level = 'senior' AND name ILIKE '%science%';
UPDATE classes SET department = 'Arts' WHERE level = 'senior' AND name ILIKE '%art%';
UPDATE classes SET department = 'Commercial' WHERE level = 'senior' AND name ILIKE '%commercial%';

-- ================================================
-- STEP 2: CREATE TIMETABLE TABLES
-- ================================================

-- 1. Timetable Settings Table
CREATE TABLE IF NOT EXISTS timetable_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view timetable settings" ON timetable_settings;
CREATE POLICY "Admin can view timetable settings" ON timetable_settings FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

DROP POLICY IF EXISTS "Admin can insert timetable settings" ON timetable_settings;
CREATE POLICY "Admin can insert timetable settings" ON timetable_settings FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

DROP POLICY IF EXISTS "Admin can update timetable settings" ON timetable_settings;
CREATE POLICY "Admin can update timetable settings" ON timetable_settings FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

-- 2. Timetable Table
CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year TEXT,
  term TEXT,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All can view timetable" ON timetable;
CREATE POLICY "All can view timetable" ON timetable FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can insert timetable" ON timetable;
CREATE POLICY "Admin can insert timetable" ON timetable FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

DROP POLICY IF EXISTS "Admin can update timetable" ON timetable;
CREATE POLICY "Admin can update timetable" ON timetable FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

DROP POLICY IF EXISTS "Admin can delete timetable" ON timetable;
CREATE POLICY "Admin can delete timetable" ON timetable FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

-- 3. Add teacher fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 6;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualified_subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 4. Add timetable fields to subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS periods_per_week INTEGER DEFAULT 4;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS double_allowed BOOLEAN DEFAULT false;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS double_max_per_week INTEGER DEFAULT 1;

-- 5. Class-Subject Assignments Table
CREATE TABLE IF NOT EXISTS class_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  periods_per_week INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

ALTER TABLE class_subject_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All can view assignments" ON class_subject_assignments;
CREATE POLICY "All can view assignments" ON class_subject_assignments FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin can manage assignments" ON class_subject_assignments;
CREATE POLICY "Admin can manage assignments" ON class_subject_assignments FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_timetable_year ON timetable(academic_year);
CREATE INDEX IF NOT EXISTS idx_timetable_term ON timetable(term);
CREATE INDEX IF NOT EXISTS idx_timetable_settings_updated ON timetable_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON class_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON class_subject_assignments(subject_id);

-- ================================================
-- STEP 3: CONFIGURE DATA
-- ================================================

-- Set all teachers as full-time
UPDATE profiles
SET 
  is_part_time = false,
  max_periods_per_week = 20,
  max_periods_per_day = 6,
  availability = '{"mon":[1,2,3,4,5,6,7,8],"tue":[1,2,3,4,5,6,7,8],"wed":[1,2,3,4,5,6,7,8],"thu":[1,2,3,4,5,6,7,8,9,10],"fri":[1,2,3,4,5,6,7]}'::jsonb
WHERE role = 'teacher';

-- Assign all subjects to all teachers (simple approach)
UPDATE profiles p
SET qualified_subjects = (
  SELECT ARRAY_AGG(s.id::text)
  FROM subjects s
  WHERE s.level IS NOT NULL
)
WHERE p.role = 'teacher';

-- Configure subject periods
UPDATE subjects SET periods_per_week = 6, double_allowed = false
WHERE name IN ('Mathematics', 'English', 'English Language');

UPDATE subjects SET periods_per_week = 5, double_allowed = true, double_max_per_week = 1
WHERE name IN ('Physics', 'Chemistry', 'Biology', 'Science', 'Basic Science');

UPDATE subjects SET periods_per_week = 4, double_allowed = false
WHERE name IN ('History', 'Geography', 'Civic Education', 'Computer Science', 'Economics', 
               'Literature', 'Agricultural Science', 'Government', 'Commerce', 'Accounting',
               'Business Studies', 'CRS', 'IRS', 'Further Mathematics', 'Technical Drawing', 'Home Economics');

UPDATE subjects SET periods_per_week = 2, double_allowed = false
WHERE name IN ('Physical Education', 'Art', 'Music', 'Creative Arts');

-- ================================================
-- STEP 4: CREATE CLASS-SUBJECT ASSIGNMENTS
-- ================================================

-- Junior Classes - General subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c 
CROSS JOIN subjects s
WHERE c.level = 'junior' 
  AND s.level = 'junior' 
  AND s.type = 'general'
ON CONFLICT (class_id, subject_id) DO UPDATE 
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Classes - General subjects (for all)
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c 
CROSS JOIN subjects s
WHERE c.level = 'senior' 
  AND s.level = 'senior' 
  AND s.type = 'general'
ON CONFLICT (class_id, subject_id) DO UPDATE 
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Science - Departmental subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c 
CROSS JOIN subjects s
WHERE c.level = 'senior' 
  AND c.department = 'Science'
  AND s.level = 'senior' 
  AND s.type = 'departmental' 
  AND s.department = 'Science'
ON CONFLICT (class_id, subject_id) DO UPDATE 
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Arts - Departmental subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c 
CROSS JOIN subjects s
WHERE c.level = 'senior' 
  AND c.department = 'Arts'
  AND s.level = 'senior' 
  AND s.type = 'departmental' 
  AND s.department = 'Arts'
ON CONFLICT (class_id, subject_id) DO UPDATE 
SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Commercial - Departmental subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c 
CROSS JOIN subjects s
WHERE c.level = 'senior' 
  AND c.department = 'Commercial'
  AND s.level = 'senior' 
  AND s.type = 'departmental' 
  AND s.department = 'Commercial'
ON CONFLICT (class_id, subject_id) DO UPDATE 
SET periods_per_week = EXCLUDED.periods_per_week;

-- ================================================
-- STEP 5: VERIFICATION & SUCCESS
-- ================================================

DO $$
DECLARE
  teacher_count INTEGER;
  teachers_with_subjects INTEGER;
  subject_count INTEGER;
  general_subjects INTEGER;
  dept_subjects INTEGER;
  class_count INTEGER;
  assignment_count INTEGER;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO teacher_count FROM profiles WHERE role = 'teacher';
  SELECT COUNT(*) INTO teachers_with_subjects FROM profiles 
  WHERE role = 'teacher' AND qualified_subjects IS NOT NULL AND cardinality(qualified_subjects) > 0;
  
  SELECT COUNT(*) INTO subject_count FROM subjects WHERE level IS NOT NULL;
  SELECT COUNT(*) INTO general_subjects FROM subjects WHERE type = 'general';
  SELECT COUNT(*) INTO dept_subjects FROM subjects WHERE type = 'departmental';
  
  SELECT COUNT(*) INTO class_count FROM classes;
  SELECT COUNT(*) INTO assignment_count FROM class_subject_assignments;
  
  -- Success message
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ TIMETABLE SETUP COMPLETE - NO ERRORS!       ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 SETUP SUMMARY:';
  RAISE NOTICE '  ✓ Tables Created & Configured';
  RAISE NOTICE '  ✓ Type Column Added to Subjects';
  RAISE NOTICE '  ✓ RLS Policies Applied';
  RAISE NOTICE '  ✓ Data Populated';
  RAISE NOTICE '';
  RAISE NOTICE '📈 COUNTS:';
  RAISE NOTICE '  Teachers: % (% with subjects assigned)', teacher_count, teachers_with_subjects;
  RAISE NOTICE '  Subjects: % (% general, % departmental)', subject_count, general_subjects, dept_subjects;
  RAISE NOTICE '  Classes: %', class_count;
  RAISE NOTICE '  Assignments: %', assignment_count;
  RAISE NOTICE '';
  
  IF assignment_count = 0 THEN
    RAISE NOTICE '⚠️  WARNING: No assignments created!';
    RAISE NOTICE '   Possible reasons:';
    RAISE NOTICE '   - No classes exist yet';
    RAISE NOTICE '   - No subjects exist yet';
    RAISE NOTICE '   - Level/department mismatch';
    RAISE NOTICE '';
    RAISE NOTICE '   To diagnose, run:';
    RAISE NOTICE '   SELECT level, COUNT(*) FROM classes GROUP BY level;';
    RAISE NOTICE '   SELECT level, type, COUNT(*) FROM subjects GROUP BY level, type;';
  ELSE
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '  1. Follow /TIMETABLE_INSTANT_START.md';
    RAISE NOTICE '  2. Update TimetableModule.tsx';
    RAISE NOTICE '  3. Go to Timetable → Settings';
    RAISE NOTICE '  4. Generate your timetable!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Ready to generate automated timetables!';
  RAISE NOTICE '';
END $$;
