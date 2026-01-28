-- ================================================
-- COMPLETE FIX: Timetable Tables Schema
-- ================================================
-- This fixes ALL schema issues for the timetable system
-- Run this in Supabase SQL Editor
-- ================================================

-- ================================================
-- STEP 1: DROP OLD TIMETABLE TABLE (if exists)
-- ================================================
-- The old schema was incompatible with the backend
DROP TABLE IF EXISTS timetable CASCADE;

-- ================================================
-- STEP 2: CREATE CORRECT TIMETABLE TABLE
-- ================================================
-- This stores the entire generated timetable as JSONB
CREATE TABLE timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT,
  term TEXT,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================
-- STEP 3: FIX TIMETABLE_SETTINGS TABLE
-- ================================================
-- Ensure config column exists and is correct type
ALTER TABLE timetable_settings 
DROP COLUMN IF EXISTS config;

ALTER TABLE timetable_settings 
ADD COLUMN config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Ensure other columns exist
ALTER TABLE timetable_settings
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ================================================
-- STEP 4: ENSURE CLASS_SUBJECT_ASSIGNMENTS TABLE EXISTS
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

-- ================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ================================================

-- Timetable Settings RLS
ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can insert timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can update timetable settings" ON timetable_settings;

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

-- Timetable RLS
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

-- Class Subject Assignments RLS
ALTER TABLE class_subject_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view class subject assignments" ON class_subject_assignments;
DROP POLICY IF EXISTS "Admin can manage class subject assignments" ON class_subject_assignments;

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
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
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
-- STEP 7: ADD TEACHER COLUMNS TO PROFILES (if not exists)
-- ================================================
-- These are needed for part-time teacher scheduling
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS qualified_subjects UUID[] DEFAULT ARRAY[]::uuid[];

-- ================================================
-- STEP 8: ADD SUBJECT COLUMNS (if not exists)
-- ================================================
-- These are needed for double period handling
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS double_allowed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS double_max_per_week INTEGER DEFAULT 1;

-- ================================================
-- STEP 9: FORCE SCHEMA CACHE RELOAD
-- ================================================
NOTIFY pgrst, 'reload schema';

-- ================================================
-- STEP 10: VERIFY TABLE STRUCTURES
-- ================================================

-- Check timetable_settings
SELECT 
  '✅ TIMETABLE_SETTINGS TABLE:' as status,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

-- Check timetable
SELECT 
  '✅ TIMETABLE TABLE:' as status,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable'
ORDER BY ordinal_position;

-- Check class_subject_assignments
SELECT 
  '✅ CLASS_SUBJECT_ASSIGNMENTS TABLE:' as status,
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
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 TIMETABLE SCHEMA FIXED SUCCESSFULLY!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables created/fixed:';
  RAISE NOTICE '   • timetable_settings (with config JSONB)';
  RAISE NOTICE '   • timetable (stores generated slots)';
  RAISE NOTICE '   • class_subject_assignments';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Columns added to existing tables:';
  RAISE NOTICE '   • profiles: is_part_time, availability, etc.';
  RAISE NOTICE '   • subjects: double_allowed, double_max_per_week';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS policies configured for all tables';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '✅ Schema cache reloaded';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEPS:';
  RAISE NOTICE '   1. Refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)';
  RAISE NOTICE '   2. Navigate to Timetable Module';
  RAISE NOTICE '   3. Click "Settings" to configure timetable';
  RAISE NOTICE '   4. Follow TEST_TIMETABLE_AUTOMATION_NOW.md guide';
  RAISE NOTICE '';
END $$;
