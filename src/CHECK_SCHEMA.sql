-- ========================================
-- CHECK: Verify actual schema of tables
-- ========================================

-- Check payments table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check profiles table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check student_clearance table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_clearance' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check student_fee_items table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_fee_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check classes table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'classes' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what session/term related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%session%' OR table_name LIKE '%term%')
ORDER BY table_name;
