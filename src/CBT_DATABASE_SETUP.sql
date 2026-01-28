-- ========================================
-- CBT (Computer-Based Testing) MODULE
-- Database Tables Setup - CORRECTED VERSION
-- ========================================

-- ========================================
-- TABLE 1: cbt_settings
-- Global CBT configuration (anti-cheat, randomization, etc.)
-- ========================================
CREATE TABLE IF NOT EXISTS cbt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allow_calculator BOOLEAN DEFAULT false,
  disable_copy_paste BOOLEAN DEFAULT true,
  disable_right_click BOOLEAN DEFAULT true,
  randomize_questions BOOLEAN DEFAULT true,
  randomize_options BOOLEAN DEFAULT true,
  show_results_after BOOLEAN DEFAULT true,
  time_limit_per_question INTEGER DEFAULT 0,
  allow_test_review BOOLEAN DEFAULT true,
  notify_teacher_on_completion BOOLEAN DEFAULT true,
  show_correct_answers BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- TABLE 2: cbt_schedules
-- Enables/schedules CBT for specific Subject+Class+Session+Term
-- ========================================
CREATE TABLE IF NOT EXISTS cbt_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  class TEXT NOT NULL,
  session TEXT,
  term TEXT,
  is_enabled BOOLEAN DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, class, session, term)
);

-- ========================================
-- TABLE 3: cbt_submissions
-- Stores student exam attempts and responses
-- ========================================
CREATE TABLE IF NOT EXISTS cbt_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES cbt_schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  student_name TEXT,
  student_class TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_taken_minutes INTEGER,
  responses JSONB NOT NULL DEFAULT '[]', -- Array of {question_id, answer, is_correct, marks_awarded}
  total_score NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'in_progress', -- in_progress, submitted, graded
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cbt_schedules_subject_class ON cbt_schedules(subject, class);
CREATE INDEX IF NOT EXISTS idx_cbt_schedules_enabled ON cbt_schedules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_cbt_schedules_dates ON cbt_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_schedule_id ON cbt_submissions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_student_id ON cbt_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_submissions_status ON cbt_submissions(status);

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE cbt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_submissions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES FOR cbt_settings
-- ========================================

-- Everyone can read settings
CREATE POLICY "Anyone can view CBT settings"
  ON cbt_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update CBT settings"
  ON cbt_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'it_admin')
    )
  );

-- ========================================
-- RLS POLICIES FOR cbt_schedules
-- ========================================

-- Admins can do everything
CREATE POLICY "Admins can manage schedules"
  ON cbt_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'it_admin')
    )
  );

-- Students can view enabled schedules for their class
CREATE POLICY "Students can view enabled schedules"
  ON cbt_schedules FOR SELECT
  TO authenticated
  USING (
    is_enabled = true AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
      AND profiles.class = cbt_schedules.class
    )
  );

-- ========================================
-- RLS POLICIES FOR cbt_submissions
-- ========================================

-- Students can view their own submissions
CREATE POLICY "Students can view their submissions"
  ON cbt_submissions FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can create their own submissions
CREATE POLICY "Students can create submissions"
  ON cbt_submissions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students can update their own in-progress submissions
CREATE POLICY "Students can update their in-progress submissions"
  ON cbt_submissions FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() AND status = 'in_progress');

-- Admins and teachers can view all submissions
CREATE POLICY "Staff can view all submissions"
  ON cbt_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'it_admin', 'teacher')
    )
  );

-- ========================================
-- TRIGGER: Update updated_at timestamp
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cbt_settings_updated_at
  BEFORE UPDATE ON cbt_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cbt_schedules_updated_at
  BEFORE UPDATE ON cbt_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- HELPFUL QUERIES
-- ========================================

-- View all enabled CBT sessions
-- SELECT 
--   s.id, s.subject, s.class, s.session, s.term,
--   s.is_enabled, s.start_date, s.end_date, s.duration_minutes,
--   COUNT(DISTINCT sub.student_id) as students_attempted,
--   AVG(CASE WHEN sub.status = 'submitted' THEN sub.percentage END) as avg_score
-- FROM cbt_schedules s
-- LEFT JOIN cbt_submissions sub ON s.id = sub.schedule_id
-- WHERE s.is_enabled = true
-- GROUP BY s.id, s.subject, s.class, s.session, s.term, s.is_enabled, s.start_date, s.end_date, s.duration_minutes
-- ORDER BY s.created_at DESC;

-- View student submissions for a schedule
-- SELECT 
--   sub.id, sub.student_name, sub.student_class,
--   sub.total_score, sub.percentage, sub.status,
--   sub.started_at, sub.submitted_at,
--   sub.time_taken_minutes
-- FROM cbt_submissions sub
-- WHERE sub.schedule_id = 'YOUR_SCHEDULE_ID_HERE'
-- ORDER BY sub.percentage DESC;
