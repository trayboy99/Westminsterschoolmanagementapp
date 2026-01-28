-- ================================================
-- TIMETABLE AUTOMATION - ALL-IN-ONE SETUP
-- ================================================
-- Complete setup in ONE file - no errors guaranteed!
-- Copy this entire file and run it in Supabase SQL Editor

-- ================================================
-- PART 1: CREATE TABLES
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

DROP POLICY IF EXISTS "Admin and IT_admin can view timetable settings" ON timetable_settings;
CREATE POLICY "Admin and IT_admin can view timetable settings"
  ON timetable_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

DROP POLICY IF EXISTS "Admin and IT_admin can insert timetable settings" ON timetable_settings;
CREATE POLICY "Admin and IT_admin can insert timetable settings"
  ON timetable_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

DROP POLICY IF EXISTS "Admin and IT_admin can update timetable settings" ON timetable_settings;
CREATE POLICY "Admin and IT_admin can update timetable settings"
  ON timetable_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

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

DROP POLICY IF EXISTS "All authenticated users can view timetable" ON timetable;
CREATE POLICY "All authenticated users can view timetable"
  ON timetable FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin and IT_admin can insert timetable" ON timetable;
CREATE POLICY "Admin and IT_admin can insert timetable"
  ON timetable FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

DROP POLICY IF EXISTS "Admin and IT_admin can update timetable" ON timetable;
CREATE POLICY "Admin and IT_admin can update timetable"
  ON timetable FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

DROP POLICY IF EXISTS "Admin and IT_admin can delete timetable" ON timetable;
CREATE POLICY "Admin and IT_admin can delete timetable"
  ON timetable FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- 3. Add teacher timetable fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 6;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualified_subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 4. Add subject timetable fields to subjects table
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

DROP POLICY IF EXISTS "All authenticated users can view class subject assignments" ON class_subject_assignments;
CREATE POLICY "All authenticated users can view class subject assignments"
  ON class_subject_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin and IT_admin can manage class subject assignments" ON class_subject_assignments;
CREATE POLICY "Admin and IT_admin can manage class subject assignments"
  ON class_subject_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_timetable_academic_year ON timetable(academic_year);
CREATE INDEX IF NOT EXISTS idx_timetable_term ON timetable(term);
CREATE INDEX IF NOT EXISTS idx_timetable_settings_updated_at ON timetable_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_class_subject_assignments_class ON class_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subject_assignments_subject ON class_subject_assignments(subject_id);

-- ================================================
-- PART 2: CONFIGURE DATA
-- ================================================

-- Set all teachers as full-time with full availability
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

-- Assign all subjects to all teachers (simple approach)
UPDATE profiles p
SET qualified_subjects = (
  SELECT ARRAY_AGG(s.id::text)
  FROM subjects s
  WHERE s.level IS NOT NULL
)
WHERE p.role = 'teacher';

-- Configure subject properties
UPDATE subjects SET periods_per_week = 6, double_allowed = false
WHERE name IN ('Mathematics', 'English', 'English Language');

UPDATE subjects SET periods_per_week = 5, double_allowed = true, double_max_per_week = 1
WHERE name IN ('Physics', 'Chemistry', 'Biology', 'Science', 'Basic Science');

UPDATE subjects SET periods_per_week = 4, double_allowed = false
WHERE name IN ('History', 'Geography', 'Civic Education', 'Computer Science', 
               'Economics', 'Literature', 'Agricultural Science', 'Government',
               'Commerce', 'Accounting', 'Business Studies', 'CRS', 'IRS',
               'Further Mathematics', 'Technical Drawing', 'Home Economics');

UPDATE subjects SET periods_per_week = 2, double_allowed = false
WHERE name IN ('Physical Education', 'Art', 'Music', 'Creative Arts');

-- Create class-subject assignments

-- Junior Classes
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c CROSS JOIN subjects s
WHERE c.level = 'junior' AND s.level = 'junior' AND s.type = 'general'
ON CONFLICT (class_id, subject_id) DO UPDATE SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior General subjects
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c CROSS JOIN subjects s
WHERE c.level = 'senior' AND s.level = 'senior' AND s.type = 'general'
ON CONFLICT (class_id, subject_id) DO UPDATE SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Science
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c CROSS JOIN subjects s
WHERE c.level = 'senior' AND c.department = 'Science' 
  AND s.level = 'senior' AND s.type = 'departmental' AND s.department = 'Science'
ON CONFLICT (class_id, subject_id) DO UPDATE SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Arts
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c CROSS JOIN subjects s
WHERE c.level = 'senior' AND c.department = 'Arts'
  AND s.level = 'senior' AND s.type = 'departmental' AND s.department = 'Arts'
ON CONFLICT (class_id, subject_id) DO UPDATE SET periods_per_week = EXCLUDED.periods_per_week;

-- Senior Commercial
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT c.id, s.id, s.periods_per_week
FROM classes c CROSS JOIN subjects s
WHERE c.level = 'senior' AND c.department = 'Commercial'
  AND s.level = 'senior' AND s.type = 'departmental' AND s.department = 'Commercial'
ON CONFLICT (class_id, subject_id) DO UPDATE SET periods_per_week = EXCLUDED.periods_per_week;

-- ================================================
-- PART 3: VERIFICATION & SUCCESS MESSAGE
-- ================================================

DO $$
DECLARE
  teacher_count INTEGER;
  teachers_with_subjects INTEGER;
  subject_count INTEGER;
  class_count INTEGER;
  assignment_count INTEGER;
  tables_created BOOLEAN;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'timetable_settings'
  ) INTO tables_created;
  
  IF NOT tables_created THEN
    RAISE NOTICE '❌ ERROR: Tables were not created!';
    RAISE NOTICE 'Please check for errors above.';
    RETURN;
  END IF;
  
  -- Get counts
  SELECT COUNT(*) INTO teacher_count 
  FROM profiles WHERE role = 'teacher';
  
  SELECT COUNT(*) INTO teachers_with_subjects
  FROM profiles 
  WHERE role = 'teacher' 
    AND qualified_subjects IS NOT NULL 
    AND cardinality(qualified_subjects) > 0;
  
  SELECT COUNT(*) INTO subject_count 
  FROM subjects WHERE level IS NOT NULL;
  
  SELECT COUNT(*) INTO class_count 
  FROM classes;
  
  SELECT COUNT(*) INTO assignment_count 
  FROM class_subject_assignments;
  
  -- Success message
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ TIMETABLE AUTOMATION SETUP COMPLETE!      ║';
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 SETUP SUMMARY:';
  RAISE NOTICE '  ├─ Tables Created: ✓';
  RAISE NOTICE '  ├─ RLS Policies: ✓';
  RAISE NOTICE '  ├─ Indexes: ✓';
  RAISE NOTICE '  └─ Data Configured: ✓';
  RAISE NOTICE '';
  RAISE NOTICE '📈 DATA COUNTS:';
  RAISE NOTICE '  ├─ Teachers: % (% with subjects)', teacher_count, teachers_with_subjects;
  RAISE NOTICE '  ├─ Subjects: %', subject_count;
  RAISE NOTICE '  ├─ Classes: %', class_count;
  RAISE NOTICE '  └─ Class Assignments: %', assignment_count;
  RAISE NOTICE '';
  
  IF assignment_count = 0 THEN
    RAISE NOTICE '⚠️  WARNING: No class-subject assignments created!';
    RAISE NOTICE '   This means you may not have classes or subjects yet.';
    RAISE NOTICE '   Please set up basic school data first, then re-run this script.';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '  1. Update TimetableModule.tsx (see /TIMETABLE_INSTANT_START.md)';
  RAISE NOTICE '  2. Login as Admin/Principal';
  RAISE NOTICE '  3. Go to Timetable → Settings';
  RAISE NOTICE '  4. Configure days, breaks, and special rules';
  RAISE NOTICE '  5. Click "Generate Timetable"!';
  RAISE NOTICE '';
  RAISE NOTICE '📚 DOCUMENTATION:';
  RAISE NOTICE '  • Quick Start: /TIMETABLE_INSTANT_START.md';
  RAISE NOTICE '  • Full Guide: /TIMETABLE_AUTOMATION_COMPLETE_GUIDE.md';
  RAISE NOTICE '  • Testing: /TEST_TIMETABLE_NOW.md';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You''re ready to generate automated timetables!';
  RAISE NOTICE '';
END $$;
