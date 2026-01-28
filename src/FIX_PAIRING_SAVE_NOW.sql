-- =====================================================
-- FIX: Subject Pairings Save Issue - RUN THIS NOW
-- =====================================================

-- Step 1: Ensure columns exist
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('junior', 'senior'));

-- Step 2: Drop existing RLS policies that might be blocking
DROP POLICY IF EXISTS "Allow authenticated users full access" ON subject_pairings;
DROP POLICY IF EXISTS "Users can view subject pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Users can insert subject pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Users can update subject pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Users can delete subject pairings" ON subject_pairings;

-- Step 3: Enable RLS
ALTER TABLE subject_pairings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can do everything with pairings"
ON subject_pairings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 5: Also allow for anon users if needed (remove if you want auth only)
CREATE POLICY "Service role can do everything"
ON subject_pairings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_subject_pairings_group_id 
ON subject_pairings(pair_group_id);

CREATE INDEX IF NOT EXISTS idx_subject_pairings_level 
ON subject_pairings(level);

-- Step 7: Test insert (replace 'your-subject-id' with actual UUID from subjects table)
-- Uncomment and run to test:
/*
INSERT INTO subject_pairings (
  pair_group_id,
  pair_group_name,
  subject_id,
  level,
  pairing_type
) VALUES (
  'test_pair_123',
  'Test Pair Group',
  (SELECT id FROM subjects LIMIT 1),
  'senior',
  'departmental'
);

-- Check if it worked
SELECT * FROM subject_pairings WHERE pair_group_id = 'test_pair_123';

-- Clean up test
DELETE FROM subject_pairings WHERE pair_group_id = 'test_pair_123';
*/

-- Step 8: Verify setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM subject_pairings) as current_pairings_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'subject_pairings') as policies_count;
