-- ============================================================
-- GIVE ANTHONY AGBAI TRANSCRIPT ACCESS - BYPASS FEE CLEARANCE
-- ============================================================
-- This script marks Anthony Agbai's fees as cleared so you can
-- test the transcript system without fee clearance blocking it.
-- ============================================================

-- Step 1: Check current fee clearance status for Anthony Agbai
SELECT 
  id,
  first_name,
  last_name,
  admission_number,
  graduation_session,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  fees_notes
FROM graduated_students
WHERE first_name ILIKE '%anthony%' 
  AND last_name ILIKE '%agbai%';

-- Step 2: Mark Anthony Agbai's fees as cleared
UPDATE graduated_students
SET 
  fees_cleared = true,
  outstanding_balance = 0,
  fees_notes = 'Fee clearance bypassed for testing purposes',
  fees_cleared_at = NOW(),
  updated_at = NOW()
WHERE first_name ILIKE '%anthony%' 
  AND last_name ILIKE '%agbai%';

-- Step 3: Verify the update
SELECT 
  id,
  first_name,
  last_name,
  admission_number,
  graduation_session,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  fees_notes,
  fees_cleared_at
FROM graduated_students
WHERE first_name ILIKE '%anthony%' 
  AND last_name ILIKE '%agbai%';

-- ============================================================
-- EXPECTED RESULT:
-- fees_cleared should now be TRUE
-- outstanding_balance should be 0
-- You should now be able to access the transcript with a PIN
-- ============================================================
