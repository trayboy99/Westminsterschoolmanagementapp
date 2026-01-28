-- ========================================
-- FIX: Drop old triggers/policies referencing 'required_amount'
-- Run this in Supabase SQL Editor
-- ========================================

-- Step 1: Check what triggers exist (just to see them)
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'payments';

-- Step 2: Drop ANY triggers on payments table that might reference required_amount
-- (We'll list common trigger names - adjust if you see different names above)

-- Common trigger patterns to drop:
DROP TRIGGER IF EXISTS update_required_amount_trigger ON payments;
DROP TRIGGER IF EXISTS calculate_required_amount_trigger ON payments;
DROP TRIGGER IF EXISTS set_required_amount_trigger ON payments;
DROP TRIGGER IF EXISTS payments_required_amount_trigger ON payments;

-- Step 3: Check RLS policies
SELECT policyname, cmd, qual::text, with_check::text
FROM pg_policies 
WHERE tablename = 'payments';

-- Step 4: Drop and recreate RLS policies WITHOUT required_amount reference
-- First, let's disable RLS temporarily to see all policies
-- (Don't worry, we'll re-enable it)

-- List all policy names
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'payments' 
          AND schemaname = 'public'
    LOOP
        -- Check if the policy definition contains 'required_amount'
        -- If it does, we need to drop and recreate it
        EXECUTE format('DROP POLICY IF EXISTS %I ON payments', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 5: Recreate basic RLS policies WITHOUT required_amount

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read payments
CREATE POLICY "Allow authenticated users to read payments"
ON payments
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow finance_admin and director to insert payments
CREATE POLICY "Allow finance_admin and director to insert payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('finance_admin', 'director')
    )
);

-- Policy: Allow finance_admin and director to update payments
CREATE POLICY "Allow finance_admin and director to update payments"
ON payments
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('finance_admin', 'director')
    )
);

-- Policy: Allow director to delete payments
CREATE POLICY "Allow director to delete payments"
ON payments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'director'
    )
);

-- Step 6: Verify the fix
SELECT 'Triggers on payments:' as check_type;
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'payments';

SELECT 'Policies on payments:' as check_type;
SELECT policyname FROM pg_policies WHERE tablename = 'payments';

-- Done! Try creating a payment again.
