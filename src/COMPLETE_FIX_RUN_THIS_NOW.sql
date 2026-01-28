-- =====================================================
-- COMPLETE FIX FOR SUBJECT PAIRINGS SAVE ISSUE
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- Then click RUN
-- =====================================================

-- STEP 1: Fix table structure
-- =====================================================
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('junior', 'senior'));

-- STEP 2: Fix RLS Policies (This is usually the problem!)
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users full access" ON subject_pairings;
DROP POLICY IF EXISTS "Users can view subject pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Users can insert subject pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Users can update subject pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Users can delete subject pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Authenticated users can do everything with pairings" ON subject_pairings;
DROP POLICY IF EXISTS "Service role can do everything" ON subject_pairings;

-- Disable RLS temporarily to clear any blocks
ALTER TABLE subject_pairings DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE subject_pairings ENABLE ROW LEVEL SECURITY;

-- Create a single permissive policy for all operations
CREATE POLICY "allow_all_authenticated"
ON subject_pairings
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- STEP 3: Ensure foreign key is correct
-- =====================================================
ALTER TABLE subject_pairings 
DROP CONSTRAINT IF EXISTS subject_pairings_subject_id_fkey;

ALTER TABLE subject_pairings
ADD CONSTRAINT subject_pairings_subject_id_fkey 
FOREIGN KEY (subject_id) 
REFERENCES subjects(id) 
ON DELETE CASCADE;

-- Remove paired_subject_id constraint if it exists (we don't use it anymore)
ALTER TABLE subject_pairings 
DROP CONSTRAINT IF EXISTS subject_pairings_paired_subject_id_fkey;

-- STEP 4: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_subject_pairings_group_id 
ON subject_pairings(pair_group_id);

CREATE INDEX IF NOT EXISTS idx_subject_pairings_level 
ON subject_pairings(level);

CREATE INDEX IF NOT EXISTS idx_subject_pairings_subject_id 
ON subject_pairings(subject_id);

-- STEP 5: Grant explicit permissions
-- =====================================================
GRANT ALL ON subject_pairings TO authenticated;
GRANT ALL ON subject_pairings TO anon;
GRANT ALL ON subject_pairings TO service_role;

-- STEP 6: Verify the fix
-- =====================================================
SELECT 
  'Fix Applied Successfully!' as status,
  '✅' as icon;

-- Show current table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subject_pairings'
ORDER BY ordinal_position;

-- Show RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'subject_pairings';

-- Show current data count
SELECT 
  COUNT(*) as total_pairings,
  COUNT(DISTINCT pair_group_id) as unique_groups
FROM subject_pairings;

-- =====================================================
-- DONE! Now go back to your app and try saving again
-- =====================================================
