-- =====================================================
-- DIAGNOSE: Why aren't subject pairs saving to database?
-- Run these queries to find the issue
-- =====================================================

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subject_pairings'
ORDER BY ordinal_position;

-- Step 2: Check if table has any data
SELECT COUNT(*) as total_rows, 
       COUNT(DISTINCT pair_group_id) as unique_groups
FROM subject_pairings;

-- Step 3: Check all existing data
SELECT * FROM subject_pairings ORDER BY created_at DESC LIMIT 10;

-- Step 4: Check RLS (Row Level Security) policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'subject_pairings';

-- Step 5: Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'subject_pairings';

-- Step 6: Try a test insert (will show exact error if it fails)
-- Uncomment and replace with actual subject ID from your database
/*
INSERT INTO subject_pairings (
  pair_group_id,
  pair_group_name,
  subject_id,
  level,
  pairing_type
) VALUES (
  'test_group_123',
  'Test Pair',
  'YOUR_SUBJECT_UUID_HERE',
  'senior',
  'departmental'
);
*/

-- If the above works, check if it inserted:
-- SELECT * FROM subject_pairings WHERE pair_group_id = 'test_group_123';
