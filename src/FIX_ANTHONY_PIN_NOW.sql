-- ============================================================
-- QUICK FIX: Create PIN for Anthony Agbai
-- ============================================================
-- This script will:
-- 1. Find Anthony Agbai's graduated_student_id
-- 2. Delete any existing PINs
-- 3. Create the PIN C7GV-GEZG-UP99
-- 4. Verify the setup
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

  -- Find a director ID
  SELECT id INTO director_id
  FROM profiles
  WHERE role = 'director'
  LIMIT 1;

  IF director_id IS NULL THEN
    -- Use system if no director found
    director_id := anthony_id;
  END IF;

  -- Delete any existing PINs for Anthony
  DELETE FROM transcript_pins
  WHERE graduated_student_id = anthony_id;

  RAISE NOTICE 'Deleted existing PINs for Anthony Agbai';

  -- Insert fresh PIN
  INSERT INTO transcript_pins (
    graduated_student_id,
    pin_code,
    is_active,
    expires_at,
    generated_by,
    created_at
  ) VALUES (
    anthony_id,
    'C7GV-GEZG-UP99',
    true,
    NULL, -- No expiration
    director_id,
    NOW()
  );

  RAISE NOTICE 'PIN C7GV-GEZG-UP99 created successfully for Anthony Agbai!';
END $$;

-- Verify the PIN was created correctly
SELECT 
  '✅ PIN Setup Complete' as status,
  tp.pin_code,
  tp.is_active,
  tp.expires_at,
  gs.first_name || ' ' || gs.middle_name || ' ' || gs.last_name as full_name,
  gs.graduation_class,
  gs.fees_cleared,
  gs.outstanding_balance
FROM transcript_pins tp
JOIN graduated_students gs ON tp.graduated_student_id = gs.id
WHERE gs.first_name ILIKE '%anthony%' AND gs.last_name ILIKE '%agbai%';

-- ============================================================
-- EXPECTED OUTPUT:
-- status: ✅ PIN Setup Complete
-- pin_code: C7GV-GEZG-UP99
-- is_active: true
-- expires_at: NULL
-- full_name: Anthony Elochukwu Agbai
-- fees_cleared: true
-- ============================================================
