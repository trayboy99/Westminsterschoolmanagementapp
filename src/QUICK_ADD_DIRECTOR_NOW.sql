-- ================================================================
-- QUICK ADD DIRECTOR ROLE - Copy & Paste This Entire File
-- ================================================================
-- This adds 'director' role to the profiles table constraint
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Add director to profiles table role constraint
-- ================================================================

-- Drop existing constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Recreate with director included
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'principal',
  'super_admin',
  'director',
  'secretary',
  'transport_manager',
  'it_admin',
  'finance_admin',
  'teacher',
  'student',
  'parent'
));

-- ================================================================
-- Step 2: Verify it worked
-- ================================================================

-- Check the constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_role_check';

-- You should see 'director' in the list of allowed roles

-- ================================================================
-- Step 3: Create a director user (CHOOSE ONE OPTION)
-- ================================================================

-- OPTION A: Update existing user to director (FASTEST)
-- Replace 'your-email@school.com' with actual email
-- ================================================================
/*
UPDATE profiles 
SET role = 'director' 
WHERE email = 'your-email@school.com';
*/

-- OPTION B: Create new director user
-- Requires auth user to exist first in auth.users
-- Replace values in SINGLE QUOTES with your data
-- ================================================================
/*
INSERT INTO profiles (id, first_name, middle_name, last_name, role, email)
VALUES 
  (
    'your-auth-user-id-here',  -- From auth.users table
    'John',                     -- First name
    NULL,                       -- Middle name (or NULL)
    'Director',                 -- Last name
    'director',                 -- Role (don't change this)
    'director@school.com'       -- Email
  );
*/

-- ================================================================
-- Step 4: Verify director user exists
-- ================================================================

-- Check all director users
SELECT id, first_name, last_name, email, role 
FROM profiles 
WHERE role = 'director';

-- You should see your director user(s) here

-- ================================================================
-- DONE! 
-- Now log in with the director user credentials
-- You should see the Director Dashboard with 11 menu items
-- ================================================================
