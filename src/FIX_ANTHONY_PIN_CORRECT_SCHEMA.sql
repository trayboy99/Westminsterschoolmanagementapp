-- ============================================================
-- FIX: Create PIN for Anthony Agbai (CORRECT SCHEMA)
-- ============================================================
-- The transcript_pins table uses:
--   - is_used (not is_active)
--   - No active status - expiry is controlled by expires_at
-- ============================================================

DO $$
DECLARE
  anthony_id UUID;
  director_id UUID;
BEGIN
  -- Find Anthony's ID
  SELECT id INTO anthony_id
  FROM graduated_students
  WHERE first_name ILIKE '%anthony%' AND last_name ILIKE '%agbai%'
  LIMIT 1;

  IF anthony_id IS NULL THEN
    RAISE EXCEPTION 'Anthony Agbai not found in graduated_students table!';
  END IF;

  RAISE NOTICE 'Found Anthony Agbai with ID: %', anthony_id;

  -- Find a director ID
  SELECT id INTO director_id
  FROM profiles
  WHERE role = 'director'
  LIMIT 1;

  IF director_id IS NULL THEN
    -- Use Anthony's student_id if no director found
    SELECT student_id INTO director_id
    FROM graduated_students
    WHERE id = anthony_id;
    RAISE NOTICE 'No director found, using student_id: %', director_id;
  ELSE
    RAISE NOTICE 'Found director with ID: %', director_id;
  END IF;

  -- Delete any existing PINs for Anthony
  DELETE FROM transcript_pins
  WHERE graduated_student_id = anthony_id;

  RAISE NOTICE 'Deleted existing PINs for Anthony Agbai';

  -- Insert fresh PIN with CORRECT schema
  INSERT INTO transcript_pins (
    graduated_student_id,
    pin_code,
    is_used,           -- NOT is_active!
    expires_at,        -- NULL = no expiry
    generated_by,
    price,
    created_at
  ) VALUES (
    anthony_id,
    'C7GV-GEZG-UP99',
    false,             -- is_used = false means it can be used
    NULL,              -- No expiration
    director_id,
    0.00,              -- Free for testing
    NOW()
  );

  RAISE NOTICE '✅ PIN C7GV-GEZG-UP99 created successfully for Anthony Agbai!';
END $$;

-- ============================================================
-- VERIFY THE SETUP
-- ============================================================
SELECT 
  '✅ PIN CREATED SUCCESSFULLY' as status,
  tp.pin_code,
  tp.is_used,
  tp.expires_at,
  gs.first_name || ' ' || gs.middle_name || ' ' || gs.last_name as full_name,
  gs.graduation_class,
  gs.fees_cleared,
  gs.outstanding_balance,
  CASE 
    WHEN tp.is_used = true THEN '❌ PIN Already Used'
    WHEN tp.expires_at IS NOT NULL AND tp.expires_at < NOW() THEN '❌ PIN Expired'
    WHEN gs.fees_clearance_required = true AND gs.fees_cleared = false THEN '❌ Fees Not Cleared'
    ELSE '✅ PIN Ready to Use'
  END as pin_status
FROM transcript_pins tp
JOIN graduated_students gs ON tp.graduated_student_id = gs.id
WHERE gs.first_name ILIKE '%anthony%' AND gs.last_name ILIKE '%agbai%'
ORDER BY tp.created_at DESC
LIMIT 1;

-- ============================================================
-- EXPECTED OUTPUT:
-- status: ✅ PIN CREATED SUCCESSFULLY
-- pin_code: C7GV-GEZG-UP99
-- is_used: false
-- expires_at: NULL
-- full_name: Anthony Elochukwu Agbai
-- pin_status: ✅ PIN Ready to Use
-- ============================================================
