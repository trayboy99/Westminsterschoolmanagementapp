-- =====================================================
-- 🔥 COMPLETE MARKS TABLE RECREATION
-- =====================================================
-- ⚠️ WARNING: This will DELETE ALL MARKS DATA!
-- Only run this if you're absolutely sure you need to start fresh
-- =====================================================

-- ============================================================================
-- STEP 1: BACKUP EXISTING MARKS (CRITICAL!)
-- ============================================================================

-- Create backup table
DROP TABLE IF EXISTS marks_backup_before_recreation;
CREATE TABLE marks_backup_before_recreation AS 
SELECT * FROM marks;

-- Verify backup
SELECT COUNT(*) as backed_up_marks FROM marks_backup_before_recreation;

-- ============================================================================
-- STEP 2: DROP OLD MARKS TABLE
-- ============================================================================

DROP TABLE IF EXISTS marks CASCADE;

-- ============================================================================
-- STEP 3: CREATE NEW MARKS TABLE (CORRECT STRUCTURE)
-- ============================================================================

CREATE TABLE marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  
  -- Mark Type (midterm or terminal)
  type TEXT NOT NULL CHECK (type IN ('midterm', 'terminal')),
  
  -- ✅ MIDTERM MARKS (NUMERIC for decimal support)
  ca1 NUMERIC(5, 2),           -- Max 999.99
  ca2 NUMERIC(5, 2),           -- Max 999.99
  exam NUMERIC(5, 2),          -- Max 999.99
  
  -- ✅ TERMINAL MARKS (NUMERIC for decimal support)
  terminal_ca1 NUMERIC(5, 2),  -- Max 999.99
  terminal_ca2 NUMERIC(5, 2),  -- Max 999.99
  terminal_exam NUMERIC(5, 2), -- Max 999.99
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  
  -- Metadata
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ✅ UNIQUE CONSTRAINT: One mark entry per student/exam/subject/type
  UNIQUE(student_id, exam_id, subject_id, type)
);

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying marks by student
CREATE INDEX idx_marks_student_id ON marks(student_id);

-- Index for querying marks by exam
CREATE INDEX idx_marks_exam_id ON marks(exam_id);

-- Index for querying marks by subject
CREATE INDEX idx_marks_subject_id ON marks(subject_id);

-- Index for querying marks by class
CREATE INDEX idx_marks_class_id ON marks(class_id);

-- Index for querying marks by type
CREATE INDEX idx_marks_type ON marks(type);

-- Index for querying marks by status
CREATE INDEX idx_marks_status ON marks(status);

-- Composite index for common query patterns
CREATE INDEX idx_marks_exam_subject_type ON marks(exam_id, subject_id, type);
CREATE INDEX idx_marks_student_exam_type ON marks(student_id, exam_id, type);

-- ============================================================================
-- STEP 5: CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS marks_updated_at_trigger ON marks;
CREATE TRIGGER marks_updated_at_trigger
  BEFORE UPDATE ON marks
  FOR EACH ROW
  EXECUTE FUNCTION update_marks_updated_at();

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE marks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS marks_select_policy ON marks;
DROP POLICY IF EXISTS marks_insert_policy ON marks;
DROP POLICY IF EXISTS marks_update_policy ON marks;
DROP POLICY IF EXISTS marks_delete_policy ON marks;

-- ✅ SELECT: Students can see their own marks, teachers can see all
CREATE POLICY marks_select_policy ON marks
  FOR SELECT
  USING (
    auth.uid() = student_id OR -- Students see their own
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin', 'principal', 'director', 'it_admin')
    )
  );

-- ✅ INSERT: Only teachers and admins can insert
CREATE POLICY marks_insert_policy ON marks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin', 'principal', 'it_admin')
    )
  );

-- ✅ UPDATE: Only teachers and admins can update
CREATE POLICY marks_update_policy ON marks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin', 'principal', 'it_admin')
    )
  );

-- ✅ DELETE: Only admins can delete
CREATE POLICY marks_delete_policy ON marks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'it_admin')
    )
  );

-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================

-- Check table structure
SELECT 
  column_name, 
  data_type,
  udt_name,
  is_nullable,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- Check constraints
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'marks'::regclass;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'marks';

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'marks';

-- ============================================================================
-- STEP 8: OPTIONAL - RESTORE DATA FROM BACKUP
-- ============================================================================

-- ⚠️ ONLY run this if you want to restore old data
-- You may need to adjust the columns to match the new structure

/*
INSERT INTO marks (
  id,
  student_id,
  exam_id,
  subject_id,
  class_id,
  type,
  ca1,
  ca2,
  exam,
  terminal_ca1,
  terminal_ca2,
  terminal_exam,
  status,
  submitted_by,
  submitted_at,
  approved_by,
  approved_at,
  created_at,
  updated_at
)
SELECT 
  id,
  student_id,
  exam_id,
  subject_id,
  class_id,
  type,
  ROUND(ca1::numeric, 0) as ca1,               -- Round to whole number
  ROUND(ca2::numeric, 0) as ca2,               -- Round to whole number
  ROUND(exam::numeric, 0) as exam,             -- Round to whole number
  ROUND(terminal_ca1::numeric, 0) as terminal_ca1,  -- Round to whole number
  ROUND(terminal_ca2::numeric, 0) as terminal_ca2,  -- Round to whole number
  ROUND(terminal_exam::numeric, 0) as terminal_exam, -- Round to whole number
  status,
  submitted_by,
  submitted_at,
  approved_by,
  approved_at,
  created_at,
  updated_at
FROM marks_backup_before_recreation;

-- Verify restoration
SELECT COUNT(*) as restored_marks FROM marks;
*/

-- ============================================================================
-- ✅ DONE!
-- ============================================================================

-- Your marks table is now:
-- ✅ Using NUMERIC(5,2) for all mark columns (supports decimals)
-- ✅ Has proper indexes for performance
-- ✅ Has RLS policies for security
-- ✅ Has updated_at trigger
-- ✅ Has unique constraint to prevent duplicates
-- ✅ Ready for the new marks entry system

SELECT '✅ Marks table recreation complete!' as status;
