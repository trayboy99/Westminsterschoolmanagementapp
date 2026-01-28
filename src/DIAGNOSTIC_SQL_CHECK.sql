-- ========================================
-- DIAGNOSTIC SQL TO FIND "required_amount" REFERENCES
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Check if 'required_amount' column exists in payments table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check for any TRIGGERS on the payments table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'payments'
  AND event_object_schema = 'public';

-- 3. Check for RLS POLICIES on the payments table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'payments'
  AND schemaname = 'public';

-- 4. Search for functions that might reference 'required_amount'
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%required_amount%';

-- 5. Check if there's a VIEW that includes payments table
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition ILIKE '%payments%'
  AND view_definition ILIKE '%required_amount%';
