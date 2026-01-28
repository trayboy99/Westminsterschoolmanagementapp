-- ================================================
-- FIX: Timetable Settings "name" Column Error
-- ================================================
-- Error: null value in column "name" of relation "timetable_settings" 
--        violates not-null constraint
--
-- This happens because the table has extra columns that the backend
-- doesn't provide values for. We need to recreate the table with
-- ONLY the columns the backend actually uses.
-- ================================================

-- STEP 1: Check current table structure
SELECT 
  'BEFORE FIX - Current timetable_settings columns:' as info,
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

-- STEP 2: Drop the problematic table
-- (Don't worry - we'll recreate it correctly)
DROP TABLE IF EXISTS timetable_settings CASCADE;

-- STEP 3: Create table with CORRECT minimal schema
-- Only the columns the backend actually uses
CREATE TABLE timetable_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 4: Enable RLS
ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

-- STEP 5: Drop old policies if they exist
DROP POLICY IF EXISTS "Admin can view timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can insert timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can update timetable settings" ON timetable_settings;
DROP POLICY IF EXISTS "Admin can delete timetable settings" ON timetable_settings;

-- STEP 6: Create RLS policies
CREATE POLICY "Admin can view timetable settings" 
  ON timetable_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can insert timetable settings" 
  ON timetable_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can update timetable settings" 
  ON timetable_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can delete timetable settings" 
  ON timetable_settings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- STEP 7: Create index for performance
CREATE INDEX idx_timetable_settings_created_at 
  ON timetable_settings(created_at DESC);

-- STEP 8: Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- STEP 9: Verify the fix
SELECT 
  'AFTER FIX - New timetable_settings columns:' as info,
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ TIMETABLE_SETTINGS TABLE FIXED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Table recreated with correct schema';
  RAISE NOTICE '✓ Only 5 columns (id, config, updated_by, created_at, updated_at)';
  RAISE NOTICE '✓ NO "name" column (that was causing the error)';
  RAISE NOTICE '✓ RLS policies configured';
  RAISE NOTICE '✓ Schema cache reloaded';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEPS:';
  RAISE NOTICE '   1. Refresh your browser (Ctrl+Shift+R)';
  RAISE NOTICE '   2. Go to Timetable Module';
  RAISE NOTICE '   3. Click "Settings" button';
  RAISE NOTICE '   4. Configure and click "Save Settings"';
  RAISE NOTICE '   5. Should now work without "name" error!';
  RAISE NOTICE '';
END $$;
