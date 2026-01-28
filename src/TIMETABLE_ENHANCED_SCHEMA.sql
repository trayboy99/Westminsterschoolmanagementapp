-- ================================================
-- ENHANCED TIMETABLE SCHEMA - Nigerian School Requirements
-- ================================================
-- Adds all detailed fields for comprehensive timetable automation
-- Run this AFTER fixing the basic timetable tables
-- ================================================

-- ================================================
-- PART 1: ENHANCE SUBJECTS TABLE
-- ================================================

-- Add Nigerian school-specific subject fields
ALTER TABLE subjects
  -- Level and type
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('junior', 'senior')),
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general' CHECK (type IN ('general', 'departmental')),
  ADD COLUMN IF NOT EXISTS department TEXT CHECK (department IN ('Science', 'Arts', 'Commercial', NULL)),
  
  -- Major subject flags
  ADD COLUMN IF NOT EXISTS is_major BOOLEAN DEFAULT false,
  
  -- Period constraints
  ADD COLUMN IF NOT EXISTS min_periods_per_week INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 5,
  
  -- Double period settings (already added, but ensuring they exist)
  ADD COLUMN IF NOT EXISTS double_allowed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS double_max_per_week INTEGER DEFAULT 1,
  
  -- Time preferences
  ADD COLUMN IF NOT EXISTS preferred_time_slots TEXT CHECK (preferred_time_slots IN ('morning', 'afternoon', 'any', NULL));

-- Add comments
COMMENT ON COLUMN subjects.level IS 'Subject level: junior (JSS1-3) or senior (SS1-3)';
COMMENT ON COLUMN subjects.type IS 'general (all students) or departmental (specific departments only)';
COMMENT ON COLUMN subjects.department IS 'For departmental subjects: Science, Arts, or Commercial';
COMMENT ON COLUMN subjects.is_major IS 'Major subjects typically get more periods per week';
COMMENT ON COLUMN subjects.min_periods_per_week IS 'Minimum periods per week for this subject';
COMMENT ON COLUMN subjects.max_periods_per_week IS 'Maximum/required periods per week';
COMMENT ON COLUMN subjects.preferred_time_slots IS 'Preferred scheduling: morning (periods 1-4), afternoon (5+), or any';

-- ================================================
-- PART 2: CREATE SUBJECT PAIRS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS subject_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_name TEXT NOT NULL,
  subject_1_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_2_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  department TEXT NOT NULL CHECK (department IN ('Science', 'Arts', 'Commercial')),
  level TEXT NOT NULL CHECK (level IN ('junior', 'senior')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_1_id, subject_2_id)
);

COMMENT ON TABLE subject_pairs IS 'Departmental subject pairs (e.g., Physics-Chemistry for Science department)';

-- Example subject pairs for senior classes
-- Physics-Chemistry (Science)
-- Economics-Commerce (Commercial)
-- Literature-CRK (Arts)

-- ================================================
-- PART 3: ENHANCE CLASSES TABLE
-- ================================================

ALTER TABLE classes
  -- Add level if not exists
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('junior', 'senior')),
  
  -- Add department for senior classes
  ADD COLUMN IF NOT EXISTS department TEXT CHECK (department IN ('Science', 'Arts', 'Commercial', NULL));

COMMENT ON COLUMN classes.level IS 'Class level: junior (JSS1-3) or senior (SS1-3)';
COMMENT ON COLUMN classes.department IS 'For senior classes: Science, Arts, or Commercial department';

-- ================================================
-- PART 4: ENHANCE PROFILES TABLE (TEACHERS)
-- ================================================

ALTER TABLE profiles
  -- Basic part-time info (already added, ensuring they exist)
  ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN DEFAULT false,
  
  -- Period constraints (already added, ensuring they exist)
  ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 6,
  
  -- Availability (already added, ensuring it exists)
  ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb,
  
  -- Qualified subjects (already added as array, ensuring it exists)
  ADD COLUMN IF NOT EXISTS qualified_subjects UUID[] DEFAULT ARRAY[]::uuid[],
  
  -- NEW: Preferred classes
  ADD COLUMN IF NOT EXISTS preferred_classes UUID[] DEFAULT ARRAY[]::uuid[],
  
  -- NEW: Cannot teach same period as (for conflict avoidance)
  ADD COLUMN IF NOT EXISTS cannot_teach_same_period_as UUID[] DEFAULT ARRAY[]::uuid[],
  
  -- NEW: Part-time priority
  ADD COLUMN IF NOT EXISTS slot_priority TEXT DEFAULT 'medium' CHECK (slot_priority IN ('high', 'medium', 'low'));

COMMENT ON COLUMN profiles.qualified_subjects IS 'Array of subject UUIDs this teacher can teach';
COMMENT ON COLUMN profiles.preferred_classes IS 'Array of class UUIDs this teacher prefers to teach';
COMMENT ON COLUMN profiles.cannot_teach_same_period_as IS 'Array of teacher UUIDs - cannot be scheduled at same time';
COMMENT ON COLUMN profiles.slot_priority IS 'For part-time teachers: high=schedule first, medium=normal, low=schedule last';
COMMENT ON COLUMN profiles.availability IS 'Weekly availability: {"mon": [1,2,3], "tue": [4,5,6]}';

-- ================================================
-- PART 5: ENHANCE CLASS_SUBJECT_ASSIGNMENTS
-- ================================================

ALTER TABLE class_subject_assignments
  -- Add teacher assignment (may already exist)
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Periods per week (already exists, ensuring it does)
  ADD COLUMN IF NOT EXISTS periods_per_week INTEGER DEFAULT 4,
  
  -- NEW: Allow per-assignment customization
  ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_periods INTEGER, -- Override subject's default
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN class_subject_assignments.is_compulsory IS 'Whether this subject is compulsory for this class';
COMMENT ON COLUMN class_subject_assignments.custom_periods IS 'Override subject default periods for this specific class';
COMMENT ON COLUMN class_subject_assignments.notes IS 'Special notes for this class-subject assignment';

-- ================================================
-- PART 6: CREATE DEPARTMENTAL REQUIREMENTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS departmental_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL CHECK (department IN ('Science', 'Arts', 'Commercial')),
  level TEXT NOT NULL CHECK (level IN ('junior', 'senior')),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_compulsory BOOLEAN DEFAULT true,
  min_periods_per_week INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department, level, subject_id)
);

COMMENT ON TABLE departmental_requirements IS 'Defines which subjects are compulsory per department and level';

-- Example: Science department SS1-3 must take Physics, Chemistry, Biology, Mathematics
-- Arts department SS1-3 must take Literature, Government, Economics, etc.

-- ================================================
-- PART 7: CREATE TEACHER AVAILABILITY PRESETS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS teacher_availability_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  availability JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE teacher_availability_presets IS 'Reusable availability patterns (e.g., "Morning Only", "MWF Full Day")';

-- Insert common presets
INSERT INTO teacher_availability_presets (name, description, availability)
VALUES
  ('Full Week', 'Available all periods Monday-Friday', '{
    "mon": [1,2,3,4,5,6,7,8],
    "tue": [1,2,3,4,5,6,7,8],
    "wed": [1,2,3,4,5,6,7,8],
    "thu": [1,2,3,4,5,6,7,8,9,10],
    "fri": [1,2,3,4]
  }'::jsonb),
  
  ('Morning Only', 'Available periods 1-4 all days', '{
    "mon": [1,2,3,4],
    "tue": [1,2,3,4],
    "wed": [1,2,3,4],
    "thu": [1,2,3,4],
    "fri": [1,2,3,4]
  }'::jsonb),
  
  ('Afternoon Only', 'Available periods 5+ all days', '{
    "mon": [5,6,7,8],
    "tue": [5,6,7,8],
    "wed": [5,6,7,8],
    "thu": [5,6,7,8,9,10],
    "fri": []
  }'::jsonb),
  
  ('MWF Only', 'Available Monday, Wednesday, Friday', '{
    "mon": [1,2,3,4,5,6,7,8],
    "tue": [],
    "wed": [1,2,3,4,5,6,7,8],
    "thu": [],
    "fri": [1,2,3,4]
  }'::jsonb),
  
  ('TTH Only', 'Available Tuesday, Thursday', '{
    "mon": [],
    "tue": [1,2,3,4,5,6,7,8],
    "wed": [],
    "thu": [1,2,3,4,5,6,7,8,9,10],
    "fri": []
  }'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- PART 8: ENABLE RLS ON NEW TABLES
-- ================================================

-- subject_pairs RLS
ALTER TABLE subject_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view subject pairs" ON subject_pairs;
DROP POLICY IF EXISTS "Admin can manage subject pairs" ON subject_pairs;

CREATE POLICY "Everyone can view subject pairs"
  ON subject_pairs FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage subject pairs"
  ON subject_pairs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- departmental_requirements RLS
ALTER TABLE departmental_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view departmental requirements" ON departmental_requirements;
DROP POLICY IF EXISTS "Admin can manage departmental requirements" ON departmental_requirements;

CREATE POLICY "Everyone can view departmental requirements"
  ON departmental_requirements FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage departmental requirements"
  ON departmental_requirements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- teacher_availability_presets RLS
ALTER TABLE teacher_availability_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view availability presets" ON teacher_availability_presets;
DROP POLICY IF EXISTS "Admin can manage availability presets" ON teacher_availability_presets;

CREATE POLICY "Everyone can view availability presets"
  ON teacher_availability_presets FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage availability presets"
  ON teacher_availability_presets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- ================================================
-- PART 9: CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects(level);
CREATE INDEX IF NOT EXISTS idx_subjects_type ON subjects(type);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department);
CREATE INDEX IF NOT EXISTS idx_subjects_is_major ON subjects(is_major);

CREATE INDEX IF NOT EXISTS idx_subject_pairs_department ON subject_pairs(department);
CREATE INDEX IF NOT EXISTS idx_subject_pairs_level ON subject_pairs(level);

CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_department ON classes(department);

CREATE INDEX IF NOT EXISTS idx_profiles_is_part_time ON profiles(is_part_time) WHERE role = 'teacher';
CREATE INDEX IF NOT EXISTS idx_profiles_slot_priority ON profiles(slot_priority) WHERE role = 'teacher';

CREATE INDEX IF NOT EXISTS idx_departmental_reqs_dept ON departmental_requirements(department, level);

-- ================================================
-- PART 10: FORCE SCHEMA RELOAD
-- ================================================

NOTIFY pgrst, 'reload schema';

-- ================================================
-- VERIFICATION
-- ================================================

SELECT '✅ Enhanced Subjects Table' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects'
  AND column_name IN ('level', 'type', 'department', 'is_major', 'min_periods_per_week', 'max_periods_per_week', 'preferred_time_slots')
ORDER BY column_name;

SELECT '✅ New Subject Pairs Table' as status;
SELECT COUNT(*) as table_exists FROM information_schema.tables WHERE table_name = 'subject_pairs';

SELECT '✅ Enhanced Classes Table' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'classes'
  AND column_name IN ('level', 'department')
ORDER BY column_name;

SELECT '✅ Enhanced Profiles Table (Teachers)' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
  AND column_name IN ('is_part_time', 'qualified_subjects', 'preferred_classes', 'cannot_teach_same_period_as', 'slot_priority', 'availability')
ORDER BY column_name;

SELECT '✅ New Departmental Requirements Table' as status;
SELECT COUNT(*) as table_exists FROM information_schema.tables WHERE table_name = 'departmental_requirements';

SELECT '✅ Teacher Availability Presets' as status;
SELECT name, description FROM teacher_availability_presets ORDER BY name;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ================================================';
  RAISE NOTICE '🎉 ENHANCED TIMETABLE SCHEMA COMPLETE!';
  RAISE NOTICE '🎉 ================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ SUBJECTS ENHANCED:';
  RAISE NOTICE '   • level (junior/senior)';
  RAISE NOTICE '   • type (general/departmental)';
  RAISE NOTICE '   • department (Science/Arts/Commercial)';
  RAISE NOTICE '   • is_major (major subjects flag)';
  RAISE NOTICE '   • min/max_periods_per_week';
  RAISE NOTICE '   • preferred_time_slots (morning/afternoon/any)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ NEW TABLES CREATED:';
  RAISE NOTICE '   • subject_pairs (departmental subject pairings)';
  RAISE NOTICE '   • departmental_requirements (compulsory subjects per dept)';
  RAISE NOTICE '   • teacher_availability_presets (reusable patterns)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ TEACHERS ENHANCED:';
  RAISE NOTICE '   • preferred_classes (preferred teaching classes)';
  RAISE NOTICE '   • cannot_teach_same_period_as (conflict avoidance)';
  RAISE NOTICE '   • slot_priority (high/medium/low for part-time)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ CLASSES ENHANCED:';
  RAISE NOTICE '   • level (junior/senior)';
  RAISE NOTICE '   • department (for senior classes)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEPS:';
  RAISE NOTICE '   1. Update your subjects with new fields';
  RAISE NOTICE '   2. Set class levels and departments';
  RAISE NOTICE '   3. Configure teacher preferences';
  RAISE NOTICE '   4. Define departmental requirements';
  RAISE NOTICE '   5. Create subject pairs for senior classes';
  RAISE NOTICE '   6. Use enhanced UI components (coming next)';
  RAISE NOTICE '';
END $$;
