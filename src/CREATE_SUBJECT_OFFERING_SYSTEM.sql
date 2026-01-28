-- ================================================================
-- SUBJECT OFFERING SYSTEM - COMPLETE DATABASE SCHEMA
-- ================================================================
-- This creates a two-tier subject assignment system:
-- 1. Class-level: Which subjects are available for each class
-- 2. Student-level: Which subjects each student actually offers
-- ================================================================

-- ================================================================
-- TABLE 1: class_subjects (Tier 1 - Class Level Configuration)
-- ================================================================
-- Defines which subjects are AVAILABLE for each class
-- IT Admin configures this once per class
-- ================================================================

CREATE TABLE IF NOT EXISTS class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_compulsory BOOLEAN DEFAULT false, -- true = all students must take it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure no duplicate subject assignments to same class
  CONSTRAINT unique_class_subject UNIQUE(class_id, subject_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_compulsory ON class_subjects(class_id, is_compulsory);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_class_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_class_subjects_updated_at
  BEFORE UPDATE ON class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_class_subjects_updated_at();

-- Enable RLS
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all authenticated users"
  ON class_subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert/update/delete for IT Admin and Director"
  ON class_subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('it_admin', 'director')
    )
  );

COMMENT ON TABLE class_subjects IS 'Tier 1: Subjects available for each class. Configured by IT Admin.';
COMMENT ON COLUMN class_subjects.is_compulsory IS 'If true, all students in class are auto-assigned this subject';

-- ================================================================
-- TABLE 2: student_subjects (Tier 2 - Student Level Assignment)
-- ================================================================
-- Defines which specific subjects each student offers
-- Can vary by session (for historical tracking)
-- ================================================================

CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session TEXT NOT NULL, -- e.g., '2024/2025' - when student started offering this
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Student can't be assigned same subject twice in same session/class
  CONSTRAINT unique_student_subject_session UNIQUE(student_id, subject_id, class_id, session)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_class ON student_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_session ON student_subjects(student_id, session);
CREATE INDEX IF NOT EXISTS idx_student_subjects_status ON student_subjects(status);

-- Composite index for most common query: active subjects for student in session
CREATE INDEX IF NOT EXISTS idx_student_subjects_active_lookup 
  ON student_subjects(student_id, session, status) 
  WHERE status = 'active';

-- Composite index for marks entry: students offering a subject in a class
CREATE INDEX IF NOT EXISTS idx_student_subjects_marks_entry 
  ON student_subjects(subject_id, class_id, status) 
  WHERE status = 'active';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_student_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_student_subjects_updated_at
  BEFORE UPDATE ON student_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_student_subjects_updated_at();

-- Enable RLS
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view their own subjects"
  ON student_subjects FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('it_admin', 'director', 'teacher', 'principal')
    )
  );

CREATE POLICY "IT Admin and Director can manage all student subjects"
  ON student_subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('it_admin', 'director')
    )
  );

COMMENT ON TABLE student_subjects IS 'Tier 2: Specific subjects each student offers. Assigned by IT Admin.';
COMMENT ON COLUMN student_subjects.status IS 'active = currently offering, dropped = mid-session drop, completed = finished (e.g., after promotion)';
COMMENT ON COLUMN student_subjects.session IS 'Academic session when student started offering this subject (for historical tracking)';

-- ================================================================
-- VALIDATION FUNCTION: Check if student can be assigned a subject
-- ================================================================
-- Ensures subject is available for student's class before assignment

CREATE OR REPLACE FUNCTION validate_student_subject_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this subject is available for the student's class
  IF NOT EXISTS (
    SELECT 1 FROM class_subjects
    WHERE class_subjects.class_id = NEW.class_id
    AND class_subjects.subject_id = NEW.subject_id
  ) THEN
    RAISE EXCEPTION 'Subject % is not available for class %', NEW.subject_id, NEW.class_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_student_subject
  BEFORE INSERT OR UPDATE ON student_subjects
  FOR EACH ROW
  EXECUTE FUNCTION validate_student_subject_assignment();

-- ================================================================
-- HELPER FUNCTION: Auto-assign compulsory subjects to students
-- ================================================================
-- Call this when adding new students to a class or when marking subjects as compulsory

CREATE OR REPLACE FUNCTION auto_assign_compulsory_subjects(
  p_class_id UUID,
  p_session TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Get all compulsory subjects for this class
  INSERT INTO student_subjects (student_id, subject_id, class_id, session, status)
  SELECT 
    p.id AS student_id,
    cs.subject_id,
    cs.class_id,
    p_session,
    'active'
  FROM profiles p
  CROSS JOIN class_subjects cs
  WHERE p.class_id = p_class_id
    AND p.role = 'student'
    AND p.status = 'active' -- Only active students
    AND cs.class_id = p_class_id
    AND cs.is_compulsory = true
  ON CONFLICT (student_id, subject_id, class_id, session) 
  DO NOTHING; -- Skip if already assigned
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_assign_compulsory_subjects IS 'Auto-assigns all compulsory subjects to students in a class for a session';

-- ================================================================
-- HELPER FUNCTION: Get students who offer a specific subject
-- ================================================================
-- Used by marks entry and result publishing

CREATE OR REPLACE FUNCTION get_students_offering_subject(
  p_subject_id UUID,
  p_class_id UUID,
  p_session TEXT
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  admission_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS student_id,
    (p.first_name || ' ' || p.last_name) AS student_name,
    p.admission_number
  FROM profiles p
  INNER JOIN student_subjects ss ON ss.student_id = p.id
  WHERE ss.subject_id = p_subject_id
    AND ss.class_id = p_class_id
    AND ss.session = p_session
    AND ss.status = 'active'
    AND p.role = 'student'
    AND p.status = 'active'
  ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_students_offering_subject IS 'Returns list of students who offer a specific subject in a class for a session';

-- ================================================================
-- HELPER FUNCTION: Update student subjects on promotion
-- ================================================================
-- When student is promoted, carry forward their subject selections

CREATE OR REPLACE FUNCTION carry_forward_student_subjects_on_promotion(
  p_student_id UUID,
  p_old_class_id UUID,
  p_new_class_id UUID,
  p_old_session TEXT,
  p_new_session TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Mark old subjects as completed
  UPDATE student_subjects
  SET status = 'completed'
  WHERE student_id = p_student_id
    AND class_id = p_old_class_id
    AND session = p_old_session
    AND status = 'active';
  
  -- Create new subject assignments for new class/session
  -- Only carry forward subjects that are available in the new class
  INSERT INTO student_subjects (student_id, subject_id, class_id, session, status)
  SELECT 
    p_student_id,
    ss.subject_id,
    p_new_class_id,
    p_new_session,
    'active'
  FROM student_subjects ss
  INNER JOIN class_subjects cs ON cs.subject_id = ss.subject_id AND cs.class_id = p_new_class_id
  WHERE ss.student_id = p_student_id
    AND ss.class_id = p_old_class_id
    AND ss.session = p_old_session
  ON CONFLICT (student_id, subject_id, class_id, session) 
  DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION carry_forward_student_subjects_on_promotion IS 'Carries forward student subject offerings when promoted to new class';

-- ================================================================
-- SAMPLE DATA FOR TESTING (Optional - Remove in production)
-- ================================================================

DO $$
DECLARE
  v_class_id UUID;
  v_subject_id UUID;
  v_student_id UUID;
BEGIN
  -- Only insert sample data if tables are empty
  IF NOT EXISTS (SELECT 1 FROM class_subjects LIMIT 1) THEN
    RAISE NOTICE 'Sample data: Skipping - configure via IT Admin UI instead';
    -- You can add sample data here for testing if needed
  END IF;
END $$;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- View class subjects configuration
CREATE OR REPLACE VIEW class_subjects_view AS
SELECT 
  c.name AS class_name,
  c.level AS class_level,
  s.name AS subject_name,
  s.code AS subject_code,
  cs.is_compulsory,
  cs.created_at
FROM class_subjects cs
INNER JOIN classes c ON c.id = cs.class_id
INNER JOIN subjects s ON s.id = cs.subject_id
ORDER BY c.name, s.name;

COMMENT ON VIEW class_subjects_view IS 'Shows which subjects are available for each class';

-- View student subject assignments
CREATE OR REPLACE VIEW student_subjects_view AS
SELECT 
  (p.first_name || ' ' || p.last_name) AS student_name,
  p.admission_number,
  c.name AS class_name,
  s.name AS subject_name,
  ss.session,
  ss.status,
  ss.assigned_at
FROM student_subjects ss
INNER JOIN profiles p ON p.id = ss.student_id
INNER JOIN classes c ON c.id = ss.class_id
INNER JOIN subjects s ON s.id = ss.subject_id
ORDER BY p.first_name, p.last_name, s.name;

COMMENT ON VIEW student_subjects_view IS 'Shows which subjects each student offers';

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Subject Offering System created successfully!';
  RAISE NOTICE '📊 Tables created: class_subjects, student_subjects';
  RAISE NOTICE '🔧 Functions created: auto_assign_compulsory_subjects, get_students_offering_subject, carry_forward_student_subjects_on_promotion';
  RAISE NOTICE '👁️ Views created: class_subjects_view, student_subjects_view';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Configure class subjects via IT Admin UI';
  RAISE NOTICE '   2. Assign subjects to students';
  RAISE NOTICE '   3. Marks entry will automatically filter by subject offerings';
END $$;
