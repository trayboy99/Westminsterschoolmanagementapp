-- Reset Anthony Agbai's PIN usage count so it can be used again
-- This will reset the usage counter and mark it as not fully used

-- Check current PIN status
SELECT 
  tp.pin_code,
  tp.is_used,
  tp.uses_count,
  tp.max_uses,
  tp.is_active,
  tp.expires_at,
  gs.first_name,
  gs.last_name
FROM transcript_pins tp
JOIN graduated_students gs ON tp.graduated_student_id = gs.id
WHERE gs.first_name ILIKE 'Anthony'
  AND gs.last_name ILIKE 'Agbai';

-- Reset the PIN usage
UPDATE transcript_pins
SET 
  uses_count = 0,
  is_used = false
WHERE pin_code = 'C7GV-GEZG-UP99';

-- Verify the reset
SELECT 
  tp.pin_code,
  tp.is_used,
  tp.uses_count,
  tp.max_uses,
  tp.is_active,
  tp.expires_at,
  gs.first_name,
  gs.last_name
FROM transcript_pins tp
JOIN graduated_students gs ON tp.graduated_student_id = gs.id
WHERE tp.pin_code = 'C7GV-GEZG-UP99';

-- Show message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PIN Reset Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'PIN Code: C7GV-GEZG-UP99';
  RAISE NOTICE 'Uses Count: 0 (Reset)';
  RAISE NOTICE 'Max Uses: 3';
  RAISE NOTICE 'Is Used: false';
  RAISE NOTICE 'Status: Ready for testing';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now test the PIN 3 times before it expires.';
  RAISE NOTICE '';
END $$;
