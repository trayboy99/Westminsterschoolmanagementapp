-- ============================================
-- CREATE FINANCE ADMIN USER ACCOUNT
-- ============================================
-- Run this AFTER running ADD_FINANCE_ADMIN_ROLE.sql

-- ⚠️ IMPORTANT: Replace these values with actual details
-- Email: Change to the actual finance admin's email
-- Password: Change to a strong password
-- Name: Change to the actual finance admin's name

-- Step 1: Create the user in Supabase Auth
-- This will be done via Supabase Dashboard or backend endpoint

-- Step 2: Insert profile for Finance Admin
-- Replace the values below:
INSERT INTO profiles (
  id,
  email,
  first_name,
  middle_name,
  last_name,
  role,
  phone,
  gender,
  date_of_birth,
  created_at
) VALUES (
  -- ⚠️ REPLACE THIS UUID with the actual user ID from Supabase Auth
  -- Get this from: Supabase Dashboard → Authentication → Users → Copy user ID
  'REPLACE-WITH-ACTUAL-UUID-FROM-SUPABASE-AUTH',
  
  -- Finance Admin email
  'finance@westminster.edu.ng',  -- ⚠️ CHANGE THIS
  
  -- Finance Admin name
  'Finance',      -- First name - ⚠️ CHANGE THIS
  NULL,           -- Middle name (optional)
  'Administrator', -- Last name - ⚠️ CHANGE THIS
  
  -- Role (DO NOT CHANGE)
  'finance_admin',
  
  -- Contact details
  '08012345678',  -- Phone - ⚠️ CHANGE THIS
  'other',        -- Gender
  '1990-01-01',   -- Date of birth - ⚠️ CHANGE THIS
  
  -- Timestamp
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'finance_admin';

-- Step 3: Verify the Finance Admin was created
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  phone,
  created_at
FROM profiles
WHERE role = 'finance_admin';

-- ✅ Finance Admin account created successfully!

-- ==============================================
-- ALTERNATIVE: Create via Supabase Dashboard UI
-- ==============================================
-- If you prefer to create via UI:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter email and password
-- 4. Click "Create user"
-- 5. Copy the user ID
-- 6. Run this SQL to add profile:

/*
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  phone,
  gender
) VALUES (
  'PASTE-USER-ID-HERE',
  'finance@westminster.edu.ng',
  'Finance',
  'Administrator',
  'finance_admin',
  '08012345678',
  'other'
);
*/

-- ==============================================
-- TEST LOGIN
-- ==============================================
-- After creation:
-- 1. Go to login page
-- 2. Login with email and password
-- 3. You should be redirected to Director Dashboard
-- 4. Click "Finance" in sidebar
-- 5. You should see Finance Module tabs
