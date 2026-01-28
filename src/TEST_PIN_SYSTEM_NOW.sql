-- ═══════════════════════════════════════════════════════════════════════
-- TEST PIN MANAGEMENT SYSTEM - Quick Verification
-- ═══════════════════════════════════════════════════════════════════════

-- STEP 1: Verify pins table exists and has correct structure
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 1: CHECK TABLE STRUCTURE ━━━' AS test;

SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'id' THEN '✅ Primary key'
    WHEN column_name = 'student_id' THEN '✅ Foreign key to profiles'
    WHEN column_name = 'pin_code' THEN '✅ The actual PIN'
    WHEN column_name = 'term' THEN '✅ First/Second/Third Term'
    WHEN column_name = 'session' THEN '✅ Academic session (2025/2026)'
    WHEN column_name = 'active' THEN '✅ Is PIN active?'
    WHEN column_name = 'expires_at' THEN '✅ When PIN expires'
    WHEN column_name = 'created_at' THEN '✅ When PIN was created'
    ELSE '⚠️ ' || column_name
  END AS description
FROM information_schema.columns
WHERE table_name = 'pins'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if wrong table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'result_pins')
    THEN '⚠️ OLD TABLE "result_pins" STILL EXISTS - Should rename to "pins"'
    ELSE '✅ Correct - Only "pins" table exists'
  END AS table_check;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 2: Check existing PINs
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 2: EXISTING PINS ━━━' AS test;

SELECT 
  COUNT(*) AS total_pins,
  COUNT(*) FILTER (WHERE active = true AND expires_at > NOW()) AS active_pins,
  COUNT(*) FILTER (WHERE active = false) AS inactive_pins,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired_pins
FROM pins;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Show sample PINs
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 3: SAMPLE PINS ━━━' AS test;

SELECT 
  pin_code,
  term,
  session,
  active,
  CASE 
    WHEN expires_at > NOW() THEN '✅ Valid until ' || TO_CHAR(expires_at, 'YYYY-MM-DD')
    ELSE '❌ Expired on ' || TO_CHAR(expires_at, 'YYYY-MM-DD')
  END AS expiry_status,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created
FROM pins
ORDER BY created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 4: Check for field name issues
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 4: FIELD NAME CHECK ━━━' AS test;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pins' AND column_name = 'pin'
    )
    THEN '❌ WRONG - Has "pin" field instead of "pin_code"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pins' AND column_name = 'pin_code'
    )
    THEN '✅ CORRECT - Has "pin_code" field'
    ELSE '⚠️ ERROR - No PIN field found'
  END AS pin_field_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pins' AND column_name = 'year'
    )
    THEN '❌ WRONG - Has "year" field instead of "session"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pins' AND column_name = 'session'
    )
    THEN '✅ CORRECT - Has "session" field'
    ELSE '⚠️ ERROR - No session/year field found'
  END AS session_field_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pins' AND column_name = 'is_used'
    )
    THEN '❌ WRONG - Has "is_used" field instead of "active"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'pins' AND column_name = 'active'
    )
    THEN '✅ CORRECT - Has "active" field'
    ELSE '⚠️ ERROR - No active/is_used field found'
  END AS active_field_check;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 5: Check PIN format
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 5: PIN FORMAT CHECK ━━━' AS test;

SELECT 
  pin_code,
  LENGTH(pin_code) AS length,
  CASE 
    WHEN LENGTH(pin_code) = 8 THEN '✅ Correct length (8 chars)'
    ELSE '❌ Wrong length - should be 8 characters'
  END AS length_check,
  CASE 
    WHEN pin_code ~ '^[A-Z0-9]+$' THEN '✅ Valid format (alphanumeric)'
    ELSE '❌ Invalid characters found'
  END AS format_check
FROM pins
ORDER BY created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 6: Check session format
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 6: SESSION FORMAT CHECK ━━━' AS test;

SELECT 
  DISTINCT session,
  CASE 
    WHEN session ~ '^\d{4}/\d{4}$' THEN '✅ Correct format (YYYY/YYYY)'
    WHEN LENGTH(session) > 20 THEN '❌ CORRUPTED - Contains access token!'
    ELSE '⚠️ Unusual format: ' || session
  END AS session_check
FROM pins
ORDER BY session DESC;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 7: Test current term/session logic
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 7: CURRENT TERM/SESSION ━━━' AS test;

SELECT 
  CASE 
    WHEN EXTRACT(MONTH FROM NOW()) <= 4 THEN 'First Term'
    WHEN EXTRACT(MONTH FROM NOW()) <= 8 THEN 'Second Term'
    ELSE 'Third Term'
  END AS current_term,
  
  CASE 
    WHEN EXTRACT(MONTH FROM NOW()) >= 9 
    THEN EXTRACT(YEAR FROM NOW())::text || '/' || (EXTRACT(YEAR FROM NOW()) + 1)::text
    ELSE (EXTRACT(YEAR FROM NOW()) - 1)::text || '/' || EXTRACT(YEAR FROM NOW())::text
  END AS current_session,
  
  'Today is ' || TO_CHAR(NOW(), 'Month DD, YYYY') AS info;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 8: Check expiry dates
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 8: EXPIRY CHECK ━━━' AS test;

SELECT 
  pin_code,
  active,
  TO_CHAR(expires_at, 'YYYY-MM-DD HH24:MI') AS expires,
  CASE 
    WHEN expires_at > NOW() THEN 
      '✅ Valid for ' || EXTRACT(DAY FROM (expires_at - NOW()))::text || ' more days'
    ELSE 
      '❌ Expired ' || EXTRACT(DAY FROM (NOW() - expires_at))::text || ' days ago'
  END AS status,
  CASE 
    WHEN active = true AND expires_at > NOW() THEN '✅ USABLE'
    WHEN active = false THEN '❌ INACTIVE (already used)'
    WHEN expires_at <= NOW() THEN '❌ EXPIRED'
    ELSE '⚠️ UNKNOWN STATUS'
  END AS final_status
FROM pins
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 9: Check student links
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 9: STUDENT ASSOCIATIONS ━━━' AS test;

SELECT 
  p.first_name || ' ' || p.last_name AS student_name,
  p.class_id,
  COUNT(pins.id) AS total_pins,
  COUNT(*) FILTER (WHERE pins.active = true AND pins.expires_at > NOW()) AS active_pins
FROM profiles p
LEFT JOIN pins ON pins.student_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.first_name, p.last_name, p.class_id
ORDER BY total_pins DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 10: Final verdict
-- ═══════════════════════════════════════════════════════════════════════
SELECT '━━━ STEP 10: FINAL VERDICT ━━━' AS test;

WITH checks AS (
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pins') AS has_pins_table,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'pin_code') AS has_pin_code,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'session') AS has_session,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'active') AS has_active,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pins' AND column_name = 'expires_at') AS has_expires,
    (SELECT COUNT(*) FROM pins WHERE LENGTH(session) > 20) AS corrupted_sessions
)
SELECT 
  CASE 
    WHEN has_pins_table THEN '✅ Table "pins" exists'
    ELSE '❌ Table "pins" NOT found'
  END AS table_status,
  
  CASE 
    WHEN has_pin_code AND has_session AND has_active AND has_expires 
    THEN '✅ All required fields present'
    ELSE '❌ Missing fields - check column names'
  END AS fields_status,
  
  CASE 
    WHEN corrupted_sessions = 0 THEN '✅ No corrupted sessions'
    ELSE '⚠️ Found ' || corrupted_sessions || ' corrupted session values'
  END AS data_quality,
  
  CASE 
    WHEN has_pins_table AND has_pin_code AND has_session AND has_active AND has_expires AND corrupted_sessions = 0
    THEN '🎉 PIN SYSTEM READY - All checks passed!'
    ELSE '🔧 NEEDS FIXES - See checks above'
  END AS final_verdict
FROM checks;

-- ═══════════════════════════════════════════════════════════════════════
-- QUICK FIXES (uncomment if needed)
-- ═══════════════════════════════════════════════════════════════════════

-- If table is named "result_pins", rename it:
-- ALTER TABLE result_pins RENAME TO pins;

-- If columns have wrong names, rename them:
-- ALTER TABLE pins RENAME COLUMN pin TO pin_code;
-- ALTER TABLE pins RENAME COLUMN year TO session;
-- ALTER TABLE pins RENAME COLUMN is_used TO active;
-- ALTER TABLE pins RENAME COLUMN used_at TO expires_at;

-- If sessions are corrupted (too long), clean them:
-- UPDATE pins SET session = '2025/2026' WHERE LENGTH(session) > 20;
