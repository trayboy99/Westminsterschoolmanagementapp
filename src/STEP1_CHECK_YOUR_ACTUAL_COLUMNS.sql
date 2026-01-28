-- =====================================================
-- STEP 1: CHECK WHAT COLUMNS ACTUALLY EXIST
-- Run this first to see your profiles table structure
-- =====================================================

-- Show all columns in profiles table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Show sample data to see what we're working with
SELECT *
FROM profiles
WHERE role = 'student'
LIMIT 3;

-- Check if status column exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'status'
    ) THEN '✅ status column EXISTS'
    ELSE '❌ status column MISSING - need to add it'
  END as status_check;

-- Check if admission_number exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'admission_number'
    ) THEN '✅ admission_number column EXISTS'
    ELSE '❌ admission_number MISSING - will skip it'
  END as admission_number_check;

-- Check if graduated_students table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'graduated_students'
    ) THEN '✅ graduated_students table EXISTS'
    ELSE '❌ graduated_students table MISSING - run CREATE_GRADUATED_STUDENTS_TRANSCRIPT_SYSTEM.sql first'
  END as table_check;

-- Check students with null class_id (likely graduated)
SELECT 
  COUNT(*) as potential_graduated_students,
  string_agg(DISTINCT first_name || ' ' || last_name, ', ') as names
FROM profiles
WHERE role = 'student'
AND class_id IS NULL;

-- =====================================================
-- COPY THE OUTPUT AND SHARE IT
-- This will help us create the right fix for YOUR database
-- =====================================================
