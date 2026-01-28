-- ⚡ EMERGENCY FIX: Run this NOW in Supabase SQL Editor
-- This increases ALL VARCHAR columns to safe sizes

ALTER TABLE cbt_questions 
ALTER COLUMN subject TYPE VARCHAR(100),
ALTER COLUMN class TYPE VARCHAR(50),
ALTER COLUMN session TYPE VARCHAR(50),
ALTER COLUMN term TYPE VARCHAR(50),
ALTER COLUMN topic TYPE VARCHAR(200),
ALTER COLUMN difficulty TYPE VARCHAR(20),
ALTER COLUMN question_type TYPE VARCHAR(50),
ALTER COLUMN status TYPE VARCHAR(20),
ALTER COLUMN teacher_name TYPE VARCHAR(200);

-- ✅ Done! Try creating a question again.
