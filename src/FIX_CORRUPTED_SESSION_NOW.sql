-- =========================================
-- FIX CORRUPTED SESSION DATA IN UPLOADS
-- =========================================
-- 
-- PROBLEM: Session column contains auth token object instead of academic session string
-- EXPECTED: "2025/2026" 
-- ACTUAL: {"access_token":"eyJh...", "user":{...}}
--
-- Run this to check first:
SELECT 
    id,
    title,
    CASE 
        WHEN LENGTH(session::text) > 50 THEN 'CORRUPTED (auth token)'
        WHEN session LIKE '%access_token%' THEN 'CORRUPTED (auth object)'
        WHEN session ~ '^\d{4}/\d{4}$' THEN 'VALID'
        ELSE 'INVALID FORMAT'
    END as session_status,
    LEFT(session::text, 100) as session_preview,
    term,
    type,
    class_id,
    created_at
FROM uploads
WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec'
ORDER BY created_at DESC;

-- =========================================
-- FIX: Update corrupted sessions to current academic session
-- =========================================
-- Change '2025/2026' to your current session if different

UPDATE uploads
SET session = '2025/2026'
WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec'
AND (
    session LIKE '%access_token%' 
    OR session LIKE '%eyJh%'
    OR LENGTH(session::text) > 20
    OR NOT (session ~ '^\d{4}/\d{4}$')
);

-- =========================================
-- VERIFY: Check that the fix worked
-- =========================================
SELECT 
    id,
    title,
    session,
    term,
    type,
    class_id
FROM uploads
WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec';

-- Expected result:
-- session should now be '2025/2026' (not an auth object)

-- =========================================
-- BONUS: Fix ALL corrupted sessions in the entire table
-- =========================================
-- Uncomment to fix ALL uploads, not just this class:

-- UPDATE uploads
-- SET session = '2025/2026'
-- WHERE (
--     session LIKE '%access_token%' 
--     OR session LIKE '%eyJh%'
--     OR LENGTH(session::text) > 20
--     OR NOT (session ~ '^\d{4}/\d{4}$')
-- );
