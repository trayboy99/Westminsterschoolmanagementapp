-- ⚡⚡⚡ FINAL FIX - Run this NOW ⚡⚡⚡
-- This will fix ALL VARCHAR(20) columns in cbt_questions table

ALTER TABLE cbt_questions 
ALTER COLUMN teacher_name TYPE VARCHAR(200),
ALTER COLUMN subject TYPE VARCHAR(200),
ALTER COLUMN class TYPE VARCHAR(50),
ALTER COLUMN session TYPE VARCHAR(50),
ALTER COLUMN term TYPE VARCHAR(50),
ALTER COLUMN topic TYPE VARCHAR(500),
ALTER COLUMN difficulty TYPE VARCHAR(50),
ALTER COLUMN question_type TYPE VARCHAR(100),
ALTER COLUMN status TYPE VARCHAR(50);

-- ✅ Done! All VARCHAR columns are now safe sizes.
-- Try creating a question now - it should work!
