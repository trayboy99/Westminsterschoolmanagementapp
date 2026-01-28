-- ============================================================
-- FIX BOTH ALUMNI PORTAL ERRORS - ONE FILE
-- ============================================================
-- This checks and fixes both issues in one go
-- Run this AFTER reloading schema cache in Supabase Dashboard

DO $$
DECLARE
    has_alumni BOOLEAN;
    has_uses_count BOOLEAN;
    has_max_uses BOOLEAN;
    anthony_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ALUMNI PORTAL ERROR DIAGNOSTIC & FIX         ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- ========================================
    -- CHECK #1: Alumni Data
    -- ========================================
    RAISE NOTICE '1. Checking graduated_students table...';
    
    SELECT EXISTS (
        SELECT 1 FROM graduated_students WHERE is_active = true
    ) INTO has_alumni;
    
    IF NOT has_alumni THEN
        RAISE NOTICE '   ❌ No active alumni found';
        RAISE NOTICE '   Creating Anthony Agbai...';
        
        -- Create Anthony Agbai
        INSERT INTO graduated_students (
            student_id,
            admission_number,
            graduation_number,
            first_name,
            last_name,
            other_names,
            gender,
            date_of_birth,
            graduated_class,
            graduation_session,
            graduation_date,
            fees_cleared,
            fees_clearance_required,
            outstanding_balance,
            is_active
        ) VALUES (
            gen_random_uuid(),
            'ADM2024001',
            'GRAD2025001',
            'Anthony',
            'Agbai',
            'Chidera',
            'male',
            '2008-03-15',
            'SS3',
            '2024/2025',
            '2025-06-15',
            true,
            false,
            0.00,
            true
        )
        RETURNING id INTO anthony_id;
        
        RAISE NOTICE '   ✅ Created Anthony Agbai (ID: %)', anthony_id;
        
        -- Create transcript PIN for Anthony
        IF anthony_id IS NOT NULL THEN
            INSERT INTO transcript_pins (
                graduated_student_id,
                pin_code,
                generated_by,
                expires_at,
                is_used,
                uses_count,
                max_uses
            ) VALUES (
                anthony_id,
                'C7GV-GEZG-UP99',
                'admin',
                NOW() + INTERVAL '1 year',
                false,
                0,
                3
            );
            
            RAISE NOTICE '   ✅ Created PIN: C7GV-GEZG-UP99';
        END IF;
    ELSE
        RAISE NOTICE '   ✅ Alumni data exists';
        
        -- Check if Anthony specifically exists
        SELECT id INTO anthony_id FROM graduated_students 
        WHERE first_name = 'Anthony' AND last_name = 'Agbai'
        LIMIT 1;
        
        IF anthony_id IS NULL THEN
            RAISE NOTICE '   ℹ️  Anthony Agbai not found, but other alumni exist';
        ELSE
            RAISE NOTICE '   ✅ Anthony Agbai exists (ID: %)', anthony_id;
        END IF;
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- CHECK #2: uses_count Column
    -- ========================================
    RAISE NOTICE '2. Checking transcript_pins columns...';
    
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
    
    IF NOT has_uses_count THEN
        RAISE NOTICE '   ❌ uses_count column missing';
        RAISE NOTICE '   Adding uses_count column...';
        
        ALTER TABLE transcript_pins 
        ADD COLUMN uses_count INTEGER NOT NULL DEFAULT 0;
        
        RAISE NOTICE '   ✅ Added uses_count column';
    ELSE
        RAISE NOTICE '   ✅ uses_count column exists';
    END IF;
    
    IF NOT has_max_uses THEN
        RAISE NOTICE '   ❌ max_uses column missing';
        RAISE NOTICE '   Adding max_uses column...';
        
        ALTER TABLE transcript_pins 
        ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 3;
        
        RAISE NOTICE '   ✅ Added max_uses column';
    ELSE
        RAISE NOTICE '   ✅ max_uses column exists';
    END IF;
    
    RAISE NOTICE '';
    
    -- ========================================
    -- SUMMARY
    -- ========================================
    RAISE NOTICE '╔════════════════════════════════════════════════╗';
    RAISE NOTICE '║  DIAGNOSTIC COMPLETE                          ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    IF has_alumni AND has_uses_count AND has_max_uses THEN
        RAISE NOTICE '✅ All checks passed!';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  IMPORTANT: You still need to reload schema cache!';
        RAISE NOTICE '';
        RAISE NOTICE '   1. Go to Supabase Dashboard';
        RAISE NOTICE '   2. Settings → API';
        RAISE NOTICE '   3. Click "Reload Schema"';
        RAISE NOTICE '   4. Wait 30 seconds';
        RAISE NOTICE '';
        RAISE NOTICE 'After schema reload, test at /alumni';
    ELSE
        RAISE NOTICE 'Some issues were fixed automatically.';
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  CRITICAL NEXT STEP:';
        RAISE NOTICE '   RELOAD SCHEMA CACHE NOW!';
        RAISE NOTICE '';
        RAISE NOTICE '   Supabase Dashboard → Settings → API → Reload Schema';
        RAISE NOTICE '';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Test credentials:';
    RAISE NOTICE '  Graduation Number: GRAD2025001';
    RAISE NOTICE '  First Name: Anthony';
    RAISE NOTICE '  Last Name: Agbai';
    RAISE NOTICE '  Date of Birth: 2008-03-15';
    RAISE NOTICE '  PIN: C7GV-GEZG-UP99';
    RAISE NOTICE '';
END $$;

-- Show graduation sessions
SELECT DISTINCT graduation_session
FROM graduated_students
WHERE is_active = true
ORDER BY graduation_session DESC;

-- Show Anthony's data
SELECT 
    graduation_number,
    first_name,
    last_name,
    graduation_session,
    is_active
FROM graduated_students
WHERE first_name = 'Anthony' AND last_name = 'Agbai';

-- Show Anthony's PIN
SELECT 
    pin_code,
    uses_count,
    max_uses,
    is_used,
    expires_at
FROM transcript_pins
WHERE pin_code = 'C7GV-GEZG-UP99';

-- Verify columns exist
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
AND column_name IN ('uses_count', 'max_uses')
ORDER BY column_name;
