# 🗄️ CBT Module - Database Schema

## Overview
This schema integrates with the existing School Management System, feeding auto-graded exam scores into the existing marks entry system.

---

## 📊 Database Tables

### 1. `cbt_questions`
Stores all questions in the question bank.

```sql
CREATE TABLE cbt_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  teacher_name VARCHAR(200),
  
  -- Classification
  subject VARCHAR(100) NOT NULL,
  class VARCHAR(20) NOT NULL,
  topic VARCHAR(200),
  difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  
  -- Question Content
  question_type VARCHAR(50) NOT NULL, -- 'mcq_single', 'mcq_multiple', 'true_false', 'fill_blank', 'essay', 'matching'
  question_text TEXT NOT NULL,
  question_image_url TEXT, -- Optional image/diagram
  
  -- Answer Options (JSON)
  options JSONB, -- For MCQ: [{label: 'A', text: 'Lagos', isCorrect: false}, ...]
                 -- For True/False: [{label: 'True', isCorrect: true}, {label: 'False', isCorrect: false}]
                 -- For Matching: {columnA: [...], columnB: [...], correctPairs: [...]}
                 -- For Fill-blank: null
                 -- For Essay: null
  
  -- Correct Answer
  correct_answer JSONB NOT NULL, -- For MCQ: ['A'] or ['A', 'C'] for multiple
                                  -- For True/False: ['True'] or ['False']
                                  -- For Fill-blank: ['Abuja', 'abuja', 'ABUJA'] (accepted variants)
                                  -- For Matching: [{a1: 'b2'}, {a2: 'b1'}]
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT valid_question_type CHECK (question_type IN ('mcq_single', 'mcq_multiple', 'true_false', 'fill_blank', 'essay', 'matching')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
);

-- Indexes for performance
CREATE INDEX idx_cbt_questions_teacher ON cbt_questions(teacher_id);
CREATE INDEX idx_cbt_questions_subject ON cbt_questions(subject);
CREATE INDEX idx_cbt_questions_class ON cbt_questions(class);
CREATE INDEX idx_cbt_questions_topic ON cbt_questions(topic);
CREATE INDEX idx_cbt_questions_status ON cbt_questions(status);
CREATE INDEX idx_cbt_questions_session_term ON cbt_questions(session, term);
```

---

### 2. `cbt_exams`
Stores exam configurations.

```sql
CREATE TABLE cbt_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  teacher_name VARCHAR(200),
  
  -- Basic Info
  title VARCHAR(300) NOT NULL,
  subject VARCHAR(100) NOT NULL,
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
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  
  -- Target Students
  assigned_to VARCHAR(20) DEFAULT 'class', -- 'class', 'specific'
  specific_students JSONB, -- Array of student IDs if assigned_to = 'specific'
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'completed', 'archived'
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Statistics (Updated as students take exam)
  total_students INTEGER DEFAULT 0,
  students_completed INTEGER DEFAULT 0,
  students_in_progress INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  highest_score DECIMAL(5,2),
  lowest_score DECIMAL(5,2),
  
  -- Integration with existing marks system
  synced_to_marks BOOLEAN DEFAULT false, -- Whether scores have been pushed to marks entry
  synced_at TIMESTAMP,
  synced_by UUID REFERENCES teachers(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  
  CONSTRAINT valid_exam_type CHECK (exam_type IN ('formal', 'quiz', 'practice', 'mock')),
  CONSTRAINT valid_exam_status CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'archived')),
  CONSTRAINT valid_schedule CHECK (scheduled_end > scheduled_start)
);

-- Indexes
CREATE INDEX idx_cbt_exams_teacher ON cbt_exams(teacher_id);
CREATE INDEX idx_cbt_exams_subject ON cbt_exams(subject);
CREATE INDEX idx_cbt_exams_class ON cbt_exams(class);
CREATE INDEX idx_cbt_exams_status ON cbt_exams(status);
CREATE INDEX idx_cbt_exams_schedule ON cbt_exams(scheduled_start, scheduled_end);
CREATE INDEX idx_cbt_exams_session_term ON cbt_exams(session, term);
```

---

### 3. `cbt_exam_questions`
Junction table linking exams to questions (many-to-many).

```sql
CREATE TABLE cbt_exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  
  -- Question order in this specific exam
  question_order INTEGER NOT NULL,
  
  -- Override marks for this exam (if different from question default)
  marks DECIMAL(5,2),
  
  -- Section grouping (optional)
  section VARCHAR(100), -- 'Section A: Multiple Choice', 'Section B: Essay'
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(exam_id, question_id),
  UNIQUE(exam_id, question_order)
);

-- Indexes
CREATE INDEX idx_cbt_exam_questions_exam ON cbt_exam_questions(exam_id);
CREATE INDEX idx_cbt_exam_questions_question ON cbt_exam_questions(question_id);
CREATE INDEX idx_cbt_exam_questions_order ON cbt_exam_questions(exam_id, question_order);
```

---

### 4. `cbt_student_attempts`
Stores each student's attempt at an exam.

```sql
CREATE TABLE cbt_student_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name VARCHAR(200),
  student_class VARCHAR(20),
  
  -- Attempt Info
  attempt_number INTEGER DEFAULT 1, -- For practice exams (multiple attempts)
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  time_taken_seconds INTEGER, -- Actual time taken
  submitted_at TIMESTAMP,
  
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
  device_info JSONB, -- {browser: 'Chrome', os: 'Windows', ip: '...'}
  
  -- Manual grading status
  requires_manual_grading BOOLEAN DEFAULT false, -- Has essay questions
  manual_grading_completed BOOLEAN DEFAULT false,
  graded_by UUID REFERENCES teachers(id),
  graded_at TIMESTAMP,
  teacher_comments TEXT,
  
  -- Integration with marks system
  pushed_to_marks BOOLEAN DEFAULT false,
  pushed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_attempt_status CHECK (status IN ('in_progress', 'submitted', 'abandoned', 'auto_submitted')),
  UNIQUE(exam_id, student_id, attempt_number)
);

-- Indexes
CREATE INDEX idx_cbt_attempts_exam ON cbt_student_attempts(exam_id);
CREATE INDEX idx_cbt_attempts_student ON cbt_student_attempts(student_id);
CREATE INDEX idx_cbt_attempts_status ON cbt_student_attempts(status);
CREATE INDEX idx_cbt_attempts_submitted ON cbt_student_attempts(submitted_at);
```

---

### 5. `cbt_student_answers`
Stores individual answers for each question in an attempt.

```sql
CREATE TABLE cbt_student_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  attempt_id UUID NOT NULL REFERENCES cbt_student_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES cbt_questions(id) ON DELETE CASCADE,
  exam_question_id UUID NOT NULL REFERENCES cbt_exam_questions(id) ON DELETE CASCADE,
  
  -- Student's answer
  student_answer JSONB, -- For MCQ: ['A'] or ['A', 'C']
                        -- For True/False: ['True']
                        -- For Fill-blank: ['Abuja']
                        -- For Essay: {text: '...', wordCount: 250}
                        -- For Matching: [{a1: 'b2'}, {a2: 'b1'}]
  
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
  graded_by UUID REFERENCES teachers(id),
  graded_at TIMESTAMP,
  
  -- Timestamps
  answered_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(attempt_id, question_id)
);

-- Indexes
CREATE INDEX idx_cbt_answers_attempt ON cbt_student_answers(attempt_id);
CREATE INDEX idx_cbt_answers_question ON cbt_student_answers(question_id);
CREATE INDEX idx_cbt_answers_manual_grading ON cbt_student_answers(requires_manual_grading) WHERE requires_manual_grading = true;
```

---

### 6. `cbt_violation_logs`
Logs all suspicious activities during exams.

```sql
CREATE TABLE cbt_violation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- References
  attempt_id UUID NOT NULL REFERENCES cbt_student_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  
  -- Violation details
  violation_type VARCHAR(50) NOT NULL, -- 'tab_switch', 'fullscreen_exit', 'copy_paste', 'rapid_answering', 'suspicious_pattern'
  severity VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
  
  -- Context
  question_id UUID REFERENCES cbt_questions(id),
  details JSONB, -- {timestamp: '...', action: '...', context: '...'}
  
  -- Screenshots/Evidence
  screenshot_url TEXT, -- Webcam photo if enabled
  
  -- Review
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES teachers(id),
  reviewed_at TIMESTAMP,
  action_taken VARCHAR(100), -- 'warning', 'ignored', 'exam_invalidated'
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_violation_type CHECK (violation_type IN ('tab_switch', 'fullscreen_exit', 'copy_paste', 'rapid_answering', 'suspicious_pattern', 'multiple_devices')),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high'))
);

-- Indexes
CREATE INDEX idx_cbt_violations_attempt ON cbt_violation_logs(attempt_id);
CREATE INDEX idx_cbt_violations_student ON cbt_violation_logs(student_id);
CREATE INDEX idx_cbt_violations_exam ON cbt_violation_logs(exam_id);
CREATE INDEX idx_cbt_violations_type ON cbt_violation_logs(violation_type);
CREATE INDEX idx_cbt_violations_reviewed ON cbt_violation_logs(reviewed) WHERE reviewed = false;
```

---

### 7. `cbt_settings`
Global CBT module settings (managed by Principal/IT Admin).

```sql
CREATE TABLE cbt_settings (
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
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize with default settings
INSERT INTO cbt_settings (id) VALUES (uuid_generate_v4());
```

---

### 8. `cbt_question_analytics`
Tracks question performance for quality improvement.

```sql
CREATE TABLE cbt_question_analytics (
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
  last_calculated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(question_id)
);

-- Indexes
CREATE INDEX idx_cbt_analytics_quality ON cbt_question_analytics(quality_score);
CREATE INDEX idx_cbt_analytics_review ON cbt_question_analytics(needs_review) WHERE needs_review = true;
```

---

### 9. `cbt_exam_analytics`
Stores exam-level analytics.

```sql
CREATE TABLE cbt_exam_analytics (
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
  difficult_questions JSONB, -- [{question_id, correct_rate, question_text}, ...]
  easy_questions JSONB,
  
  -- Violations
  total_violations INTEGER DEFAULT 0,
  students_with_violations INTEGER DEFAULT 0,
  
  last_updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(exam_id)
);

-- Index
CREATE INDEX idx_cbt_exam_analytics_exam ON cbt_exam_analytics(exam_id);
```

---

## 🔗 Integration with Existing System

### Existing Tables We'll Reference:

```sql
-- These tables already exist in your system
teachers (id, name, email, ...)
students (id, name, class, ...)
users (id, role, ...)
subjects (id, name, ...)
classes (id, name, ...)

-- Your existing marks entry system
marks (id, student_id, subject, class, term, session, exam_type, score, ...)
```

### Integration Points:

1. **After CBT Auto-Grading**:
   - Teacher reviews scores in `cbt_student_attempts`
   - For objective questions: Auto-graded immediately
   - For essay questions: Teacher grades manually
   - Teacher clicks **"Push to Marks Entry"**
   - System creates/updates record in existing `marks` table

2. **Workflow**:
```
Student completes CBT exam
    ↓
Auto-grading (objective questions)
    ↓
Teacher reviews results in CBT dashboard
    ↓
Teacher grades essay questions (if any)
    ↓
Teacher clicks "Push to Marks Entry"
    ↓
Scores transferred to existing marks table
    ↓
Student sees result in existing results dashboard
```

---

## 📈 Key Features Enabled by This Schema

### ✅ Question Bank Management
- Teachers create and organize questions
- Filter by subject, topic, difficulty
- Track question quality over time
- Reuse questions across exams

### ✅ Flexible Exam Creation
- Support 6 question types
- Shuffle questions/options
- Custom time limits
- Section-based organization

### ✅ Robust Exam Delivery
- Auto-save every 10 seconds
- Track violations
- Support multiple attempts (practice mode)
- Device fingerprinting

### ✅ Automatic Grading
- Instant grading for MCQ, True/False, Fill-blank
- Manual grading for essays
- Partial credit support
- Detailed answer tracking

### ✅ Anti-Cheating
- Tab switch detection
- Fullscreen monitoring
- Time pattern analysis
- Violation logging with severity

### ✅ Analytics & Insights
- Question quality metrics
- Exam performance distribution
- Student progress tracking
- Identify difficult topics

### ✅ Seamless Integration
- Connects to existing marks system
- Uses existing student/teacher tables
- Respects session/term structure
- No duplicate result management

---

## 🔒 Security Considerations

### Data Encryption
- Correct answers stored in JSONB (encrypted at rest)
- Student photos (if webcam enabled) stored in Supabase Storage with signed URLs
- Session tokens for exam access

### Access Control
- Students can only see their own attempts
- Teachers can only see exams they created (or all if admin)
- Principal/IT Admin can access all data

### Audit Trail
- All answer changes logged with timestamps
- Violation logs immutable
- Exam settings changes tracked

---

## 🚀 Performance Optimizations

### Indexes
- All foreign keys indexed
- Composite indexes on (exam_id, student_id)
- Partial indexes on status fields

### JSONB Fields
- Use GIN indexes for JSONB search if needed
- Keep JSONB documents small (<100KB)

### Partitioning (Future)
- Partition `cbt_student_answers` by exam_id if tables grow large
- Archive old exams after 3 years

---

## 📊 Estimated Storage

For a school with **1,000 students**, **50 teachers**, **200 exams/year**:

| Table | Records/Year | Size |
|-------|-------------|------|
| cbt_questions | ~5,000 | ~5 MB |
| cbt_exams | ~200 | ~500 KB |
| cbt_exam_questions | ~10,000 | ~2 MB |
| cbt_student_attempts | ~100,000 | ~50 MB |
| cbt_student_answers | ~2,000,000 | ~500 MB |
| cbt_violation_logs | ~5,000 | ~5 MB |
| **Total** | | **~560 MB/year** |

Very manageable! 🎉

---

## ✅ Next Steps

This schema is ready for implementation. Shall we proceed to:
1. Create the backend API endpoints
2. Build the teacher question bank interface
3. Build the exam creation wizard
4. Build the student exam interface

Which would you like to tackle first? 🚀
