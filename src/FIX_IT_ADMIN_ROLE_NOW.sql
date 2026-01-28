-- ============================================================================
-- FIX IT ADMIN ROLE FOR it.admin@school.edu
-- ============================================================================
-- Issue: IT Admin user cannot view pending registrations because role is not 
-- set to 'it_admin' in the database
-- ============================================================================

-- Step 1: Check current role
SELECT 
  id,
  email,
  first_name,
  last_name,
  role
FROM profiles
WHERE email = 'it.admin@school.edu';

-- Expected output: You should see the user with role something OTHER than 'it_admin'
-- (probably 'admin', 'super_admin', or 'principal')

-- ============================================================================

-- Step 2: Update role to 'it_admin'
UPDATE profiles
SET role = 'it_admin'
WHERE email = 'it.admin@school.edu';

-- ============================================================================

-- Step 3: Verify the update was successful
SELECT 
  id,
  email,
  first_name,
  last_name,
  role
FROM profiles
WHERE email = 'it.admin@school.edu';

-- Expected output: role should now be 'it_admin'

-- ============================================================================
-- WHAT THIS FIXES
-- ============================================================================
-- ✅ Pending Registrations will now show on IT Admin overview
-- ✅ No more "Unauthorized" or "Insufficient permissions" errors
-- ✅ IT Admin can approve/reject user registrations
-- ✅ Backend permission checks will pass (line 1072 in server/index.tsx)
-- ✅ Frontend permission checks will pass (line 44 in DashboardContent.tsx)
-- ============================================================================

-- AFTER RUNNING THIS:
-- 1. Refresh your browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
-- 2. Log out and log back in as it.admin@school.edu
-- 3. Go to Overview page
-- 4. Pending Registrations section should now appear without errors
-- ============================================================================
