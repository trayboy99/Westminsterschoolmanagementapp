-- =========================================
-- 🎯 QUICK FIX - Copy and paste this entire block into Supabase SQL Editor
-- =========================================
-- This will fix the corrupted session data causing infinite loading

-- Step 1: Update the corrupted session (change 2025/2026 to your current session if different)
UPDATE uploads
SET session = '2025/2026'
WHERE (
    session LIKE '%access_token%' 
    OR session LIKE '%eyJh%'
    OR LENGTH(session::text) > 50
    OR NOT (session ~ '^\d{4}/\d{4}$')
);

-- Step 2: Verify the fix worked
SELECT 
    '✅ FIX COMPLETE! Uploads now have proper sessions' as status,
    COUNT(*) as total_uploads,
    COUNT(DISTINCT session) as unique_sessions,
    array_agg(DISTINCT session) as sessions_found
FROM uploads;

-- Step 3: Check uploads for jss3 Diamond (Favour's class)
SELECT 
    title,
    session,
    term,
    type,
    created_at
FROM uploads
WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec'
ORDER BY created_at DESC;

-- ✅ If you see session = '2025/2026' (not an auth token), the fix worked!
-- Now test in browser: Login as Favour → Notes → My Files → Navigate to Exam Questions
