-- ============================================================
-- CHECK ANTHONY AGBAI'S PIN AND GRADUATED STUDENT RECORD
-- ============================================================

-- Step 1: Check graduated_students table for Anthony Agbai
SELECT 
  id,
  student_id,
  first_name,
  middle_name,
  last_name,
  admission_number,
  graduation_session,
  graduation_class,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  is_active
FROM graduated_students
WHERE first_name ILIKE '%anthony%' 
  AND last_name ILIKE '%agbai%';

-- Step 2: Check transcript_pins table for any PINs for Anthony Agbai
-- (Using the graduated_student_id from step 1)
SELECT 
  tp.id,
  tp.graduated_student_id,
  tp.pin_code,
  tp.is_active,
  tp.expires_at,
  tp.created_at,
  gs.first_name,
  gs.last_name
FROM transcript_pins tp
JOIN graduated_students gs ON tp.graduated_student_id = gs.id
WHERE gs.first_name ILIKE '%anthony%' 
  AND gs.last_name ILIKE '%agbai%';

-- Step 3: Check specifically for the PIN "C7GV-GEZG-UP99"
SELECT 
  tp.id,
  tp.graduated_student_id,
  tp.pin_code,
  tp.is_active,
  tp.expires_at,
  tp.created_at,
  gs.first_name,
  gs.last_name,
  gs.admission_number
FROM transcript_pins tp
JOIN graduated_students gs ON tp.graduated_student_id = gs.id
WHERE tp.pin_code = 'C7GV-GEZG-UP99';

-- Step 4: Check if PIN format matches (case sensitive check)
SELECT pin_code, is_active
FROM transcript_pins
WHERE pin_code LIKE 'C7GV%';

-- ============================================================
-- WHAT TO LOOK FOR:
-- ============================================================
-- 1. graduated_student_id from Step 1
-- 2. Does Step 2 show any PINs for Anthony? 
-- 3. Does Step 3 find the specific PIN?
-- 4. Is the PIN active (is_active = true)?
-- 5. Has the PIN expired (expires_at < NOW())?
-- ============================================================

-- If PIN doesn't exist, you need to generate it from Director Dashboard
-- If PIN exists but is_active = false, it needs to be reactivated
-- If PIN is expired, generate a new one
