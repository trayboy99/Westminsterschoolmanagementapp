-- ⚡ COMPLETE FIX: Increase ALL VARCHAR columns in cbt_questions
-- Run this in Supabase SQL Editor NOW

-- First, let's see EVERYTHING
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND table_schema = 'public'
ORDER BY column_name;

-- Now fix ALL VARCHAR columns at once
ALTER TABLE cbt_questions 
ALTER COLUMN subject TYPE VARCHAR(200),
ALTER COLUMN class TYPE VARCHAR(50),
ALTER COLUMN session TYPE VARCHAR(50),
ALTER COLUMN term TYPE VARCHAR(50),
ALTER COLUMN topic TYPE VARCHAR(500),
ALTER COLUMN difficulty TYPE VARCHAR(50),
ALTER COLUMN question_type TYPE VARCHAR(100),
ALTER COLUMN status TYPE VARCHAR(50),
ALTER COLUMN teacher_name TYPE VARCHAR(200),
ALTER COLUMN question_image_url TYPE TEXT,
ALTER COLUMN explanation TYPE TEXT;

-- Verify ALL columns now
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND table_schema = 'public'
  AND data_type IN ('character varying', 'text')
ORDER BY column_name;
