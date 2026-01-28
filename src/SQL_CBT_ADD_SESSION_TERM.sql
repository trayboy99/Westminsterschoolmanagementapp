-- ================================================
-- CBT Questions: Add Session and Term Columns
-- ================================================
-- Run this SQL in your Supabase SQL Editor
-- This adds session and term tracking to the CBT questions table

-- Step 1: Add the new columns
ALTER TABLE cbt_questions 
ADD COLUMN IF NOT EXISTS session VARCHAR(50),
ADD COLUMN IF NOT EXISTS term VARCHAR(50);

-- Step 2: Create index for faster grouping queries
-- This improves performance when fetching grouped question banks
CREATE INDEX IF NOT EXISTS idx_cbt_questions_grouping 
ON cbt_questions(teacher_id, subject, class, session, term);

-- Step 3: Update existing questions with default session/term
-- This ensures all existing questions have session and term values
UPDATE cbt_questions 
SET 
  session = '2025/2026',
  term = 'First Term'
WHERE session IS NULL;

-- Step 4: Verify the changes
-- Run this to check if columns were added successfully
SELECT 
  subject,
  class,
  session,
  term,
  COUNT(*) as question_count,
  SUM(marks) as total_marks
FROM cbt_questions
GROUP BY subject, class, session, term
ORDER BY session DESC, term, subject, class;

-- Optional: View sample data
SELECT id, subject, class, session, term, question_text, status, created_at
FROM cbt_questions
ORDER BY created_at DESC
LIMIT 10;