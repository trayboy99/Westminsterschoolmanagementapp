-- ================================================
-- DIAGNOSTIC: Check Timetable Table Columns
-- ================================================
-- Run this FIRST to see what's wrong with your tables
-- ================================================

-- Check timetable_settings columns
SELECT 
  '🔍 CURRENT timetable_settings TABLE STRUCTURE' as status,
  '' as blank_line;

SELECT 
  column_name, 
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'config', 'updated_by', 'created_at', 'updated_at') 
    THEN '✅ NEEDED'
    ELSE '❌ EXTRA (causing errors)'
  END as needed
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;

-- Count columns
SELECT 
  '📊 COLUMN COUNT' as status,
  COUNT(*) as total_columns,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ CORRECT (should be 5)'
    WHEN COUNT(*) > 5 THEN '❌ TOO MANY (should be 5, causing "name" error)'
    ELSE '❌ TOO FEW (missing columns)'
  END as diagnosis
FROM information_schema.columns 
WHERE table_name = 'timetable_settings';

-- Check which extra columns exist
SELECT 
  '❌ PROBLEMATIC EXTRA COLUMNS' as status,
  column_name
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
  AND column_name NOT IN ('id', 'config', 'updated_by', 'created_at', 'updated_at')
ORDER BY column_name;

-- Check if "name" column exists (the problematic one)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'timetable_settings' 
      AND column_name = 'name'
    ) THEN '❌ YES - "name" column EXISTS (this is the problem!)'
    ELSE '✅ NO - "name" column does NOT exist (good)'
  END as name_column_check;

-- Check timetable table structure
SELECT 
  '🔍 CURRENT timetable TABLE STRUCTURE' as status,
  '' as blank_line;

SELECT 
  column_name, 
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'academic_year', 'term', 'slots', 'created_by', 'created_at', 'updated_at') 
    THEN '✅ NEEDED'
    ELSE '❌ EXTRA (may cause issues)'
  END as needed
FROM information_schema.columns 
WHERE table_name = 'timetable'
ORDER BY ordinal_position;

-- Count columns
SELECT 
  '📊 COLUMN COUNT' as status,
  COUNT(*) as total_columns,
  CASE 
    WHEN COUNT(*) = 7 THEN '✅ CORRECT (should be 7)'
    WHEN COUNT(*) > 7 THEN '❌ TOO MANY (should be 7)'
    ELSE '❌ TOO FEW (missing columns)'
  END as diagnosis
FROM information_schema.columns 
WHERE table_name = 'timetable';

-- Check if timetable has individual slot columns (OLD WRONG SCHEMA)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'timetable' 
      AND column_name IN ('class_id', 'day', 'period', 'subject_id', 'teacher_id')
    ) THEN '❌ WRONG SCHEMA - Has individual slot columns (needs to be JSONB array)'
    ELSE '✅ CORRECT SCHEMA - Uses slots JSONB array'
  END as timetable_schema_check;

-- Summary and recommendation
SELECT 
  '📋 SUMMARY AND RECOMMENDATION' as status,
  '' as blank_line;

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns 
      WHERE table_name = 'timetable_settings'
    ) = 5 
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'timetable_settings' 
      AND column_name = 'name'
    )
    THEN '✅ Tables are CORRECT - No fix needed!'
    ELSE '❌ Tables have ERRORS - Run /FIX_ALL_TIMETABLE_ERRORS_NOW.sql'
  END as recommendation;

-- Show what the correct schema should be
SELECT 
  '✅ CORRECT SCHEMA: timetable_settings should have these 5 columns:' as info,
  '' as blank_line;

SELECT 
  column_name,
  'Should exist' as status
FROM (VALUES 
  ('id'),
  ('config'),
  ('updated_by'),
  ('created_at'),
  ('updated_at')
) AS correct_columns(column_name);

SELECT 
  '✅ CORRECT SCHEMA: timetable should have these 7 columns:' as info,
  '' as blank_line;

SELECT 
  column_name,
  'Should exist' as status
FROM (VALUES 
  ('id'),
  ('academic_year'),
  ('term'),
  ('slots'),
  ('created_by'),
  ('created_at'),
  ('updated_at')
) AS correct_columns(column_name);

-- ================================================
-- INSTRUCTIONS
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DIAGNOSTIC COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the query results above to see:';
  RAISE NOTICE '  • Which columns currently exist';
  RAISE NOTICE '  • Which columns are EXTRA (causing errors)';
  RAISE NOTICE '  • Whether "name" column exists (the problem)';
  RAISE NOTICE '  • Recommendation on what to do';
  RAISE NOTICE '';
  RAISE NOTICE 'IF YOU SEE EXTRA COLUMNS OR "name" EXISTS:';
  RAISE NOTICE '  → Run /FIX_ALL_TIMETABLE_ERRORS_NOW.sql';
  RAISE NOTICE '';
  RAISE NOTICE 'IF TABLES ARE CORRECT:';
  RAISE NOTICE '  → Refresh browser and test Settings';
  RAISE NOTICE '';
END $$;
