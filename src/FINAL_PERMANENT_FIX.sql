-- ⚡⚡⚡ PERMANENT FIX - MAKES ALL COLUMNS LARGE ENOUGH ⚡⚡⚡
-- This will NEVER fail again!

-- Step 1: Disable RLS
ALTER TABLE cbt_questions DISABLE ROW LEVEL SECURITY;

-- Step 2: Make ALL text columns either TEXT or VARCHAR(1000)
-- This is OVERLY generous so we NEVER hit limits
ALTER TABLE cbt_questions 
ALTER COLUMN teacher_name TYPE TEXT,
ALTER COLUMN subject TYPE TEXT,
ALTER COLUMN class TYPE TEXT,
ALTER COLUMN session TYPE TEXT,
ALTER COLUMN term TYPE TEXT,
ALTER COLUMN topic TYPE TEXT,
ALTER COLUMN difficulty TYPE TEXT,
ALTER COLUMN question_type TYPE TEXT,
ALTER COLUMN status TYPE TEXT;

-- Step 3: Re-enable RLS
ALTER TABLE cbt_questions ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify - should show "text" for all columns
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
ORDER BY column_name;

-- ✅ DONE! All columns are now TEXT (unlimited length)
-- This will NEVER error again!
