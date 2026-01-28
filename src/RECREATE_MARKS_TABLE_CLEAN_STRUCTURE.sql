-- ============================================
-- CLEAN MARKS TABLE RECREATION
-- ============================================
-- This creates a marks table with CLEAR separation between midterm and terminal marks
-- Each column is explicitly named so there's NO confusion about what goes where

-- STEP 1: Drop the old table (CAREFUL - this deletes all data!)
DROP TABLE IF EXISTS marks CASCADE;

-- STEP 2: Create the NEW clean marks table
CREATE TABLE marks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  
  -- Type: 'midterm' or 'terminal'
  -- Even though we have separate columns, we keep type for filtering
  type TEXT NOT NULL CHECK (type IN ('midterm', 'terminal')),
  
  -- ===================================
  -- MIDTERM MARKS (Max: CA1=10, CA2=10, Exam=20, Total=40)
  -- ===================================
  midterm_ca1 INTEGER CHECK (midterm_ca1 >= 0 AND midterm_ca1 <= 10),
  midterm_ca2 INTEGER CHECK (midterm_ca2 >= 0 AND midterm_ca2 <= 10),
  midterm_exam INTEGER CHECK (midterm_exam >= 0 AND midterm_exam <= 20),
  midterm_total INTEGER GENERATED ALWAYS AS (
    COALESCE(midterm_ca1, 0) + COALESCE(midterm_ca2, 0) + COALESCE(midterm_exam, 0)
  ) STORED,
  
  -- ===================================
  -- TERMINAL MARKS (Max: CA1=20, CA2=20, Exam=60, Total=100)
  -- ===================================
  terminal_ca1 DECIMAL(5,2) CHECK (terminal_ca1 >= 0 AND terminal_ca1 <= 20),  -- Can be decimal (e.g., 17.5)
  terminal_ca2 INTEGER CHECK (terminal_ca2 >= 0 AND terminal_ca2 <= 20),
  terminal_exam INTEGER CHECK (terminal_exam >= 0 AND terminal_exam <= 60),
  terminal_total INTEGER GENERATED ALWAYS AS (
    COALESCE(terminal_ca1, 0) + COALESCE(terminal_ca2, 0) + COALESCE(terminal_exam, 0)
  ) STORED,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'submitted', 'approved', 'rejected')),
  
  -- User tracking
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 3: Create indexes for performance
CREATE INDEX idx_marks_student_id ON marks(student_id);
CREATE INDEX idx_marks_exam_id ON marks(exam_id);
CREATE INDEX idx_marks_subject_id ON marks(subject_id);
CREATE INDEX idx_marks_class_id ON marks(class_id);
CREATE INDEX idx_marks_type ON marks(type);
CREATE INDEX idx_marks_status ON marks(status);
CREATE INDEX idx_marks_exam_subject ON marks(exam_id, subject_id);
CREATE INDEX idx_marks_exam_subject_class ON marks(exam_id, subject_id, class_id);

-- STEP 4: Create unique constraint
-- One midterm row per student per exam per subject per class
-- One terminal row per student per exam per subject per class
CREATE UNIQUE INDEX idx_marks_unique_entry ON marks(student_id, exam_id, subject_id, class_id, type);

-- STEP 5: Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_marks_updated_at
BEFORE UPDATE ON marks
FOR EACH ROW
EXECUTE FUNCTION update_marks_updated_at();

-- STEP 6: Add helpful comments
COMMENT ON TABLE marks IS 'Stores student marks for exams. Each student has TWO rows per exam/subject: one for midterm, one for terminal.';
COMMENT ON COLUMN marks.type IS 'Either "midterm" or "terminal" - determines which columns are used';
COMMENT ON COLUMN marks.midterm_ca1 IS 'Midterm Continuous Assessment 1 (Max: 10)';
COMMENT ON COLUMN marks.midterm_ca2 IS 'Midterm Continuous Assessment 2 (Max: 10)';
COMMENT ON COLUMN marks.midterm_exam IS 'Midterm Exam (Max: 20)';
COMMENT ON COLUMN marks.midterm_total IS 'Auto-calculated: midterm_ca1 + midterm_ca2 + midterm_exam (Max: 40)';
COMMENT ON COLUMN marks.terminal_ca1 IS 'Terminal CA1 - ALWAYS calculated as (midterm_ca1 + midterm_ca2 + midterm_exam) / 2 (Max: 20, can be decimal)';
COMMENT ON COLUMN marks.terminal_ca2 IS 'Terminal Continuous Assessment 2 (Max: 20)';
COMMENT ON COLUMN marks.terminal_exam IS 'Terminal Exam (Max: 60)';
COMMENT ON COLUMN marks.terminal_total IS 'Auto-calculated: terminal_ca1 + terminal_ca2 + terminal_exam (Max: 100)';
COMMENT ON COLUMN marks.class_id IS 'Preserves historical class context - student may have been promoted since exam was taken';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check table structure
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- Show constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'marks'::regclass;

-- Show indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'marks';

-- ============================================
-- EXAMPLE DATA (for testing)
-- ============================================

-- This shows what data will look like:

-- MIDTERM ROW (type='midterm')
-- student_id | exam_id | subject_id | class_id | type    | midterm_ca1 | midterm_ca2 | midterm_exam | midterm_total | terminal_ca1 | terminal_ca2 | terminal_exam | terminal_total | status
-- uuid123    | exam1   | math1      | jss1a    | midterm | 8           | 9           | 18           | 35            | NULL         | NULL         | NULL          | 0              | approved

-- TERMINAL ROW (type='terminal')  
-- student_id | exam_id | subject_id | class_id | type     | midterm_ca1 | midterm_ca2 | midterm_exam | midterm_total | terminal_ca1 | terminal_ca2 | terminal_exam | terminal_total | status
-- uuid123    | exam1   | math1      | jss1a    | terminal | NULL        | NULL        | NULL         | 0             | 17.5         | 18           | 55            | 90.5           | approved

-- ============================================
-- IMPORTANT NOTES
-- ============================================

-- 1. Each student has TWO rows per exam/subject:
--    - Row 1: type='midterm', has midterm_ca1/ca2/exam filled, terminal columns are NULL
--    - Row 2: type='terminal', has terminal_ca1/ca2/exam filled, midterm columns are NULL

-- 2. Terminal CA1 is ALWAYS calculated as:
--    terminal_ca1 = (midterm_ca1 + midterm_ca2 + midterm_exam) / 2
--    Example: (8 + 9 + 18) / 2 = 17.5

-- 3. The 'type' column is CRITICAL:
--    - type='midterm' → Use midterm_* columns
--    - type='terminal' → Use terminal_* columns

-- 4. Total columns are GENERATED (auto-calculated):
--    - midterm_total = midterm_ca1 + midterm_ca2 + midterm_exam
--    - terminal_total = terminal_ca1 + terminal_ca2 + terminal_exam

-- 5. Status workflow:
--    - draft → pending_approval → approved
--    - OR: draft → pending_approval → rejected → (back to draft)

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Marks table recreated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Table structure:';
  RAISE NOTICE '  - student_id, exam_id, subject_id, class_id (foreign keys)';
  RAISE NOTICE '  - type (midterm or terminal)';
  RAISE NOTICE '  - midterm_ca1, midterm_ca2, midterm_exam, midterm_total';
  RAISE NOTICE '  - terminal_ca1, terminal_ca2, terminal_exam, terminal_total';
  RAISE NOTICE '  - status, submitted_by, approved_by';
  RAISE NOTICE '  - created_at, updated_at';
  RAISE NOTICE '';
  RAISE NOTICE 'Each student has 2 rows per exam/subject:';
  RAISE NOTICE '  1. type=midterm → midterm columns filled';
  RAISE NOTICE '  2. type=terminal → terminal columns filled';
  RAISE NOTICE '';
  RAISE NOTICE 'Terminal CA1 formula: (midterm_ca1 + midterm_ca2 + midterm_exam) / 2';
END $$;
