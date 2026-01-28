-- ============================================
-- VERIFY FINANCE ADMIN SETUP
-- ============================================
-- Run this to check if everything is configured correctly

-- ✅ CHECK 1: Verify role constraint includes finance_admin
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname = 'profiles_role_check';

-- Expected: Should include 'finance_admin' in the list
-- ✅ PASS if you see: ...IN ('student', 'teacher', 'principal', 'director', 'it_admin', 'finance_admin')

-- ✅ CHECK 2: Count Finance Admin users
SELECT COUNT(*) as finance_admin_count
FROM profiles
WHERE role = 'finance_admin';

-- Expected: Should return 1 or more
-- ✅ PASS if count > 0

-- ✅ CHECK 3: List all Finance Admin users
SELECT 
  id,
  email,
  first_name,
  middle_name,
  last_name,
  role,
  phone,
  gender,
  created_at
FROM profiles
WHERE role = 'finance_admin'
ORDER BY created_at DESC;

-- Expected: Should show all finance admin users with complete details
-- ✅ PASS if at least 1 row returned

-- ✅ CHECK 4: Verify user exists in Supabase Auth
-- You need to manually check this in Supabase Dashboard
-- Go to: Authentication → Users
-- Search for: finance@westminster.edu.ng (or your finance admin email)
-- ✅ PASS if user exists and is confirmed

-- ✅ CHECK 5: Check all roles in the system
SELECT 
  role,
  COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;

-- Expected output should include:
-- finance_admin | 1 (or more)
-- director      | 1 (or more)
-- it_admin      | 1 (or more)
-- teacher       | X
-- student       | Y

-- ============================================
-- FINAL STATUS CHECK
-- ============================================

-- Run this comprehensive check
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'profiles'::regclass 
      AND conname = 'profiles_role_check'
      AND pg_get_constraintdef(oid) LIKE '%finance_admin%'
    ) THEN '✅ Role constraint includes finance_admin'
    ELSE '❌ Role constraint missing finance_admin'
  END as role_constraint_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles WHERE role = 'finance_admin')
    THEN '✅ Finance Admin user(s) exist: ' || (SELECT COUNT(*)::text FROM profiles WHERE role = 'finance_admin')
    ELSE '❌ No Finance Admin users found'
  END as users_check;

-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- If Finance Admin can't login, check auth.users table
-- (This requires service_role key - run in Supabase SQL Editor)
/*
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email LIKE '%finance%';
*/

-- If Finance Admin logs in but has wrong permissions, check profile-auth sync
/*
SELECT 
  au.id,
  au.email as auth_email,
  p.email as profile_email,
  p.role,
  p.first_name,
  p.last_name
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email LIKE '%finance%';
*/

-- ============================================
-- RESET FINANCE ADMIN PASSWORD (if needed)
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- Replace email and new password

/*
UPDATE auth.users
SET 
  encrypted_password = crypt('NEW_PASSWORD_HERE', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'finance@westminster.edu.ng';
*/

-- ============================================
-- DELETE FINANCE ADMIN (if you need to start over)
-- ============================================
-- ⚠️ WARNING: This will permanently delete the user

/*
-- First delete from profiles
DELETE FROM profiles 
WHERE email = 'finance@westminster.edu.ng' 
AND role = 'finance_admin';

-- Then delete from auth.users (requires service_role)
DELETE FROM auth.users 
WHERE email = 'finance@westminster.edu.ng';
*/

-- ============================================
-- SUMMARY
-- ============================================
-- All checks should return ✅
-- If any check returns ❌, refer to FINANCE_ADMIN_QUICK_SETUP.md
