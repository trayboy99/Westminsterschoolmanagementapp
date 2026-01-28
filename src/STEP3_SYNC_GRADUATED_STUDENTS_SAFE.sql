-- =====================================================
-- STEP 3: SYNC GRADUATED STUDENTS (SAFE VERSION)
-- This works with only the core columns that definitely exist
-- =====================================================

-- Insert graduated students into graduated_students table
-- Only using columns that are guaranteed to exist
INSERT INTO graduated_students (
  student_id,
  first_name,
  last_name,
  middle_name,
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
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.middle_name,
  
  -- Use graduation_session from profile, or default to current
  COALESCE(p.graduation_session, '2024/2025') as graduation_session,
  
  -- Default to SS3 (can be updated later)
  'SS3' as graduation_class,
  
  -- Use updated_at as graduation date
  COALESCE(p.updated_at, p.created_at) as graduation_date,
  
  p.email,
  p.phone,
  p.gender,
  p.date_of_birth,
  
  true as fees_clearance_required,
  false as fees_cleared,
  0 as outstanding_balance,
  true as is_active

FROM profiles p
WHERE p.role = 'student'
AND p.status = 'graduated'
AND NOT EXISTS (
  SELECT 1 
  FROM graduated_students gs 
  WHERE gs.student_id = p.id
)
ON CONFLICT (student_id) DO NOTHING;

-- Show what was synced
SELECT 
  '✅ Successfully synced graduated students' as result,
  COUNT(*) as count,
  string_agg(first_name || ' ' || last_name, ', ') as student_names
FROM graduated_students
WHERE created_at > NOW() - INTERVAL '10 seconds';

-- Verify sync status
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as student_name,
  p.status,
  p.graduation_session,
  p.class_id,
  gs.graduation_class,
  CASE 
    WHEN gs.id IS NOT NULL THEN '✅ SYNCED'
    ELSE '❌ MISSING'
  END as sync_status
FROM profiles p
LEFT JOIN graduated_students gs ON p.id = gs.student_id
WHERE p.status = 'graduated'
ORDER BY p.last_name, p.first_name;

-- Final count
SELECT 
  'Total in profiles (status=graduated)' as metric,
  COUNT(*) as value
FROM profiles 
WHERE status = 'graduated'
UNION ALL
SELECT 
  'Total in graduated_students table' as metric,
  COUNT(*) as value
FROM graduated_students
UNION ALL
SELECT 
  'Successfully synced' as metric,
  COUNT(*) as value
FROM profiles p
WHERE p.status = 'graduated'
AND EXISTS (SELECT 1 FROM graduated_students gs WHERE gs.student_id = p.id);

-- =====================================================
-- SUCCESS! Now refresh your frontend and test
-- =====================================================
