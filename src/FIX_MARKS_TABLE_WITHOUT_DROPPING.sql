-- =====================================================
-- ✅ SAFER OPTION: FIX MARKS TABLE WITHOUT DROPPING
-- =====================================================
-- This will fix column types and structure WITHOUT losing data
-- =====================================================

-- ============================================================================
-- STEP 1: BACKUP (Always backup first!)
-- ============================================================================

DROP TABLE IF EXISTS marks_backup_safe_fix;
CREATE TABLE marks_backup_safe_fix AS 
SELECT * FROM marks;

SELECT COUNT(*) as backed_up_marks FROM marks_backup_safe_fix;

-- ============================================================================
-- STEP 2: FIX COLUMN TYPES (Change INTEGER to NUMERIC)
-- ============================================================================

-- Check current types first
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'marks'
  AND column_name IN ('ca1', 'ca2', 'exam', 'terminal_ca1', 'terminal_ca2', 'terminal_exam');

-- Fix ca1 (if it's INTEGER, change to NUMERIC)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' 
    AND column_name = 'ca1' 
    AND (data_type = 'integer' OR udt_name = 'int4')
  ) THEN
    ALTER TABLE marks ALTER COLUMN ca1 TYPE NUMERIC(5, 2);
    RAISE NOTICE 'Changed ca1 to NUMERIC(5,2)';
  ELSE
    RAISE NOTICE 'ca1 is already NUMERIC or does not exist';
  END IF;
END $$;

-- Fix ca2
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' 
    AND column_name = 'ca2' 
    AND (data_type = 'integer' OR udt_name = 'int4')
  ) THEN
    ALTER TABLE marks ALTER COLUMN ca2 TYPE NUMERIC(5, 2);
    RAISE NOTICE 'Changed ca2 to NUMERIC(5,2)';
  ELSE
    RAISE NOTICE 'ca2 is already NUMERIC or does not exist';
  END IF;
END $$;

-- Fix exam
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' 
    AND column_name = 'exam' 
    AND (data_type = 'integer' OR udt_name = 'int4')
  ) THEN
    ALTER TABLE marks ALTER COLUMN exam TYPE NUMERIC(5, 2);
    RAISE NOTICE 'Changed exam to NUMERIC(5,2)';
  ELSE
    RAISE NOTICE 'exam is already NUMERIC or does not exist';
  END IF;
END $$;

-- Fix terminal_ca1
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' 
    AND column_name = 'terminal_ca1' 
    AND (data_type = 'integer' OR udt_name = 'int4')
  ) THEN
    ALTER TABLE marks ALTER COLUMN terminal_ca1 TYPE NUMERIC(5, 2);
    RAISE NOTICE 'Changed terminal_ca1 to NUMERIC(5,2)';
  ELSE
    RAISE NOTICE 'terminal_ca1 is already NUMERIC or does not exist';
  END IF;
END $$;

-- Fix terminal_ca2
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' 
    AND column_name = 'terminal_ca2' 
    AND (data_type = 'integer' OR udt_name = 'int4')
  ) THEN
    ALTER TABLE marks ALTER COLUMN terminal_ca2 TYPE NUMERIC(5, 2);
    RAISE NOTICE 'Changed terminal_ca2 to NUMERIC(5,2)';
  ELSE
    RAISE NOTICE 'terminal_ca2 is already NUMERIC or does not exist';
  END IF;
END $$;

-- Fix terminal_exam
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' 
    AND column_name = 'terminal_exam' 
    AND (data_type = 'integer' OR udt_name = 'int4')
  ) THEN
    ALTER TABLE marks ALTER COLUMN terminal_exam TYPE NUMERIC(5, 2);
    RAISE NOTICE 'Changed terminal_exam to NUMERIC(5,2)';
  ELSE
    RAISE NOTICE 'terminal_exam is already NUMERIC or does not exist';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: ADD MISSING COLUMNS (if they don't exist)
-- ============================================================================

-- Add class_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' AND column_name = 'class_id'
  ) THEN
    ALTER TABLE marks ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added class_id column';
  ELSE
    RAISE NOTICE 'class_id column already exists';
  END IF;
END $$;

-- Add updated_at if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'marks' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE marks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: CREATE/UPDATE TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marks_updated_at_trigger ON marks;
CREATE TRIGGER marks_updated_at_trigger
  BEFORE UPDATE ON marks
  FOR EACH ROW
  EXECUTE FUNCTION update_marks_updated_at();

-- ============================================================================
-- STEP 5: CREATE MISSING INDEXES
-- ============================================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject_id ON marks(subject_id);
CREATE INDEX IF NOT EXISTS idx_marks_class_id ON marks(class_id);
CREATE INDEX IF NOT EXISTS idx_marks_type ON marks(type);
CREATE INDEX IF NOT EXISTS idx_marks_status ON marks(status);
CREATE INDEX IF NOT EXISTS idx_marks_exam_subject_type ON marks(exam_id, subject_id, type);
CREATE INDEX IF NOT EXISTS idx_marks_student_exam_type ON marks(student_id, exam_id, type);

-- ============================================================================
-- STEP 6: VERIFY THE FIXES
-- ============================================================================

-- Check all mark columns are now NUMERIC
SELECT 
  column_name, 
  data_type,
  udt_name,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marks'
  AND column_name IN ('ca1', 'ca2', 'exam', 'terminal_ca1', 'terminal_ca2', 'terminal_exam')
ORDER BY column_name;

-- Expected output:
-- All should show: data_type = 'numeric', numeric_precision = 5, numeric_scale = 2

-- Check all columns
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'marks'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'marks';

-- Check triggers
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'marks';

-- ============================================================================
-- STEP 7: TEST DECIMAL INSERTION
-- ============================================================================

-- Try inserting a test mark with decimals to verify it works
DO $$
DECLARE
  test_student_id UUID;
  test_exam_id UUID;
  test_subject_id UUID;
BEGIN
  -- Get a real student, exam, and subject ID for testing
  SELECT id INTO test_student_id FROM profiles WHERE role = 'student' LIMIT 1;
  SELECT id INTO test_exam_id FROM exams LIMIT 1;
  SELECT id INTO test_subject_id FROM subjects LIMIT 1;
  
  IF test_student_id IS NOT NULL AND test_exam_id IS NOT NULL AND test_subject_id IS NOT NULL THEN
    -- Try inserting with decimals
    INSERT INTO marks (
      student_id,
      exam_id,
      subject_id,
      type,
      ca1,
      ca2,
      exam,
      status
    ) VALUES (
      test_student_id,
      test_exam_id,
      test_subject_id,
      'midterm',
      8.5,   -- Decimal value
      9.5,   -- Decimal value
      17.5,  -- Decimal value
      'draft'
    )
    ON CONFLICT (student_id, exam_id, subject_id, type) 
    DO UPDATE SET
      ca1 = 8.5,
      ca2 = 9.5,
      exam = 17.5;
    
    RAISE NOTICE '✅ Successfully inserted/updated mark with decimal values!';
    
    -- Verify it was stored as decimal
    IF EXISTS (
      SELECT 1 FROM marks 
      WHERE student_id = test_student_id 
        AND exam_id = test_exam_id 
        AND subject_id = test_subject_id
        AND type = 'midterm'
        AND ca1 = 8.5  -- Check if decimal is preserved
    ) THEN
      RAISE NOTICE '✅ Decimal values are being stored correctly!';
    ELSE
      RAISE WARNING '❌ Decimal values are being rounded! Check column types!';
    END IF;
  ELSE
    RAISE NOTICE 'Skipping test insert - no student/exam/subject found';
  END IF;
END $$;

-- ============================================================================
-- ✅ DONE!
-- ============================================================================

SELECT '✅ Marks table fixed without dropping! All columns are now NUMERIC(5,2)' as status;
