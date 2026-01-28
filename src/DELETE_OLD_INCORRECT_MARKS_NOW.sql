-- ❌ DELETE OLD INCORRECT MARKS DATA
-- This SQL file deletes marks that were saved with the OLD incorrect logic
-- where Terminal CA1 = Midterm CA1 + Midterm CA2 (WRONG)
-- and Terminal CA2 = Midterm Exam (WRONG)

-- ============================================================================
-- STEP 1: BACKUP EXISTING MARKS (OPTIONAL - RECOMMENDED)
-- ============================================================================
-- Create a backup table of all marks before deleting
CREATE TABLE IF NOT EXISTS marks_backup_old_logic AS
SELECT * FROM marks;

-- ============================================================================
-- STEP 2: IDENTIFY AND DELETE INCORRECT MARKS
-- ============================================================================

-- Find marks where Terminal CA1 = Midterm CA1 + Midterm CA2 (WRONG LOGIC)
WITH midterm_marks AS (
  SELECT 
    student_id,
    exam_id,
    subject_id,
    ca1 as mid_ca1,
    ca2 as mid_ca2,
    exam as mid_exam
  FROM marks
  WHERE type = 'midterm'
    AND ca1 IS NOT NULL 
    AND ca2 IS NOT NULL
),
terminal_marks AS (
  SELECT 
    student_id,
    exam_id,
    subject_id,
    ca1 as term_ca1,
    ca2 as term_ca2
  FROM marks
  WHERE type = 'terminal'
    AND ca1 IS NOT NULL
),
incorrect_marks AS (
  SELECT 
    t.student_id,
    t.exam_id,
    t.subject_id,
    m.mid_ca1,
    m.mid_ca2,
    m.mid_exam,
    t.term_ca1,
    t.term_ca2,
    -- Check if Terminal CA1 equals Midterm CA1 + CA2 (WRONG LOGIC)
    CASE 
      WHEN (m.mid_ca1 + m.mid_ca2) = t.term_ca1 THEN TRUE
      ELSE FALSE
    END as has_wrong_ca1_logic,
    -- Check if Terminal CA2 equals Midterm Exam (WRONG LOGIC)
    CASE 
      WHEN m.mid_exam = t.term_ca2 THEN TRUE
      ELSE FALSE
    END as has_wrong_ca2_logic
  FROM midterm_marks m
  INNER JOIN terminal_marks t 
    ON m.student_id = t.student_id 
    AND m.exam_id = t.exam_id 
    AND m.subject_id = t.subject_id
  WHERE (m.mid_ca1 + m.mid_ca2) = t.term_ca1  -- Wrong Terminal CA1 logic
     OR m.mid_exam = t.term_ca2                 -- Wrong Terminal CA2 logic
)
SELECT 
  COUNT(*) as incorrect_marks_count,
  STRING_AGG(DISTINCT subject_id::text, ', ') as affected_subjects,
  STRING_AGG(DISTINCT exam_id::text, ', ') as affected_exams
FROM incorrect_marks;

-- ============================================================================
-- STEP 3: DELETE ALL MARKS WITH INCORRECT LOGIC
-- ============================================================================

-- DELETE Terminal marks where Terminal CA1 = Midterm CA1 + CA2 (WRONG)
DELETE FROM marks
WHERE id IN (
  SELECT t.id
  FROM marks t
  INNER JOIN marks m 
    ON t.student_id = m.student_id 
    AND t.exam_id = m.exam_id 
    AND t.subject_id = m.subject_id
  WHERE t.type = 'terminal'
    AND m.type = 'midterm'
    AND t.ca1 IS NOT NULL
    AND m.ca1 IS NOT NULL
    AND m.ca2 IS NOT NULL
    AND (m.ca1 + m.ca2) = t.ca1  -- Wrong logic detected
);

-- DELETE Terminal marks where Terminal CA2 = Midterm Exam (WRONG)
DELETE FROM marks
WHERE id IN (
  SELECT t.id
  FROM marks t
  INNER JOIN marks m 
    ON t.student_id = m.student_id 
    AND t.exam_id = m.exam_id 
    AND t.subject_id = m.subject_id
  WHERE t.type = 'terminal'
    AND m.type = 'midterm'
    AND t.ca2 IS NOT NULL
    AND m.exam IS NOT NULL
    AND m.exam = t.ca2  -- Wrong logic detected
);

-- ============================================================================
-- STEP 4: VERIFICATION - CHECK WHAT'S LEFT
-- ============================================================================

-- Check remaining marks count
SELECT 
  type,
  COUNT(*) as count
FROM marks
GROUP BY type;

-- Check if any incorrect marks remain
WITH midterm_marks AS (
  SELECT 
    student_id,
    exam_id,
    subject_id,
    ca1, ca2, exam
  FROM marks
  WHERE type = 'midterm'
    AND ca1 IS NOT NULL 
    AND ca2 IS NOT NULL
    AND exam IS NOT NULL
),
terminal_marks AS (
  SELECT 
    student_id,
    exam_id,
    subject_id,
    ca1, ca2
  FROM marks
  WHERE type = 'terminal'
    AND ca1 IS NOT NULL
)
SELECT 
  m.student_id,
  m.ca1 as mid_ca1,
  m.ca2 as mid_ca2,
  m.exam as mid_exam,
  (m.ca1 + m.ca2 + m.exam) as mid_total,
  ROUND((m.ca1 + m.ca2 + m.exam)::NUMERIC / 2, 0) as expected_term_ca1,
  t.ca1 as actual_term_ca1,
  CASE 
    WHEN ROUND((m.ca1 + m.ca2 + m.exam)::NUMERIC / 2, 0) = t.ca1 THEN '✅ CORRECT'
    WHEN (m.ca1 + m.ca2) = t.ca1 THEN '❌ WRONG: CA1+CA2'
    ELSE '❌ OTHER ISSUE'
  END as validation
FROM midterm_marks m
LEFT JOIN terminal_marks t 
  ON m.student_id = t.student_id 
  AND m.exam_id = t.exam_id 
  AND m.subject_id = t.subject_id
WHERE t.ca1 IS NOT NULL;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. This script creates a backup table first (marks_backup_old_logic)
-- 2. It deletes ONLY marks with the incorrect logic
-- 3. Correct marks are preserved
-- 4. After running, you need to RE-ENTER the marks using the CORRECT logic
-- 5. The new logic: Terminal CA1 = (Midterm CA1 + CA2 + Exam) / 2

-- ============================================================================
-- TO RESTORE FROM BACKUP (if needed):
-- ============================================================================
-- DELETE FROM marks;
-- INSERT INTO marks SELECT * FROM marks_backup_old_logic;
-- DROP TABLE marks_backup_old_logic;
