-- =====================================================
-- STEP 2: ADD STATUS COLUMN (SAFE VERSION)
-- This will safely add the status column if missing
-- =====================================================

-- Add status column (safe - won't error if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Added status column';
  ELSE
    RAISE NOTICE '⚠️ status column already exists - skipping';
  END IF;
END $$;

-- Add check constraint (safe)
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('active', 'inactive', 'graduated', 'suspended'));
  RAISE NOTICE '✅ Added status check constraint';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Constraint already exists - skipping';
END $$;

-- Mark students with null class_id as graduated
UPDATE profiles
SET status = 'graduated'
WHERE role = 'student'
AND class_id IS NULL
AND (status IS NULL OR status != 'graduated');

-- Mark students with a class as active
UPDATE profiles
SET status = 'active'
WHERE role = 'student'
AND class_id IS NOT NULL
AND (status IS NULL OR status = 'active');

-- Show results
SELECT 
  'Students marked as graduated' as result,
  COUNT(*) as count,
  string_agg(first_name || ' ' || last_name, ', ') as names
FROM profiles
WHERE status = 'graduated';

SELECT 
  'Students marked as active' as result,
  COUNT(*) as count
FROM profiles
WHERE status = 'active' AND role = 'student';

-- =====================================================
-- SUCCESS! Now run STEP3_SYNC_GRADUATED_STUDENTS_SAFE.sql
-- =====================================================
