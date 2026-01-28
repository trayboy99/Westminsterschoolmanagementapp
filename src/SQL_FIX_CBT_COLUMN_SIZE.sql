-- ================================================
-- FIX: Increase session and term column sizes
-- ================================================
-- The VARCHAR(20) limit is too short
-- Run this in Supabase SQL Editor immediately

-- Increase column sizes to allow longer values
ALTER TABLE cbt_questions 
ALTER COLUMN session TYPE VARCHAR(50),
ALTER COLUMN term TYPE VARCHAR(50);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
AND column_name IN ('session', 'term');

-- Test: View all distinct sessions and terms to see current data
SELECT DISTINCT session, term, LENGTH(session) as session_length, LENGTH(term) as term_length
FROM cbt_questions
ORDER BY session, term;
