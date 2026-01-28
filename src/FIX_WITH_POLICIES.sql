-- ⚡⚡⚡ COMPLETE FIX WITH RLS POLICIES ⚡⚡⚡
-- This drops policies, alters columns, then recreates policies

-- Step 1: View existing policies (so we know what to recreate)
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'cbt_questions';

-- Step 2: Drop all existing policies on cbt_questions
DROP POLICY IF EXISTS "Teachers can create questions for qualified subjects" ON cbt_questions;
DROP POLICY IF EXISTS "Teachers can view their own questions" ON cbt_questions;
DROP POLICY IF EXISTS "Teachers can update their own questions" ON cbt_questions;
DROP POLICY IF EXISTS "Teachers can delete their own questions" ON cbt_questions;
DROP POLICY IF EXISTS "Admins can view all questions" ON cbt_questions;
DROP POLICY IF EXISTS "Admins can create questions" ON cbt_questions;
DROP POLICY IF EXISTS "Admins can update all questions" ON cbt_questions;
DROP POLICY IF EXISTS "Admins can delete all questions" ON cbt_questions;
DROP POLICY IF EXISTS "Students can view published questions" ON cbt_questions;

-- Step 3: Now alter the columns (this will work now)
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

-- Step 4: Recreate the policies
-- Teachers can view their own questions
CREATE POLICY "Teachers can view their own questions"
ON cbt_questions
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('principal', 'it_admin')
));

-- Teachers can create questions
CREATE POLICY "Teachers can create questions"
ON cbt_questions
FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- Teachers can update their own questions
CREATE POLICY "Teachers can update their own questions"
ON cbt_questions
FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('principal', 'it_admin')
));

-- Teachers can delete their own questions
CREATE POLICY "Teachers can delete their own questions"
ON cbt_questions
FOR DELETE
TO authenticated
USING (teacher_id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('principal', 'it_admin')
));

-- Step 5: Verify the changes
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
  AND data_type = 'character varying'
ORDER BY column_name;

-- ✅ Done! Columns are now larger and policies are recreated!
