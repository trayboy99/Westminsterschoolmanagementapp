-- ================================================
-- Check Timetable Setup Status
-- ================================================
-- Run this to verify everything is set up correctly

-- Check 1: Do the tables exist?
SELECT 
  'timetable_settings' as table_name,
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'timetable_settings'
  ) as exists
UNION ALL
SELECT 
  'class_subject_assignments',
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'class_subject_assignments'
  )
UNION ALL
SELECT 
  'timetable',
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'timetable'
  );

-- Check 2: Does timetable_settings have the config column?
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

-- Check 3: Are RLS policies set up?
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('timetable_settings', 'class_subject_assignments', 'timetable')
ORDER BY tablename, policyname;

-- Check 4: Count existing records
SELECT 
  'timetable_settings' as table_name,
  COUNT(*) as record_count
FROM timetable_settings
UNION ALL
SELECT 
  'class_subject_assignments',
  COUNT(*)
FROM class_subject_assignments
UNION ALL
SELECT 
  'timetable',
  COUNT(*)
FROM timetable;

-- Summary
DO $$
DECLARE
  settings_exists BOOLEAN;
  assignments_exists BOOLEAN;
  timetable_exists BOOLEAN;
  config_exists BOOLEAN;
BEGIN
  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable_settings'
  ) INTO settings_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'class_subject_assignments'
  ) INTO assignments_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable'
  ) INTO timetable_exists;
  
  -- Check config column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timetable_settings' AND column_name = 'config'
  ) INTO config_exists;

  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════╗';
  RAISE NOTICE '║   Timetable Setup Status Report     ║';
  RAISE NOTICE '╚══════════════════════════════════════╝';
  RAISE NOTICE '';
  
  IF settings_exists THEN
    RAISE NOTICE '✅ timetable_settings table exists';
  ELSE
    RAISE NOTICE '❌ timetable_settings table MISSING';
  END IF;
  
  IF config_exists THEN
    RAISE NOTICE '✅ config column exists';
  ELSE
    RAISE NOTICE '❌ config column MISSING';
  END IF;
  
  IF assignments_exists THEN
    RAISE NOTICE '✅ class_subject_assignments table exists';
  ELSE
    RAISE NOTICE '❌ class_subject_assignments table MISSING';
  END IF;
  
  IF timetable_exists THEN
    RAISE NOTICE '✅ timetable table exists';
  ELSE
    RAISE NOTICE '❌ timetable table MISSING';
  END IF;
  
  RAISE NOTICE '';
  
  IF settings_exists AND config_exists AND assignments_exists AND timetable_exists THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED! Timetable system is ready!';
    RAISE NOTICE '';
    RAISE NOTICE '👉 Next steps:';
    RAISE NOTICE '   1. Refresh your browser';
    RAISE NOTICE '   2. Go to Timetable Management';
    RAISE NOTICE '   3. Click Settings to configure';
  ELSE
    RAISE NOTICE '⚠️  SETUP INCOMPLETE - Run /FIX_TIMETABLE_NOW.sql';
  END IF;
  
  RAISE NOTICE '';
END $$;
