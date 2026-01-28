-- ⚡ SIMPLE FIX - Just change columns, keep existing policies ⚡

-- Step 1: Temporarily disable RLS
ALTER TABLE cbt_questions DISABLE ROW LEVEL SECURITY;

-- Step 2: Fix ALL VARCHAR columns to safe sizes
ALTER TABLE cbt_questions 
ALTER COLUMN teacher_name TYPE VARCHAR(200),
ALTER COLUMN subject TYPE VARCHAR(200),
ALTER COLUMN class TYPE VARCHAR(100),
ALTER COLUMN session TYPE VARCHAR(100),
ALTER COLUMN term TYPE VARCHAR(100),
ALTER COLUMN topic TYPE VARCHAR(500),
ALTER COLUMN difficulty TYPE VARCHAR(100),
ALTER COLUMN question_type TYPE VARCHAR(100),
ALTER COLUMN status TYPE VARCHAR(100);

-- Step 3: Re-enable RLS (keeps existing policies)
ALTER TABLE cbt_questions ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the changes
SELECT 
  column_name, 
  character_maximum_length as max_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND data_type = 'character varying'
ORDER BY column_name;

-- ✅ DONE! Policies remain unchanged, columns are now bigger!
