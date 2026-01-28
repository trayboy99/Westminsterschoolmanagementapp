-- ⚡ QUICK FIX: Run this immediately in Supabase SQL Editor
-- This increases the session and term column sizes from VARCHAR(20) to VARCHAR(50)

ALTER TABLE cbt_questions 
ALTER COLUMN session TYPE VARCHAR(50),
ALTER COLUMN term TYPE VARCHAR(50);

-- ✅ Done! Now try creating a question again.
