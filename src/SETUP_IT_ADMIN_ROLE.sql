-- ============================================================================
-- SETUP IT ADMIN ROLE - Quick Script
-- ============================================================================
-- This script will help you set up an IT Admin account for the Users Management system
-- Run these queries in your Supabase SQL Editor
-- ============================================================================

-- STEP 1: Check if you have any IT Admins already
-- ============================================================================
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role,
  created_at
FROM profiles 
WHERE role = 'it_admin'
ORDER BY created_at DESC;

-- Expected result: If empty, you need to create one


-- STEP 2: Check all available admin users (principals, etc.)
-- ============================================================================
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role,
  created_at
FROM profiles 
WHERE role IN ('principal', 'director', 'it_admin')
ORDER BY created_at DESC;

-- This shows all admin-level accounts


-- STEP 3: Promote a user to IT Admin
-- ============================================================================
-- IMPORTANT: Replace 'your-email@example.com' with the actual email address

UPDATE profiles 
SET role = 'it_admin' 
WHERE email = 'your-email@example.com';

-- Alternative: Promote by user ID
-- UPDATE profiles 
-- SET role = 'it_admin' 
-- WHERE id = 'user-uuid-here';


-- STEP 4: Verify the change
-- ============================================================================
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role
FROM profiles 
WHERE email = 'your-email@example.com';

-- Expected result: role should be 'it_admin'


-- STEP 5: Check all roles in the system
-- ============================================================================
SELECT 
  role, 
  COUNT(*) as count 
FROM profiles 
GROUP BY role 
ORDER BY role;

-- This shows the distribution of roles in your system


-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If you don't know which email to use, list all users:
SELECT 
  id, 
  email, 
  first_name, 
  last_name, 
  role
FROM profiles 
ORDER BY created_at DESC
LIMIT 20;


-- If you want to create a brand new IT Admin account:
-- (You'll need to register via the registration form first, then run this)
UPDATE profiles 
SET role = 'it_admin' 
WHERE email = 'NEW_EMAIL_HERE'
  AND role = 'pending';  -- Only update if they just registered


-- If someone was previously 'director', update them:
UPDATE profiles 
SET role = 'it_admin' 
WHERE role = 'director';


-- ============================================================================
-- AFTER RUNNING THIS SCRIPT
-- ============================================================================
-- 1. Note the email address you promoted to it_admin
-- 2. Log out of the application completely
-- 3. Log back in using that email address
-- 4. You should now see:
--    - Dashboard title: "IT Admin Dashboard"
--    - Sidebar menu: "Users Management" option
-- 5. Click "Users Management" to access the user management interface
-- ============================================================================


-- ============================================================================
-- VALIDATION QUERY - Run this after logging in
-- ============================================================================
-- This confirms that the IT Admin role has the correct permissions
SELECT 
  p.email,
  p.role,
  CASE 
    WHEN p.role = 'it_admin' THEN '✅ Has full access to Users Management'
    WHEN p.role = 'principal' THEN '⚠️ Limited access - cannot manage users'
    WHEN p.role = 'teacher' THEN '❌ No admin access'
    WHEN p.role = 'student' THEN '❌ No admin access'
    ELSE '❓ Unknown role'
  END as access_level
FROM profiles p
WHERE p.id = auth.uid();  -- Gets the currently logged-in user


-- ============================================================================
-- ROLE REFERENCE
-- ============================================================================
-- Available roles in the system:
-- - 'student'        : Student account (no admin access)
-- - 'teacher'        : Teacher account (can enter marks, upload files)
-- - 'principal'      : Principal account (full admin except user management)
-- - 'it_admin'       : IT Admin account (FULL access including user management)
-- - 'finance_admin'  : Finance Admin account (handles finances)
-- - 'pending'        : Newly registered, awaiting approval
-- ============================================================================
