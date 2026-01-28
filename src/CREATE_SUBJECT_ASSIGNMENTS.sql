-- =====================================================
-- CREATE SUBJECT_ASSIGNMENTS TABLE
-- =====================================================
-- This table creates a many-to-many relationship between:
-- - Subjects (e.g., Mathematics)
-- - Classes (e.g., JSS1 Gold, JSS1 Diamond)
-- - Teachers (who teaches which subject in which class)
--
-- Example:
-- Mathematics → JSS1 Gold → John (teacher)
-- Mathematics → JSS1 Diamond → Kelvin (teacher)
-- Mathematics → JSS2 Gold → John (teacher)
-- =====================================================

-- Create the subject_assignments table
CREATE TABLE IF NOT EXISTS subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one teacher per subject per class
  UNIQUE(subject_id, class_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subject_assignments_subject_id ON subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_class_id ON subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_subject_assignments_teacher_id ON subject_assignments(teacher_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_subject_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subject_assignments_updated_at
  BEFORE UPDATE ON subject_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_subject_assignments_updated_at();

-- Enable Row Level Security
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read all assignments
CREATE POLICY "Allow authenticated users to read subject assignments"
  ON subject_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage assignments (for now)
-- In production, you might want to restrict this to admins only
CREATE POLICY "Allow authenticated users to manage subject assignments"
  ON subject_assignments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- OPTIONAL: Migrate existing data
-- =====================================================
-- If you have subjects with main_teacher_id set, and you want to
-- create initial assignments for all classes of the same level,
-- uncomment and run this:

/*
INSERT INTO subject_assignments (subject_id, class_id, teacher_id)
SELECT 
  s.id as subject_id,
  c.id as class_id,
  s.main_teacher_id as teacher_id
FROM subjects s
CROSS JOIN classes c
WHERE 
  s.main_teacher_id IS NOT NULL
  AND (
    (s.level = 'junior' AND c.name LIKE 'JSS%')
    OR
    (s.level = 'senior' AND c.name LIKE 'SSS%')
  )
ON CONFLICT (subject_id, class_id) DO NOTHING;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subject_assignments'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'subject_assignments';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'subject_assignments';

COMMENT ON TABLE subject_assignments IS 'Maps which teacher teaches which subject in which class';
COMMENT ON COLUMN subject_assignments.subject_id IS 'The subject being taught (e.g., Mathematics)';
COMMENT ON COLUMN subject_assignments.class_id IS 'The class where the subject is taught (e.g., JSS1 Gold)';
COMMENT ON COLUMN subject_assignments.teacher_id IS 'The teacher who teaches this subject in this class';
