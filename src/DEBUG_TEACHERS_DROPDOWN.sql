-- =====================================================
-- DEBUG: Teachers Dropdown Issue
-- =====================================================

-- 1. Check if you have any teachers in the database
SELECT 
  COUNT(*) as total_teachers,
  'Teachers in database' as description
FROM profiles 
WHERE role = 'teacher';

-- 2. List all teachers with their details
SELECT 
  id,
  first_name,
  middle_name,
  last_name,
  email,
  role,
  created_at
FROM profiles 
WHERE role = 'teacher'
ORDER BY first_name;

-- 3. Check for role constraint issues
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'role';

-- 4. Check if there are users with different role spellings
SELECT DISTINCT 
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY role;

-- 5. Check for any authentication issues with teachers
SELECT 
  id,
  email,
  role,
  CASE 
    WHEN id IS NULL THEN '❌ Missing ID'
    WHEN email IS NULL THEN '❌ Missing Email'
    WHEN role IS NULL THEN '❌ Missing Role'
    ELSE '✅ Complete'
  END as status
FROM profiles 
WHERE role = 'teacher'
LIMIT 20;
