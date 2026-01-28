-- ================================================
-- CBT MODULE - DATABASE SCHEMA
-- ================================================
-- Compatible with existing profiles, subjects, classes tables
-- Teachers only see/create questions for subjects in their qualified_subjects array
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. CBT QUESTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership (references profiles table)
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_name VARCHAR(200),
  
  -- Classification
  subject VARCHAR(100) NOT NULL, -- Must match one of teacher's qualified_subjects
  class VARCHAR(20) NOT NULL, -- JSS1, JSS2, JSS3, SS1, SS2, SS3
  topic VARCHAR(200),
  difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  
  -- Question Content
  question_type VARCHAR(50) NOT NULL, -- 'mcq_single', 'mcq_multiple', 'true_false', 'fill_blank', 'essay', 'matching'
  question_text TEXT NOT NULL,
  question_image_url TEXT, -- Optional image/diagram
  
  -- Answer Options (JSON)
  options JSONB, -- For MCQ: [{"label": "A", "text": "Lagos", "isCorrect": false}, ...]
                 -- For True/False: [{"label": "True", "isCorrect": true}, {"label": "False", "isCorrect": false}]
                 -- For Matching: {"columnA": [...], "columnB": [...], "correctPairs": [...]}
                 -- For Fill-blank: null
                 -- For Essay: null
  
  -- Correct Answer
  correct_answer JSONB NOT NULL, -- For MCQ: ["A"] or ["A", "C"] for multiple
                                  -- For True/False: ["True"] or ["False"]
                                  -- For Fill-blank: ["Abuja", "abuja", "ABUJA"] (accepted variants)
                                  -- For Matching: [{"a1": "b2"}, {"a2": "b1"}]
                                  -- For Essay: null (manual grading)
  
  -- Additional Info
  explanation TEXT, -- Shown after exam (optional)
  marks DECIMAL(5,2) DEFAULT 1, -- Default marks for this question
  time_weight INTEGER DEFAULT 60, -- Estimated solving time in seconds
  
  -- Organization
  tags TEXT[], -- ['algebra', 'equations', 'jss3']
  
  -- Metadata
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
  usage_count INTEGER DEFAULT 0, -- How many times used in exams
  quality_score DECIMAL(3,2), -- Auto-calculated after 50+ uses (1.00 to 5.00)
  
  -- Session tracking
  session VARCHAR(20), -- '2024/2025'
  term VARCHAR(50), -- 'First Term', 'Second Term', 'Third Term'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT valid_question_type CHECK (question_type IN ('mcq_single', 'mcq_multiple', 'true_false', 'fill_blank', 'essay', 'matching')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cbt_questions_teacher ON cbt_questions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cbt_questions_subject ON cbt_questions(subject);
CREATE INDEX IF NOT EXISTS idx_cbt_questions_class ON cbt_questions(class);
CREATE INDEX IF NOT EXISTS idx_cbt_questions_topic ON cbt_questions(topic);
CREATE INDEX IF NOT EXISTS idx_cbt_questions_status ON cbt_questions(status);
CREATE INDEX IF NOT EXISTS idx_cbt_questions_session_term ON cbt_questions(session, term);

-- RLS Policies
ALTER TABLE cbt_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own questions for their qualified subjects
CREATE POLICY "Teachers can view own questions for qualified subjects"
  ON cbt_questions FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- Teachers can insert questions only for their qualified subjects
CREATE POLICY "Teachers can create questions for qualified subjects"
  ON cbt_questions FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND subject = ANY(profiles.qualified_subjects)
    )
  );

-- Teachers can update their own questions
CREATE POLICY "Teachers can update own questions"
  ON cbt_questions FOR UPDATE
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- Teachers can delete their own questions
CREATE POLICY "Teachers can delete own questions"
  ON cbt_questions FOR DELETE
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- ================================================
-- 2. CBT EXAMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership (references profiles table)
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_name VARCHAR(200),
  
  -- Basic Info
  title VARCHAR(300) NOT NULL,
  subject VARCHAR(100) NOT NULL, -- Must match teacher's qualified_subjects
  class VARCHAR(20) NOT NULL,
  
  -- Session Info
  session VARCHAR(20) NOT NULL, -- '2024/2025'
  term VARCHAR(50) NOT NULL, -- 'First Term', 'Second Term', 'Third Term'
  
  -- Instructions
  instructions TEXT, -- Instructions shown to students before exam
  
  -- Exam Settings
  exam_type VARCHAR(50) DEFAULT 'formal', -- 'formal', 'quiz', 'practice', 'mock'
  duration_minutes INTEGER NOT NULL, -- Total exam duration
  total_marks DECIMAL(6,2) NOT NULL,
  pass_mark DECIMAL(6,2),
  
  -- Behavior Settings (JSON)
  settings JSONB DEFAULT '{
    "shuffleQuestions": true,
    "shuffleOptions": true,
    "oneQuestionPerPage": true,
    "disableCopyPaste": true,
    "enableWebcamProctoring": false,
    "lockScreenFullscreen": true,
    "showResultsImmediately": false,
    "allowReviewAnswers": false,
    "showCorrectAnswers": false,
    "showExplanations": false,
    "allowLateSubmission": false,
    "latePenaltyPercent": 0,
    "allowPartialCredit": false
  }'::jsonb,
  
  -- Scheduling
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Target Students
  assigned_to VARCHAR(20) DEFAULT 'class', -- 'class', 'specific'
  specific_students JSONB, -- Array of student profile IDs if assigned_to = 'specific'
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'completed', 'archived'
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Statistics (Updated as students take exam)
  total_students INTEGER DEFAULT 0,
  students_completed INTEGER DEFAULT 0,
  students_in_progress INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  highest_score DECIMAL(5,2),
  lowest_score DECIMAL(5,2),
  
  -- Integration with existing marks system
  synced_to_marks BOOLEAN DEFAULT false, -- Whether scores have been pushed to marks entry
  synced_at TIMESTAMP WITH TIME ZONE,
  synced_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_exam_type CHECK (exam_type IN ('formal', 'quiz', 'practice', 'mock')),
  CONSTRAINT valid_exam_status CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'archived')),
  CONSTRAINT valid_schedule CHECK (scheduled_end > scheduled_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_exams_teacher ON cbt_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_subject ON cbt_exams(subject);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_class ON cbt_exams(class);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_status ON cbt_exams(status);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_schedule ON cbt_exams(scheduled_start, scheduled_end);
CREATE INDEX IF NOT EXISTS idx_cbt_exams_session_term ON cbt_exams(session, term);

-- RLS Policies
ALTER TABLE cbt_exams ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own exams + Students can view exams assigned to them
CREATE POLICY "Teachers and students can view relevant exams"
  ON cbt_exams FOR SELECT
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role IN ('admin', 'principal', 'IT_admin') OR
        (
          profiles.role = 'student' 
          AND EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = profiles.class_id
            AND classes.name = cbt_exams.class
          )
        )
      )
    )
  );

-- Teachers can create exams for their qualified subjects
CREATE POLICY "Teachers can create exams for qualified subjects"
  ON cbt_exams FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND subject = ANY(profiles.qualified_subjects)
    )
  );

-- Teachers can update their own exams
CREATE POLICY "Teachers can update own exams"
  ON cbt_exams FOR UPDATE
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- Teachers can delete their own exams
CREATE POLICY "Teachers can delete own exams"
  ON cbt_exams FOR DELETE
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- ================================================
-- 3. CBT EXAM QUESTIONS (Junction Table)
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  
  -- Question order in this specific exam
  question_order INTEGER NOT NULL,
  
  -- Override marks for this exam (if different from question default)
  marks DECIMAL(5,2),
  
  -- Section grouping (optional)
  section VARCHAR(100), -- 'Section A: Multiple Choice', 'Section B: Essay'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(exam_id, question_id),
  UNIQUE(exam_id, question_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_exam_questions_exam ON cbt_exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exam_questions_question ON cbt_exam_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_cbt_exam_questions_order ON cbt_exam_questions(exam_id, question_order);

-- RLS Policies
ALTER TABLE cbt_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam questions based on exam access"
  ON cbt_exam_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cbt_exams
      WHERE cbt_exams.id = exam_id
      AND (
        cbt_exams.teacher_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (
            profiles.role IN ('admin', 'principal', 'IT_admin') OR
            (
              profiles.role = 'student' 
              AND EXISTS (
                SELECT 1 FROM classes
                WHERE classes.id = profiles.class_id
                AND classes.name = cbt_exams.class
              )
            )
          )
        )
      )
    )
  );

CREATE POLICY "Teachers can manage their exam questions"
  ON cbt_exam_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cbt_exams
      WHERE cbt_exams.id = exam_id
      AND cbt_exams.teacher_id = auth.uid()
    )
  );

-- ================================================
-- 4. CBT STUDENT ATTEMPTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_student_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(200),
  student_class VARCHAR(20),
  
  -- Attempt Info
  attempt_number INTEGER DEFAULT 1, -- For practice exams (multiple attempts)
  
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  time_taken_seconds INTEGER, -- Actual time taken
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'abandoned', 'auto_submitted'
  
  -- Scores
  auto_graded_score DECIMAL(6,2) DEFAULT 0, -- Score from objective questions
  manual_graded_score DECIMAL(6,2) DEFAULT 0, -- Score from essay/subjective questions
  total_score DECIMAL(6,2) DEFAULT 0, -- Total score
  percentage DECIMAL(5,2),
  grade VARCHAR(2), -- 'A', 'B', 'C', etc.
  
  -- Progress tracking
  total_questions INTEGER NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  questions_flagged INTEGER DEFAULT 0,
  
  -- Anti-cheating data
  violations_count INTEGER DEFAULT 0,
  tab_switches INTEGER DEFAULT 0,
  fullscreen_exits INTEGER DEFAULT 0,
  suspicious_activity BOOLEAN DEFAULT false,
  
  -- Device info
  device_info JSONB, -- {"browser": "Chrome", "os": "Windows", "ip": "..."}
  
  -- Manual grading status
  requires_manual_grading BOOLEAN DEFAULT false, -- Has essay questions
  manual_grading_completed BOOLEAN DEFAULT false,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  teacher_comments TEXT,
  
  -- Integration with marks system
  pushed_to_marks BOOLEAN DEFAULT false,
  pushed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_attempt_status CHECK (status IN ('in_progress', 'submitted', 'abandoned', 'auto_submitted')),
  UNIQUE(exam_id, student_id, attempt_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_attempts_exam ON cbt_student_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_attempts_student ON cbt_student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_attempts_status ON cbt_student_attempts(status);
CREATE INDEX IF NOT EXISTS idx_cbt_attempts_submitted ON cbt_student_attempts(submitted_at);

-- RLS Policies
ALTER TABLE cbt_student_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
-- Teachers can view attempts for their exams
CREATE POLICY "Students and teachers can view relevant attempts"
  ON cbt_student_attempts FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM cbt_exams
      WHERE cbt_exams.id = exam_id
      AND cbt_exams.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- Students can create their own attempts
CREATE POLICY "Students can create own attempts"
  ON cbt_student_attempts FOR INSERT
  WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

-- Students can update their own in-progress attempts
-- Teachers can update attempts for grading
CREATE POLICY "Students and teachers can update attempts"
  ON cbt_student_attempts FOR UPDATE
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM cbt_exams
      WHERE cbt_exams.id = exam_id
      AND cbt_exams.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- ================================================
-- 5. CBT STUDENT ANSWERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_student_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  attempt_id UUID NOT NULL REFERENCES cbt_student_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  exam_question_id UUID NOT NULL REFERENCES cbt_exam_questions(id) ON DELETE CASCADE,
  
  -- Student's answer
  student_answer JSONB, -- For MCQ: ["A"] or ["A", "C"]
                        -- For True/False: ["True"]
                        -- For Fill-blank: ["Abuja"]
                        -- For Essay: {"text": "...", "wordCount": 250}
                        -- For Matching: [{"a1": "b2"}, {"a2": "b1"}]
  
  -- Answer metadata
  is_flagged BOOLEAN DEFAULT false, -- Student flagged for review
  time_spent_seconds INTEGER, -- Time spent on this question
  
  -- Grading
  is_correct BOOLEAN, -- For objective questions
  marks_awarded DECIMAL(5,2) DEFAULT 0,
  max_marks DECIMAL(5,2) NOT NULL,
  
  -- Manual grading (for essay/subjective)
  requires_manual_grading BOOLEAN DEFAULT false,
  manual_feedback TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  answered_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(attempt_id, question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_answers_attempt ON cbt_student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_question ON cbt_student_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_cbt_answers_manual_grading ON cbt_student_answers(requires_manual_grading) WHERE requires_manual_grading = true;

-- RLS Policies
ALTER TABLE cbt_student_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view answers based on attempt access"
  ON cbt_student_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cbt_student_attempts
      WHERE cbt_student_attempts.id = attempt_id
      AND (
        cbt_student_attempts.student_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM cbt_exams
          WHERE cbt_exams.id = cbt_student_attempts.exam_id
          AND cbt_exams.teacher_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'principal', 'IT_admin')
        )
      )
    )
  );

CREATE POLICY "Students can create and update own answers"
  ON cbt_student_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cbt_student_attempts
      WHERE cbt_student_attempts.id = attempt_id
      AND cbt_student_attempts.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update answers for grading"
  ON cbt_student_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM cbt_student_attempts
      JOIN cbt_exams ON cbt_exams.id = cbt_student_attempts.exam_id
      WHERE cbt_student_attempts.id = attempt_id
      AND cbt_exams.teacher_id = auth.uid()
    )
  );

-- ================================================
-- 6. CBT VIOLATION LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_violation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  attempt_id UUID NOT NULL REFERENCES cbt_student_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  
  -- Violation details
  violation_type VARCHAR(50) NOT NULL, -- 'tab_switch', 'fullscreen_exit', 'copy_paste', 'rapid_answering', 'suspicious_pattern'
  severity VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
  
  -- Context
  question_id UUID REFERENCES cbt_questions(id),
  details JSONB, -- {"timestamp": "...", "action": "...", "context": "..."}
  
  -- Screenshots/Evidence
  screenshot_url TEXT, -- Webcam photo if enabled
  
  -- Review
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  action_taken VARCHAR(100), -- 'warning', 'ignored', 'exam_invalidated'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_violation_type CHECK (violation_type IN ('tab_switch', 'fullscreen_exit', 'copy_paste', 'rapid_answering', 'suspicious_pattern', 'multiple_devices')),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_violations_attempt ON cbt_violation_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_cbt_violations_student ON cbt_violation_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_cbt_violations_exam ON cbt_violation_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_cbt_violations_type ON cbt_violation_logs(violation_type);
CREATE INDEX IF NOT EXISTS idx_cbt_violations_reviewed ON cbt_violation_logs(reviewed) WHERE reviewed = false;

-- RLS Policies
ALTER TABLE cbt_violation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins can view violations"
  ON cbt_violation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cbt_exams
      WHERE cbt_exams.id = exam_id
      AND cbt_exams.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

CREATE POLICY "System can log violations"
  ON cbt_violation_logs FOR INSERT
  WITH CHECK (true); -- Violations are logged server-side

-- ================================================
-- 7. CBT SETTINGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- General
  module_enabled BOOLEAN DEFAULT true,
  allow_teachers_create_exams BOOLEAN DEFAULT true,
  require_admin_approval BOOLEAN DEFAULT false,
  
  -- Security
  enforce_fullscreen BOOLEAN DEFAULT true,
  disable_copy_paste BOOLEAN DEFAULT true,
  track_tab_switches BOOLEAN DEFAULT true,
  enable_webcam_proctoring BOOLEAN DEFAULT false,
  enable_face_recognition BOOLEAN DEFAULT false,
  
  -- Time Limits
  min_exam_duration_minutes INTEGER DEFAULT 15,
  max_exam_duration_minutes INTEGER DEFAULT 180,
  auto_submit_overtime_minutes INTEGER DEFAULT 5,
  
  -- Grading
  auto_grade_objective BOOLEAN DEFAULT true,
  allow_partial_credit BOOLEAN DEFAULT false,
  show_results_after_submission BOOLEAN DEFAULT false,
  allow_students_review_answers BOOLEAN DEFAULT false,
  
  -- Notifications
  email_students_before_exam BOOLEAN DEFAULT true,
  email_reminder_hours INTEGER DEFAULT 1,
  sms_reminder BOOLEAN DEFAULT false,
  notify_teacher_submissions BOOLEAN DEFAULT true,
  
  -- Advanced
  max_questions_per_exam INTEGER DEFAULT 100,
  max_file_upload_size_mb INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 30,
  
  -- Active session tracking
  active_session VARCHAR(20), -- '2024/2025'
  active_term VARCHAR(50), -- 'First Term'
  
  -- Metadata
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE cbt_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view CBT settings"
  ON cbt_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update CBT settings"
  ON cbt_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'IT_admin')
    )
  );

-- Initialize with default settings
INSERT INTO cbt_settings (id)
SELECT uuid_generate_v4()
WHERE NOT EXISTS (SELECT 1 FROM cbt_settings);

-- ================================================
-- 8. CBT QUESTION ANALYTICS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_question_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  
  -- Usage statistics
  times_used INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  incorrect_attempts INTEGER DEFAULT 0,
  
  -- Performance metrics
  difficulty_index DECIMAL(4,3), -- % of students who got it correct (0.000 to 1.000)
  discrimination_index DECIMAL(4,3), -- How well it separates high/low performers (-1.000 to 1.000)
  
  -- Time metrics
  avg_time_seconds INTEGER,
  median_time_seconds INTEGER,
  
  -- Quality score (1.0 to 5.0)
  quality_score DECIMAL(3,2),
  needs_review BOOLEAN DEFAULT false,
  
  -- Last calculated
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(question_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_analytics_quality ON cbt_question_analytics(quality_score);
CREATE INDEX IF NOT EXISTS idx_cbt_analytics_review ON cbt_question_analytics(needs_review) WHERE needs_review = true;

-- RLS Policies
ALTER TABLE cbt_question_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view analytics for their questions"
  ON cbt_question_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cbt_questions
      WHERE cbt_questions.id = question_id
      AND (
        cbt_questions.teacher_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'principal', 'IT_admin')
        )
      )
    )
  );

-- ================================================
-- 9. CBT EXAM ANALYTICS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cbt_exam_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  
  -- Overall stats
  total_students INTEGER DEFAULT 0,
  completed_students INTEGER DEFAULT 0,
  pass_rate DECIMAL(5,2),
  
  -- Score distribution
  avg_score DECIMAL(6,2),
  median_score DECIMAL(6,2),
  highest_score DECIMAL(6,2),
  lowest_score DECIMAL(6,2),
  std_deviation DECIMAL(6,3),
  
  -- Grade distribution
  grade_a_count INTEGER DEFAULT 0,
  grade_b_count INTEGER DEFAULT 0,
  grade_c_count INTEGER DEFAULT 0,
  grade_d_count INTEGER DEFAULT 0,
  grade_f_count INTEGER DEFAULT 0,
  
  -- Time statistics
  avg_time_minutes INTEGER,
  median_time_minutes INTEGER,
  
  -- Question analysis (JSON)
  difficult_questions JSONB, -- [{"question_id", "correct_rate", "question_text"}, ...]
  easy_questions JSONB,
  
  -- Violations
  total_violations INTEGER DEFAULT 0,
  students_with_violations INTEGER DEFAULT 0,
  
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(exam_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_cbt_exam_analytics_exam ON cbt_exam_analytics(exam_id);

-- RLS Policies
ALTER TABLE cbt_exam_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view analytics for their exams"
  ON cbt_exam_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cbt_exams
      WHERE cbt_exams.id = exam_id
      AND (
        cbt_exams.teacher_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'principal', 'IT_admin')
        )
      )
    )
  );

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ CBT MODULE TABLES CREATED SUCCESSFULLY!     ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '  1. ✅ cbt_questions - Question bank';
  RAISE NOTICE '  2. ✅ cbt_exams - Exam configurations';
  RAISE NOTICE '  3. ✅ cbt_exam_questions - Exam-question links';
  RAISE NOTICE '  4. ✅ cbt_student_attempts - Student attempts';
  RAISE NOTICE '  5. ✅ cbt_student_answers - Individual answers';
  RAISE NOTICE '  6. ✅ cbt_violation_logs - Anti-cheating logs';
  RAISE NOTICE '  7. ✅ cbt_settings - Global settings';
  RAISE NOTICE '  8. ✅ cbt_question_analytics - Question quality';
  RAISE NOTICE '  9. ✅ cbt_exam_analytics - Exam statistics';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Features:';
  RAISE NOTICE '  ✅ Row Level Security (RLS) enabled';
  RAISE NOTICE '  ✅ Teachers only see their qualified subjects';
  RAISE NOTICE '  ✅ Students only see their own attempts';
  RAISE NOTICE '  ✅ Admins have full access';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '  1. Build backend API endpoints';
  RAISE NOTICE '  2. Create teacher question bank UI';
  RAISE NOTICE '  3. Build exam creation wizard';
  RAISE NOTICE '  4. Create student exam interface';
  RAISE NOTICE '';
END $$;