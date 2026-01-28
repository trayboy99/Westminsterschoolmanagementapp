-- ================================================
-- COMPREHENSIVE FIX: Increase all VARCHAR columns
-- ================================================
-- Run this in Supabase SQL Editor to fix the VARCHAR(20) error

-- Step 1: First, let's see what we have
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND data_type = 'character varying'
ORDER BY column_name;

-- Step 2: Increase all potentially problematic VARCHAR columns
-- This ensures no column is too small for the data

ALTER TABLE cbt_questions 
ALTER COLUMN subject TYPE VARCHAR(100),        -- For long subject names
ALTER COLUMN class TYPE VARCHAR(50),           -- Should be fine, but increase anyway
ALTER COLUMN session TYPE VARCHAR(50),         -- Already should be 50
ALTER COLUMN term TYPE VARCHAR(50),            -- Already should be 50
ALTER COLUMN topic TYPE VARCHAR(200),          -- Topics can be long
ALTER COLUMN difficulty TYPE VARCHAR(20),      -- Fine (easy/medium/hard)
ALTER COLUMN question_type TYPE VARCHAR(50),   -- Fine but increase for safety
ALTER COLUMN status TYPE VARCHAR(20),          -- Fine (draft/published/archived)
ALTER COLUMN teacher_name TYPE VARCHAR(200);   -- Teacher names can be long

-- Step 3: Verify the changes
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND data_type = 'character varying'
ORDER BY column_name;

-- You should now see increased limits for all VARCHAR columns
