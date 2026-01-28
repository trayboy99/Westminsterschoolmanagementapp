-- ================================================
-- COMPLETE FIX: All Timetable Table Errors
-- ================================================
-- This fixes BOTH tables to match what the backend expects:
-- 1. timetable_settings - removes "name" and other extra columns
-- 2. timetable - ensures correct structure for storing slots
-- ================================================

-- ================================================
-- DIAGNOSTIC: Check current structure
-- ================================================
SELECT 'DIAGNOSTIC: Current timetable_settings structure' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

SELECT 'DIAGNOSTIC: Current timetable structure' as step;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable'
ORDER BY ordinal_position;

-- ================================================
-- FIX 1: Drop and recreate timetable_settings
-- ================================================
DROP TABLE IF EXISTS timetable_settings CASCADE;

CREATE TABLE timetable_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE timetable_settings IS 'Stores timetable configuration (days, breaks, special rules)';
COMMENT ON COLUMN timetable_settings.config IS 'Complete timetable configuration as JSONB';

-- ================================================
-- FIX 2: Drop and recreate timetable
-- ================================================
DROP TABLE IF EXISTS timetable CASCADE;

CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT,
  term TEXT,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE timetable IS 'Stores generated timetable with all slots as JSONB array';
COMMENT ON COLUMN timetable.slots IS 'Array of all timetable slots for all classes';

-- ================================================
-- FIX 3: Ensure class_subject_assignments exists
-- ================================================
CREATE TABLE IF NOT EXISTS class_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  periods_per_week INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

COMMENT ON TABLE class_subject_assignments IS 'Links classes to subjects with periods per week';

-- ================================================
-- FIX 4: Add teacher scheduling columns to profiles
-- ================================================
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS qualified_subjects UUID[] DEFAULT ARRAY[]::uuid[];

COMMENT ON COLUMN profiles.is_part_time IS 'Whether teacher works part-time (affects scheduling priority)';
COMMENT ON COLUMN profiles.availability IS 'Teacher availability by day/period: {"mon": [1,2,3], "wed": [5,6]}';
COMMENT ON COLUMN profiles.max_periods_per_week IS 'Maximum teaching periods per week';
COMMENT ON COLUMN profiles.max_periods_per_day IS 'Maximum teaching periods per day';
COMMENT ON COLUMN profiles.qualified_subjects IS 'Array of subject UUIDs this teacher can teach';

-- ================================================
-- FIX 5: Add double period columns to subjects
-- ================================================
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS double_allowed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS double_max_per_week INTEGER DEFAULT 1;

COMMENT ON COLUMN subjects.double_allowed IS 'Whether subject can have consecutive double periods';
COMMENT ON COLUMN subjects.double_max_per_week IS 'Maximum double periods per week (typically 1)';

-- ================================================
-- FIX 6: Enable RLS on all tables
-- ================================================

-- timetable_settings RLS
ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can insert timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can update timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can delete timetable settings" ON timetable_settings;

CREATE POLICY "Admin can view timetable settings" 
  ON timetable_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can insert timetable settings" 
  ON timetable_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can update timetable settings" 
  ON timetable_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can delete timetable settings" 
  ON timetable_settings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- timetable RLS
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view timetables" ON timetable;
DROP POLICY IF EXISTS "Admin can insert timetable" ON timetable;
DROP POLICY IF EXISTS "Admin can update timetable" ON timetable;
DROP POLICY IF EXISTS "Admin can delete timetable" ON timetable;

CREATE POLICY "Everyone can view timetables" 
  ON timetable FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert timetable" 
  ON timetable FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can update timetable" 
  ON timetable FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can delete timetable" 
  ON timetable FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- class_subject_assignments RLS
ALTER TABLE class_subject_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view class subject assignments" ON class_subject_assignments;
DROP POLICY IF EXISTS "Admin can insert class subject assignments" ON class_subject_assignments;
DROP POLICY IF EXISTS "Admin can update class subject assignments" ON class_subject_assignments;
DROP POLICY IF EXISTS "Admin can delete class subject assignments" ON class_subject_assignments;

CREATE POLICY "Everyone can view class subject assignments" 
  ON class_subject_assignments FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert class subject assignments" 
  ON class_subject_assignments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can update class subject assignments" 
  ON class_subject_assignments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can delete class subject assignments" 
  ON class_subject_assignments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- ================================================
-- FIX 7: Create performance indexes
-- ================================================
CREATE INDEX IF NOT EXISTS idx_timetable_settings_created_at 
  ON timetable_settings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timetable_created_at 
  ON timetable(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timetable_academic_year 
  ON timetable(academic_year);

CREATE INDEX IF NOT EXISTS idx_class_subject_assignments_class 
  ON class_subject_assignments(class_id);

CREATE INDEX IF NOT EXISTS idx_class_subject_assignments_subject 
  ON class_subject_assignments(subject_id);

-- ================================================
-- FIX 8: Force schema cache reload
-- ================================================
NOTIFY pgrst, 'reload schema';

-- ================================================
-- VERIFICATION: Check new structure
-- ================================================
SELECT 
  '✅ FIXED: timetable_settings columns (should be 5 only)' as status,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

SELECT 
  '✅ FIXED: timetable columns (should be 7 only)' as status,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable'
ORDER BY ordinal_position;

SELECT 
  '✅ FIXED: class_subject_assignments columns' as status,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'class_subject_assignments'
ORDER BY ordinal_position;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ================================================';
  RAISE NOTICE '🎉 ALL TIMETABLE ERRORS FIXED!';
  RAISE NOTICE '🎉 ================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ FIXED ISSUES:';
  RAISE NOTICE '   ✓ Removed "name" column from timetable_settings';
  RAISE NOTICE '   ✓ Removed all extra unwanted columns';
  RAISE NOTICE '   ✓ timetable_settings now has ONLY 5 columns:';
  RAISE NOTICE '     - id, config, updated_by, created_at, updated_at';
  RAISE NOTICE '   ✓ timetable now has ONLY 7 columns:';
  RAISE NOTICE '     - id, academic_year, term, slots, created_by, created_at, updated_at';
  RAISE NOTICE '   ✓ class_subject_assignments table ready';
  RAISE NOTICE '   ✓ Added teacher scheduling columns to profiles';
  RAISE NOTICE '   ✓ Added double period columns to subjects';
  RAISE NOTICE '   ✓ All RLS policies configured';
  RAISE NOTICE '   ✓ Performance indexes created';
  RAISE NOTICE '   ✓ Schema cache reloaded';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 WHAT TO DO NOW:';
  RAISE NOTICE '   1. Refresh browser (Ctrl+Shift+R or Cmd+Shift+R)';
  RAISE NOTICE '   2. Navigate to Timetable Module';
  RAISE NOTICE '   3. Click "Settings" button';
  RAISE NOTICE '   4. Configure timetable settings';
  RAISE NOTICE '   5. Click "Save Settings"';
  RAISE NOTICE '   6. Should save successfully now!';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Next: Follow /TEST_TIMETABLE_AUTOMATION_NOW.md';
  RAISE NOTICE '';
END $$;
