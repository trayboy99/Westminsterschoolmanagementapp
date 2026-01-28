-- ================================================
-- SUBJECT CONFIGURATIONS TABLE FOR TIMETABLE
-- ================================================
-- This table stores detailed timetable configurations for each subject
-- including class assignments, teacher assignments, period settings, and pairing flags

CREATE TABLE IF NOT EXISTS subject_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  class_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  teachers JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_periods_per_week INTEGER NOT NULL DEFAULT 2,
  max_periods_per_week INTEGER NOT NULL DEFAULT 5,
  allow_double_periods BOOLEAN NOT NULL DEFAULT true,
  preferred_time_slots TEXT[] DEFAULT ARRAY[]::TEXT[],
  type TEXT CHECK (type IN ('core', 'elective')),
  department TEXT CHECK (department IN ('general', 'science', 'arts', 'commercial')),
  is_paired_subject BOOLEAN DEFAULT false,
  is_departmental BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subject_id)
);

-- Add RLS policies for subject_configs
ALTER TABLE subject_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view subject configs"
  ON subject_configs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "IT_admin and principal can insert subject configs"
  ON subject_configs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('it_admin', 'principal')
    )
  );

CREATE POLICY "IT_admin and principal can update subject configs"
  ON subject_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('it_admin', 'principal')
    )
  );

CREATE POLICY "IT_admin and principal can delete subject configs"
  ON subject_configs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('it_admin', 'principal')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subject_configs_subject_id ON subject_configs(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_configs_is_paired ON subject_configs(is_paired_subject) WHERE is_paired_subject = true;
CREATE INDEX IF NOT EXISTS idx_subject_configs_is_departmental ON subject_configs(is_departmental) WHERE is_departmental = true;
CREATE INDEX IF NOT EXISTS idx_subject_configs_updated_at ON subject_configs(updated_at);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ subject_configs table created successfully!';
  RAISE NOTICE '📋 This table stores timetable configuration for each subject';
  RAISE NOTICE '🔒 Row Level Security policies applied';
  RAISE NOTICE '🔍 Indexes created for optimal performance';
END $$;