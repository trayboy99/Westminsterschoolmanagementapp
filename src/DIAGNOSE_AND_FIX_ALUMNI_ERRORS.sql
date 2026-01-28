-- ============================================================
-- DIAGNOSE AND FIX BOTH ALUMNI ERRORS
-- ============================================================
-- Run this to check what's causing the errors

-- ============================================================
-- ERROR #1: "Failed to fetch graduation sessions"
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════╗';
    RAISE NOTICE '║  CHECKING GRADUATED STUDENTS TABLE            ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'graduated_students'
        ) 
        THEN '✅ graduated_students table EXISTS'
        ELSE '❌ graduated_students table MISSING'
    END as table_status;

-- Count records
SELECT 
    COUNT(*) as total_alumni,
    COUNT(DISTINCT graduation_session) as unique_sessions,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_alumni
FROM graduated_students;

-- Show graduation sessions
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Available Graduation Sessions:';
END $$;

SELECT DISTINCT 
    graduation_session,
    COUNT(*) as alumni_count
FROM graduated_students
WHERE is_active = true
GROUP BY graduation_session
ORDER BY graduation_session DESC;

-- Check Anthony Agbai specifically
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking for Anthony Agbai:';
END $$;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM graduated_students 
            WHERE first_name = 'Anthony' 
            AND last_name = 'Agbai'
        )
        THEN '✅ Anthony Agbai EXISTS'
        ELSE '❌ Anthony Agbai NOT FOUND'
    END as anthony_status;

-- Show Anthony's data if exists
SELECT 
    id,
    first_name,
    last_name,
    graduation_number,
    graduation_session,
    is_active
FROM graduated_students
WHERE first_name = 'Anthony' 
AND last_name = 'Agbai';

-- ============================================================
-- ERROR #2: "uses_count column not in schema cache"
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════╗';
    RAISE NOTICE '║  CHECKING TRANSCRIPT_PINS TABLE               ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- Check if uses_count column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'transcript_pins' 
            AND column_name = 'uses_count'
        )
        THEN '✅ uses_count column EXISTS'
        ELSE '❌ uses_count column MISSING'
    END as uses_count_status;

-- Check if max_uses column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'transcript_pins' 
            AND column_name = 'max_uses'
        )
        THEN '✅ max_uses column EXISTS'
        ELSE '❌ max_uses column MISSING'
    END as max_uses_status;

-- Show all columns in transcript_pins
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'transcript_pins table columns:';
END $$;

SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
ORDER BY ordinal_position;

-- Check PIN for Anthony Agbai
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking PINs:';
END $$;

SELECT 
    pin_code,
    COALESCE(uses_count, 0) as uses_count,
    COALESCE(max_uses, 3) as max_uses,
    is_used,
    expires_at
FROM transcript_pins
WHERE pin_code = 'C7GV-GEZG-UP99'
LIMIT 1;

-- ============================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================

DO $$
DECLARE
    has_alumni BOOLEAN;
    has_uses_count BOOLEAN;
    has_max_uses BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════╗';
    RAISE NOTICE '║  DIAGNOSTIC SUMMARY                           ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- Check alumni data
    SELECT EXISTS (
        SELECT 1 FROM graduated_students WHERE is_active = true
    ) INTO has_alumni;
    
    -- Check columns
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'transcript_pins' 
        AND column_name = 'uses_count'
    ) INTO has_uses_count;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'transcript_pins' 
        AND column_name = 'max_uses'
    ) INTO has_max_uses;
    
    -- Report findings
    IF NOT has_alumni THEN
        RAISE NOTICE '❌ Problem 1: No active alumni in graduated_students table';
        RAISE NOTICE '   Solution: Run /RUN_THIS_ANTHONY_SETUP_DECEMBER_2024.sql';
    ELSE
        RAISE NOTICE '✅ Problem 1: Alumni data EXISTS - graduation sessions should work';
    END IF;
    
    RAISE NOTICE '';
    
    IF NOT has_uses_count OR NOT has_max_uses THEN
        RAISE NOTICE '❌ Problem 2: Missing usage tracking columns';
        RAISE NOTICE '   Solution: Run /ADD_USES_COUNT_COLUMN_SIMPLE.sql';
    ELSE
        RAISE NOTICE '✅ Problem 2: Columns exist in database';
        RAISE NOTICE '⚠️  BUT: Must reload schema cache!';
        RAISE NOTICE '   Solution: Settings → API → Reload Schema';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Fix any ❌ problems above';
    RAISE NOTICE '  2. Reload schema cache in Supabase Dashboard';
    RAISE NOTICE '  3. Test Alumni Portal at /alumni';
    RAISE NOTICE '';
END $$;
