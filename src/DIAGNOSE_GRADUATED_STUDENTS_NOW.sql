-- =====================================================
-- DIAGNOSE GRADUATED STUDENTS SYSTEM
-- Copy and paste this into Supabase SQL Editor
-- =====================================================

-- 1. Check if graduated_students table exists
SELECT 
  'graduated_students table exists' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'graduated_students'
  ) THEN '✅ YES' ELSE '❌ NO - RUN MIGRATION!' END as result;

-- 2. Check if any graduated students exist in profiles
SELECT 
  'Students with status=graduated' as check_name,
  COUNT(*) as count,
  string_agg(DISTINCT first_name || ' ' || last_name, ', ') as names
FROM profiles 
WHERE status = 'graduated';

-- 3. Check if any records exist in graduated_students
SELECT 
  'Records in graduated_students table' as check_name,
  COUNT(*) as count
FROM graduated_students;

-- 4. Check recent promotions with is_graduation flag
SELECT 
  'Recent graduation promotions' as check_name,
  COUNT(*) as count,
  MAX(created_at) as most_recent
FROM promotions
WHERE is_graduation = true;

-- 5. Show all graduated students from profiles
SELECT 
  id,
  first_name,
  last_name,
  admission_number,
  class_id,
  status,
  graduation_session,
  created_at
FROM profiles
WHERE status = 'graduated'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Show all records in graduated_students
SELECT 
  id,
  student_id,
  first_name,
  last_name,
  graduation_class,
  graduation_session,
  fees_cleared,
  created_at
FROM graduated_students
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check for students who are graduated but NOT in graduated_students
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.admission_number,
  p.status,
  p.graduation_session,
  CASE 
    WHEN gs.id IS NULL THEN '❌ MISSING from graduated_students'
    ELSE '✅ EXISTS in graduated_students'
  END as sync_status
FROM profiles p
LEFT JOIN graduated_students gs ON p.id = gs.student_id
WHERE p.status = 'graduated';

-- 8. Check RLS policies on graduated_students
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'graduated_students';

-- =====================================================
-- INTERPRETATION:
-- =====================================================
-- 
-- ✅ If check 1 shows NO: Run CREATE_GRADUATED_STUDENTS_TRANSCRIPT_SYSTEM.sql
-- ✅ If check 2 shows 0: No students have been graduated yet
-- ✅ If check 7 shows MISSING: Students are graduated but not synced
-- 
-- TO FIX SYNC ISSUE:
-- Run the INSERT statement below to manually sync existing graduated students
-- =====================================================

-- MANUAL SYNC SCRIPT (run if students are graduated but not in graduated_students):
/*
INSERT INTO graduated_students (
  student_id,
  first_name,
  last_name,
  middle_name,
  admission_number,
  graduation_session,
  graduation_class,
  graduation_date,
  email,
  phone,
  gender,
  date_of_birth,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  is_active
)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.middle_name,
  p.admission_number,
  p.graduation_session,
  COALESCE(c.name, 'SS3'),
  COALESCE(p.updated_at, p.created_at),
  p.email,
  p.phone,
  p.gender,
  p.date_of_birth,
  true,
  false,
  0,
  true
FROM profiles p
LEFT JOIN classes c ON c.id = (
  SELECT from_class_id 
  FROM promotions 
  WHERE is_graduation = true 
  AND created_at::date = p.updated_at::date
  LIMIT 1
)
WHERE p.status = 'graduated'
AND NOT EXISTS (
  SELECT 1 FROM graduated_students gs WHERE gs.student_id = p.id
)
ON CONFLICT (student_id) DO NOTHING;
*/
