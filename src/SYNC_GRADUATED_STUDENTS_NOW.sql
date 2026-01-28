-- =====================================================
-- SYNC GRADUATED STUDENTS TO graduated_students TABLE
-- Run this if students have status='graduated' but aren't 
-- appearing in the TranscriptPinManagement dropdown
-- =====================================================

-- This will create graduated_students records for any students
-- who have been marked as graduated but don't have a record yet

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
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.middle_name,
  p.admission_number,
  COALESCE(p.graduation_session, '2024/2025') as graduation_session,
  
  -- Try to find the graduation class from recent promotions
  COALESCE(
    (SELECT c.name 
     FROM promotions pr
     JOIN classes c ON c.id = pr.from_class_id
     WHERE pr.is_graduation = true
     AND pr.created_at::date = p.updated_at::date
     LIMIT 1
    ),
    'SS3'  -- Default if not found
  ) as graduation_class,
  
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
WHERE p.status = 'graduated'
AND p.role = 'student'
AND NOT EXISTS (
  SELECT 1 
  FROM graduated_students gs 
  WHERE gs.student_id = p.id
)
ON CONFLICT (student_id) DO NOTHING;

-- Show what was created
SELECT 
  'Synced graduated students' as result,
  COUNT(*) as count,
  string_agg(first_name || ' ' || last_name, ', ') as names
FROM graduated_students
WHERE student_id IN (
  SELECT id FROM profiles WHERE status = 'graduated'
);

-- Verify the sync
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as student_name,
  p.status,
  p.graduation_session,
  gs.id as graduated_students_id,
  gs.graduation_class,
  gs.fees_cleared,
  CASE 
    WHEN gs.id IS NOT NULL THEN '✅ SYNCED'
    ELSE '❌ MISSING'
  END as sync_status
FROM profiles p
LEFT JOIN graduated_students gs ON p.id = gs.student_id
WHERE p.status = 'graduated'
ORDER BY p.created_at DESC;
