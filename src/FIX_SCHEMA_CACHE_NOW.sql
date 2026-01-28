-- ================================================
-- FIX SCHEMA CACHE ERROR - Run This Now
-- ================================================
-- This fixes: "Could not find the 'config' column of 'timetable_settings' in the schema cache"

-- Step 1: Drop and recreate the table to force schema refresh
DROP TABLE IF EXISTS timetable_settings CASCADE;

-- Step 2: Recreate with all columns
CREATE TABLE timetable_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
DROP POLICY IF EXISTS "Admin can view timetable settings" ON timetable_settings;
CREATE POLICY "Admin can view timetable settings" ON timetable_settings FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

DROP POLICY IF EXISTS "Admin can insert timetable settings" ON timetable_settings;
CREATE POLICY "Admin can insert timetable settings" ON timetable_settings FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

DROP POLICY IF EXISTS "Admin can update timetable settings" ON timetable_settings;
CREATE POLICY "Admin can update timetable settings" ON timetable_settings FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

DROP POLICY IF EXISTS "Admin can delete timetable settings" ON timetable_settings;
CREATE POLICY "Admin can delete timetable settings" ON timetable_settings FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'principal', 'IT_admin')));

-- Step 5: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Verification
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ timetable_settings table recreated!';
  RAISE NOTICE '✅ Schema cache refreshed!';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Now refresh your browser and try again.';
  RAISE NOTICE '';
END $$;
