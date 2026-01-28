-- ================================================
-- TIMETABLE AUTOMATION DATABASE TABLES
-- ================================================
-- Run this SQL in your Supabase SQL Editor

-- 1. Timetable Settings Table
-- Stores school-wide timetable configuration
CREATE TABLE IF NOT EXISTS timetable_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for timetable_settings
ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and IT_admin can view timetable settings"
  ON timetable_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

CREATE POLICY "Admin and IT_admin can insert timetable settings"
  ON timetable_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

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
-- Stores generated timetable slots
CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year TEXT,
  term TEXT,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for timetable
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view timetable"
  ON timetable FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and IT_admin can insert timetable"
  ON timetable FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

CREATE POLICY "Admin and IT_admin can update timetable"
  ON timetable FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

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
-- These are optional - used for part-time teacher availability
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 6;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualified_subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update existing teacher records to have default values
UPDATE profiles
SET 
  is_part_time = COALESCE(is_part_time, false),
  max_periods_per_week = COALESCE(max_periods_per_week, 20),
  max_periods_per_day = COALESCE(max_periods_per_day, 6),
  availability = COALESCE(availability, '{}'::jsonb),
  qualified_subjects = COALESCE(qualified_subjects, ARRAY[]::TEXT[])
WHERE role = 'teacher';

-- 4. Add subject timetable fields to subjects table (if not exists)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS periods_per_week INTEGER DEFAULT 4;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS double_allowed BOOLEAN DEFAULT false;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS double_max_per_week INTEGER DEFAULT 1;

-- Update existing subjects with default values
UPDATE subjects
SET 
  periods_per_week = COALESCE(periods_per_week, 4),
  double_allowed = COALESCE(double_allowed, false),
  double_max_per_week = COALESCE(double_max_per_week, 1);

-- 5. Class-Subject Assignments Table
-- Stores which subjects each class should have and how many periods per week
CREATE TABLE IF NOT EXISTS class_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  periods_per_week INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- Add RLS policies
ALTER TABLE class_subject_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view class subject assignments"
  ON class_subject_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and IT_admin can manage class subject assignments"
  ON class_subject_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timetable_academic_year ON timetable(academic_year);
CREATE INDEX IF NOT EXISTS idx_timetable_term ON timetable(term);
CREATE INDEX IF NOT EXISTS idx_timetable_settings_updated_at ON timetable_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_class_subject_assignments_class ON class_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subject_assignments_subject ON class_subject_assignments(subject_id);

-- 7. Create sample class-subject assignments for existing classes
-- This is optional - populates initial data based on level
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  CASE 
    WHEN s.name IN ('Mathematics', 'English') THEN 6
    WHEN s.name IN ('Science', 'Physics', 'Chemistry', 'Biology') THEN 5
    ELSE 4
  END as periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE c.level = s.level
  AND NOT EXISTS (
    SELECT 1 FROM class_subject_assignments csa
    WHERE csa.class_id = c.id AND csa.subject_id = s.id
  )
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Timetable tables created successfully!';
  RAISE NOTICE '📋 Created tables: timetable_settings, timetable, class_subject_assignments';
  RAISE NOTICE '👥 Updated profiles table with teacher availability fields';
  RAISE NOTICE '📚 Updated subjects table with period configuration';
  RAISE NOTICE '🔒 Applied Row Level Security policies';
END $$;
